"""Indicação de amigos.

Regra (assumida; o dono pode ajustar):
- o indicado ganha `referral_discount_percent` de desconto (mesmo mecanismo do cupom: vale na
  recorrência da assinatura);
- o indicador ganha 1 crédito (= 1 mês grátis) quando o indicado paga pela primeira vez. O crédito é
  registrado aqui e aplicado na cobrança do indicador pelo dono (o admin marca como aplicado); não
  mexe sozinho na cobrança do Mercado Pago.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.middlewares.errors import AppError
from src.models import Subscription, User
from src.models.referral import Referral
from src.services import email_service
from src.utils.email_normalize import normalize_email

_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sem 0/O/1/I


@dataclass
class ReferralSummary:
    code: str
    discount_percent: int
    pending_count: int
    rewarded_count: int
    credits_available: int


class ReferralService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def code_for(self, user: User) -> str:
        """Código único do aluno, gerado na primeira vez que ele pede."""
        if user.referral_code:
            return user.referral_code
        while True:
            candidate = "AMIGO-" + "".join(secrets.choice(_ALPHABET) for _ in range(6))
            if not self.db.scalar(select(User.id).where(User.referral_code == candidate)):
                break
        user.referral_code = candidate
        self.db.add(user)
        self.db.commit()
        return candidate

    def summary(self, user: User) -> ReferralSummary:
        rows = list(self.db.scalars(select(Referral).where(Referral.referrer_id == user.id)))
        rewarded = [row for row in rows if row.status == "rewarded"]
        return ReferralSummary(
            code=self.code_for(user),
            discount_percent=settings.referral_discount_percent,
            pending_count=sum(1 for row in rows if row.status == "pending"),
            rewarded_count=len(rewarded),
            credits_available=sum(1 for row in rewarded if row.reward_applied_at is None),
        )

    def find_referrer(self, code: str) -> User | None:
        normalized = code.strip().upper()
        if not normalized.startswith("AMIGO-"):
            return None
        return self.db.scalar(select(User).where(User.referral_code == normalized, User.deleted_at.is_(None)))

    def attach(self, *, referrer: User, referred: User, existing_subscription: Subscription | None, code: str) -> None:
        """Valida e registra a indicação no início do checkout do indicado."""
        if referrer.id == referred.id or normalize_email(referrer.email) == normalize_email(referred.email):
            raise AppError("Você não pode usar o seu próprio código de indicação.", status_code=400, code="referral_self")
        if existing_subscription is not None and existing_subscription.current_period_end is not None:
            raise AppError("O código de indicação vale só para quem ainda não assinou.", status_code=400, code="referral_not_eligible")
        current = self.db.scalar(select(Referral).where(Referral.referred_id == referred.id))
        if current is not None:
            if current.referrer_id != referrer.id:
                raise AppError("Esta conta já foi indicada por outra pessoa.", status_code=400, code="referral_already_used")
            return
        self.db.add(Referral(referrer_id=referrer.id, referred_id=referred.id, code=code.strip().upper()))
        self.db.flush()

    def discard_pending(self, referred_id: int) -> None:
        """Checkout refeito sem código: a indicação pendente não vale mais."""
        pending = self.db.scalar(select(Referral).where(Referral.referred_id == referred_id, Referral.status == "pending"))
        if pending is not None:
            self.db.delete(pending)
            self.db.flush()

    def reward_on_first_payment(self, referred_id: int) -> Referral | None:
        referral = self.db.scalar(select(Referral).where(Referral.referred_id == referred_id, Referral.status == "pending"))
        if referral is None:
            return None
        referral.status = "rewarded"
        referral.rewarded_at = datetime.now(UTC)
        referrer = self.db.get(User, referral.referrer_id)
        if referrer is not None:
            email_service.fire_and_forget(email_service.send_referral_reward, to=referrer.email, name=referrer.name)
        return referral

    # --- admin ---

    def admin_overview(self) -> dict:
        rows = list(self.db.scalars(select(Referral).order_by(Referral.created_at.desc())))
        users = {
            user.id: user
            for user in self.db.scalars(select(User).where(User.id.in_({r.referrer_id for r in rows} | {r.referred_id for r in rows})))
        } if rows else {}
        by_referrer = (
            self.db.execute(
                select(Referral.referrer_id, func.count(Referral.id)).where(Referral.status == "rewarded").group_by(Referral.referrer_id).order_by(func.count(Referral.id).desc()).limit(5)
            ).all()
            if rows
            else []
        )
        return {
            "total": len(rows),
            "pending": sum(1 for r in rows if r.status == "pending"),
            "rewarded": sum(1 for r in rows if r.status == "rewarded"),
            "credits_open": sum(1 for r in rows if r.status == "rewarded" and r.reward_applied_at is None),
            "top_referrers": [
                {"user_id": uid, "name": users[uid].name if uid in users else "", "email": users[uid].email if uid in users else "", "rewarded": count}
                for uid, count in by_referrer
            ],
            "items": [
                {
                    "id": r.id,
                    "referrer_email": users[r.referrer_id].email if r.referrer_id in users else "",
                    "referred_email": users[r.referred_id].email if r.referred_id in users else "",
                    "status": r.status,
                    "created_at": r.created_at,
                    "reward_applied": r.reward_applied_at is not None,
                }
                for r in rows[:50]
            ],
        }

    def mark_reward_applied(self, referral_id: int) -> None:
        referral = self.db.get(Referral, referral_id)
        if referral is None:
            raise AppError("Indicação não encontrada.", status_code=404, code="referral_not_found")
        if referral.status != "rewarded":
            raise AppError("Essa indicação ainda não gerou crédito.", status_code=409, code="referral_not_rewarded")
        referral.reward_applied_at = referral.reward_applied_at or datetime.now(UTC)
        self.db.commit()
