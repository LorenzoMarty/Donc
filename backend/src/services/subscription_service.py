import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.middlewares.errors import AppError
from src.models import PlanCycle, SubscriptionStatus, User
from src.models.subscription import ProcessedWebhookEvent, Subscription
from src.repositories.subscriptions import SubscriptionRepository
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

        notification_id = str(payload.get("id") or "")
        if notification_id:
            already_processed = self.db.scalar(
                select(ProcessedWebhookEvent).where(ProcessedWebhookEvent.mp_notification_id == notification_id)
            )
            if already_processed:
                return
            self.db.add(ProcessedWebhookEvent(mp_notification_id=notification_id))
            self.db.commit()

        subscription = self.repository.get_by_mp_preapproval_id(data_id)
        if not subscription:
            logger.info("Webhook Mercado Pago para preapproval desconhecida: %s", data_id)
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
        return self.repository.save(subscription)

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
