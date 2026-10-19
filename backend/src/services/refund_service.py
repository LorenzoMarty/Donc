"""Reembolso total (dentro do prazo de arrependimento) e conciliação Mercado Pago × banco."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.middlewares.errors import AppError
from src.models import SubscriptionStatus, User
from src.models.subscription import Subscription, SubscriptionRefund
from src.repositories.subscriptions import SubscriptionRepository
from src.services.mercadopago_client import MercadoPagoClient
from src.services.subscription_status import effective_status

logger = logging.getLogger("src.services.refund_service")

_ACCESS_STATUSES = (SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE)


@dataclass
class ReconciliationIssue:
    kind: str  # active_without_payment | remote_without_local | status_mismatch | lookup_failed
    detail: str
    user_id: int | None = None
    email: str | None = None
    mp_preapproval_id: str | None = None


def _approved_payments(charges: list[dict]) -> list[dict]:
    return [item for item in charges if (item.get("payment") or {}).get("status") == "approved"]


def _charge_date(item: dict) -> datetime | None:
    raw = item.get("debit_date") or item.get("date_created")
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)  # sem offset = UTC, nunca naive


class RefundService:
    def __init__(self, db: Session, mp_client: MercadoPagoClient | None = None) -> None:
        self.db = db
        self.repository = SubscriptionRepository(db)
        self.mp_client = mp_client or MercadoPagoClient(
            access_token=settings.mercadopago_access_token or "", base_url=settings.mercadopago_base_url
        )

    def refund_latest_charge(self, *, user_id: int, admin_user_id: int, now: datetime | None = None) -> SubscriptionRefund:
        now = now or datetime.now(UTC)
        subscription = self.repository.get_by_user_id(user_id)
        if not subscription or not subscription.mp_preapproval_id:
            raise AppError("Esse aluno não tem assinatura cobrada.", status_code=404, code="subscription_not_found")

        approved = _approved_payments(self.mp_client.list_authorized_payments(subscription.mp_preapproval_id))
        approved.sort(key=lambda item: _charge_date(item) or datetime.min.replace(tzinfo=UTC), reverse=True)
        if not approved:
            raise AppError("Nenhuma cobrança aprovada para reembolsar.", status_code=409, code="no_payment_to_refund")
        charge = approved[0]
        payment_id = str(charge["payment"]["id"])

        charged_at = _charge_date(charge)
        if charged_at is None or now - charged_at > timedelta(days=settings.refund_window_days):
            raise AppError(
                f"Fora do prazo de {settings.refund_window_days} dias para reembolso.",
                status_code=409,
                code="refund_window_expired",
            )
        already = AppError("Essa cobrança já foi reembolsada.", status_code=409, code="already_refunded")
        if self.db.scalar(select(SubscriptionRefund).where(SubscriptionRefund.mp_payment_id == payment_id)):
            raise already

        # Registra a auditoria ANTES de chamar o Mercado Pago: a chave única em `mp_payment_id` faz de dois
        # cliques simultâneos (ou duas abas) um só reembolso, e uma falha do MP desfaz o registro.
        refund = SubscriptionRefund(
            subscription_id=subscription.id,
            admin_user_id=admin_user_id,
            mp_payment_id=payment_id,
            amount_cents=round(float(charge.get("transaction_amount") or 0) * 100),
            refunded_at=now,
        )
        self.db.add(refund)
        try:
            self.db.flush()
        except IntegrityError:
            self.db.rollback()
            raise already from None
        try:
            self.mp_client.refund_payment(payment_id)
        except AppError:
            self.db.rollback()
            raise
        try:
            self.mp_client.update_preapproval(subscription.mp_preapproval_id, status="cancelled")
        except AppError:
            logger.warning("Reembolso feito, mas cancelar a preapproval %s falhou — revisar no Mercado Pago.", subscription.mp_preapproval_id)

        # Revoga o acesso na hora: reembolso encerra o período pago.
        subscription.status = SubscriptionStatus.CANCELED
        subscription.grace_until = None
        subscription.current_period_end = now
        subscription.canceled_at = subscription.canceled_at or now
        self.repository.save(subscription)
        self.db.refresh(refund)
        return refund

    def reconcile(self, *, now: datetime | None = None) -> list[ReconciliationIssue]:
        now = now or datetime.now(UTC)
        issues: list[ReconciliationIssue] = []
        local_by_preapproval: dict[str, Subscription] = {}

        for subscription in self.repository.list_all_for_metrics():
            if not subscription.mp_preapproval_id:
                continue
            local_by_preapproval[subscription.mp_preapproval_id] = subscription
            if effective_status(subscription, now=now) not in _ACCESS_STATUSES:
                continue
            user = self.db.get(User, subscription.user_id)
            try:
                charges = self.mp_client.list_authorized_payments(subscription.mp_preapproval_id)
            except AppError:
                # Um erro isolado do Mercado Pago não derruba o relatório: vira um item "não foi possível conferir".
                issues.append(
                    ReconciliationIssue(
                        kind="lookup_failed",
                        detail="Não foi possível consultar as cobranças desta assinatura no Mercado Pago agora.",
                        user_id=subscription.user_id,
                        email=user.email if user else None,
                        mp_preapproval_id=subscription.mp_preapproval_id,
                    )
                )
                continue
            if not _approved_payments(charges):
                issues.append(
                    ReconciliationIssue(
                        kind="active_without_payment",
                        detail="Assinatura com acesso liberado, mas sem nenhuma cobrança aprovada no Mercado Pago.",
                        user_id=subscription.user_id,
                        email=user.email if user else None,
                        mp_preapproval_id=subscription.mp_preapproval_id,
                    )
                )

        offset = 0
        while True:
            page = self.mp_client.search_preapprovals(status="authorized", limit=100, offset=offset)
            for remote in page:
                local = local_by_preapproval.get(str(remote.get("id")))
                if local is None:
                    issues.append(
                        ReconciliationIssue(
                            kind="remote_without_local",
                            detail="Assinatura autorizada no Mercado Pago sem registro no banco.",
                            mp_preapproval_id=str(remote.get("id")),
                            email=remote.get("payer_email"),
                        )
                    )
                elif effective_status(local, now=now) not in (*_ACCESS_STATUSES, SubscriptionStatus.PENDING):
                    user = self.db.get(User, local.user_id)
                    issues.append(
                        ReconciliationIssue(
                            kind="status_mismatch",
                            detail=f"Autorizada no Mercado Pago, mas {effective_status(local, now=now).value} no banco.",
                            user_id=local.user_id,
                            email=user.email if user else None,
                            mp_preapproval_id=local.mp_preapproval_id,
                        )
                    )
            if len(page) < 100:
                break
            offset += 100
        return issues
