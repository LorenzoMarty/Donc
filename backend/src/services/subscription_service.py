import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.middlewares.errors import AppError
from src.models import PlanCycle, SubscriptionStatus, User
from src.utils.email_normalize import normalize_email
from src.models.subscription import ProcessedWebhookEvent, Subscription
from src.repositories.subscriptions import SubscriptionRepository
from src.services import email_service
from src.services.coupon_service import CouponService
from src.services.mercadopago_client import MercadoPagoClient
from src.services.subscription_status import effective_status

logger = logging.getLogger("src.subscriptions")

_CYCLE_LABEL = {PlanCycle.MONTHLY: "mensal", PlanCycle.ANNUAL: "anual"}
_CYCLE_FREQUENCY_MONTHS = {PlanCycle.MONTHLY: 1, PlanCycle.ANNUAL: 12}


class SubscriptionService:
    def __init__(self, db: Session, mp_client: MercadoPagoClient | None = None) -> None:
        self.db = db
        self.repository = SubscriptionRepository(db)
        self.coupons = CouponService(db)
        self.mp_client = mp_client or MercadoPagoClient(
            access_token=settings.mercadopago_access_token or "", base_url=settings.mercadopago_base_url
        )

    def _price_for(self, cycle: PlanCycle) -> int:
        return settings.subscription_price_monthly_cents if cycle == PlanCycle.MONTHLY else settings.subscription_price_annual_cents

    def start_checkout(self, user: User, *, cycle: PlanCycle, coupon_code: str | None = None) -> tuple[Subscription, str]:
        now = datetime.now(UTC)
        existing = self.repository.get_by_user_id(user.id)
        if existing and effective_status(existing, now=now) in (SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE):
            raise AppError("Você já tem uma assinatura ativa.", status_code=409, code="subscription_already_active")

        base_amount = self._price_for(cycle)
        coupon = None
        final_amount = base_amount
        if coupon_code:
            final_amount, coupon = self.coupons.validate_and_apply(coupon_code, base_amount_cents=base_amount, now=now)
            self._ensure_coupon_not_reused(user, existing, coupon)

        mp_result = self.mp_client.create_preapproval(
            payer_email=user.email,
            reason=f"Assinatura Donc ({_CYCLE_LABEL[cycle]})",
            frequency_months=_CYCLE_FREQUENCY_MONTHS[cycle],
            amount_cents=final_amount,
            back_url=f"{settings.frontend_origin.split(',', maxsplit=1)[0].strip()}/assinatura/retorno",
            external_reference=f"user-{user.id}",
        )

        subscription = existing or Subscription(user_id=user.id)
        subscription.cycle = cycle
        subscription.status = SubscriptionStatus.PENDING
        subscription.mp_preapproval_id = mp_result["id"]
        subscription.price_charged_cents = final_amount
        subscription.coupon_code = coupon.code if coupon else None
        subscription.coupon_applied = False
        subscription.canceled_at = None
        subscription.grace_until = None
        saved = self.repository.save(subscription)
        return saved, mp_result["init_point"]

    def _ensure_coupon_not_reused(self, user: User, existing: Subscription | None, coupon) -> None:
        """Um cupom por conta e, nos de uso limitado, um por pessoa: aliases do mesmo e-mail
        (`nome+x@`, pontos no Gmail) contam como a mesma conta descartavel."""
        reused = AppError("Você já usou este cupom.", status_code=400, code="coupon_already_used")
        if existing and existing.coupon_applied and existing.coupon_code == coupon.code:
            raise reused
        if coupon.max_uses is None:
            return
        wanted = normalize_email(user.email)
        holders = self.db.execute(
            select(User.email, Subscription.coupon_applied, Subscription.status)
            .join(Subscription, Subscription.user_id == User.id)
            .where(Subscription.coupon_code == coupon.code, Subscription.user_id != user.id)
        )
        for email, applied, status in holders:
            if (applied or status in (SubscriptionStatus.PENDING, SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE)) and normalize_email(email) == wanted:
                raise reused

    def handle_webhook(self, payload: dict, headers: dict) -> None:
        data_id = str((payload.get("data") or {}).get("id") or "")
        if not data_id:
            return

        secret = settings.mercadopago_webhook_secret
        if secret:
            valid = self.mp_client.verify_webhook_signature(
                x_signature=headers.get("x-signature", ""),
                x_request_id=headers.get("x-request-id", ""),
                data_id=data_id,
                secret=secret,
            )
            if not valid:
                raise AppError("Assinatura de webhook inválida.", status_code=401, code="invalid_webhook_signature")

        try:
            self._process_notification(payload, data_id)
        except IntegrityError:
            # Entrega duplicada concorrente: a outra request ganhou o marcador unico — ja processado.
            self.db.rollback()
            logger.info("Webhook Mercado Pago duplicado (concorrente): %s", payload.get("id"))
        except Exception:
            # Qualquer falha descarta o marcador de notificacao: o retry do MP precisa reprocessar.
            self.db.rollback()
            raise

    def _process_notification(self, payload: dict, data_id: str) -> None:
        notification_id = str(payload.get("id") or "")
        if notification_id:
            already_processed = self.db.scalar(
                select(ProcessedWebhookEvent).where(ProcessedWebhookEvent.mp_notification_id == notification_id)
            )
            if already_processed:
                return
            # Sem commit aqui: o marcador so persiste junto com o resultado (save abaixo). Se a
            # consulta ao MP falhar, a transacao nao e confirmada e o retry do MP reprocessa —
            # antes o id era "queimado" antes do trabalho e a assinatura nunca ativava.
            self.db.add(ProcessedWebhookEvent(mp_notification_id=notification_id))

        subscription = self.repository.get_by_mp_preapproval_id(data_id)
        if not subscription:
            logger.info("Webhook Mercado Pago para preapproval desconhecida: %s", data_id)
            self.db.commit()
            return

        remote = self.mp_client.get_preapproval(data_id)
        remote_status = remote.get("status")
        previous_status = subscription.status
        now = datetime.now(UTC)

        if remote_status == "authorized":
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.grace_until = None
            next_payment_date = remote.get("next_payment_date")
            if next_payment_date:
                subscription.current_period_end = datetime.fromisoformat(next_payment_date)
        elif remote_status == "paused":
            subscription.status = SubscriptionStatus.GRACE
            subscription.grace_until = now + timedelta(days=settings.subscription_grace_period_days)
        elif remote_status == "cancelled":
            subscription.status = SubscriptionStatus.CANCELED
            subscription.grace_until = None

        if (
            previous_status == SubscriptionStatus.PENDING
            and subscription.status == SubscriptionStatus.ACTIVE
            and subscription.coupon_code
            and not subscription.coupon_applied
        ):
            self.coupons.record_redemption(subscription.coupon_code)
            subscription.coupon_applied = True

        self.repository.save(subscription)
        self._notify_status_change(subscription, previous_status)

    def _notify_status_change(self, subscription: Subscription, previous_status: SubscriptionStatus) -> None:
        if subscription.status == previous_status:
            return
        user = self.db.get(User, subscription.user_id)
        if not user:
            return
        if subscription.status == SubscriptionStatus.ACTIVE and previous_status == SubscriptionStatus.PENDING:
            email_service.fire_and_forget(email_service.send_payment_approved, to=user.email, name=user.name)
        elif subscription.status == SubscriptionStatus.GRACE:
            email_service.fire_and_forget(
                email_service.send_payment_failed, to=user.email, name=user.name, grace_days=settings.subscription_grace_period_days
            )
        elif subscription.status == SubscriptionStatus.CANCELED and subscription.canceled_at is None:
            # canceled_at preenchido = cancelamento iniciado pelo aluno (cancel() ja avisou).
            email_service.fire_and_forget(email_service.send_subscription_canceled, to=user.email, name=user.name)

    def payment_history(self, user: User) -> list[dict]:
        """Cobrancas reais da assinatura, direto do Mercado Pago (mais recentes primeiro)."""
        subscription = self.repository.get_by_user_id(user.id)
        if not subscription or not subscription.mp_preapproval_id:
            return []
        items = []
        for raw in self.mp_client.list_authorized_payments(subscription.mp_preapproval_id):
            payment_status = (raw.get("payment") or {}).get("status")
            if payment_status == "approved":
                status = "paid"
            elif payment_status == "rejected" or raw.get("status") == "cancelled":
                status = "failed"
            elif raw.get("status") == "recycling":
                status = "retrying"  # recusada, com nova tentativa agendada: não pode parecer cobrança futura normal
            else:
                status = "pending"
            raw_date = raw.get("debit_date") or raw.get("date_created")
            try:
                date = datetime.fromisoformat(raw_date.replace("Z", "+00:00")) if raw_date else None
                if date is not None and date.tzinfo is None:
                    date = date.replace(tzinfo=UTC)  # sem offset = UTC, nunca naive (a ordenação compara com aware)
            except (ValueError, AttributeError):
                date = None  # um item malformado não derruba o histórico inteiro
            items.append(
                {
                    "id": str(raw.get("id")),
                    "status": status,
                    "amount_cents": round(float(raw.get("transaction_amount") or 0) * 100),
                    "date": date,
                }
            )
        return sorted(items, key=lambda item: item["date"] or datetime.min.replace(tzinfo=UTC), reverse=True)

    def cancel(self, user: User) -> Subscription:
        subscription = self.repository.get_by_user_id(user.id)
        if not subscription:
            raise AppError("Você não tem assinatura.", status_code=404, code="subscription_not_found")

        now = datetime.now(UTC)
        current = effective_status(subscription, now=now)
        if current not in (SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE, SubscriptionStatus.PENDING):
            raise AppError("Assinatura já está cancelada.", status_code=409, code="subscription_already_canceled")

        if subscription.mp_preapproval_id:
            try:
                self.mp_client.update_preapproval(subscription.mp_preapproval_id, status="cancelled")
            except AppError:
                logger.warning("Falha ao cancelar preapproval %s no Mercado Pago — cancelamento local segue.", subscription.mp_preapproval_id)

        if current == SubscriptionStatus.PENDING:
            subscription.status = SubscriptionStatus.CANCELED
        else:
            # Acesso continua ate current_period_end (REQ-5) — effective_status() decide isso.
            subscription.canceled_at = now
        saved = self.repository.save(subscription)
        email_service.fire_and_forget(email_service.send_subscription_canceled, to=user.email, name=user.name)
        return saved

    def change_plan(self, user: User, *, new_cycle: PlanCycle) -> Subscription:
        subscription = self.repository.get_by_user_id(user.id)
        if not subscription:
            raise AppError("Você não tem assinatura.", status_code=404, code="subscription_not_found")

        now = datetime.now(UTC)
        if effective_status(subscription, now=now) != SubscriptionStatus.ACTIVE:
            raise AppError("Só é possível trocar de plano com assinatura ativa.", status_code=409, code="subscription_not_active")
        if subscription.cycle == new_cycle:
            raise AppError("Você já está neste plano.", status_code=400, code="subscription_same_cycle")

        new_amount = self._price_for(new_cycle)
        self.mp_client.update_preapproval(
            subscription.mp_preapproval_id,
            auto_recurring={
                "transaction_amount": new_amount / 100,
                "frequency": _CYCLE_FREQUENCY_MONTHS[new_cycle],
                "frequency_type": "months",
            },
        )
        subscription.cycle = new_cycle
        subscription.price_charged_cents = new_amount
        return self.repository.save(subscription)

    def get_effective(self, user: User) -> Subscription | None:
        subscription = self.repository.get_by_user_id(user.id)
        if not subscription:
            return None
        now = datetime.now(UTC)
        new_status = effective_status(subscription, now=now)
        if new_status != subscription.status:
            subscription.status = new_status
            self.repository.save(subscription)
        return subscription
