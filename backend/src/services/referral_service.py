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
from sqlalchemy.exc import IntegrityError
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
        for _ in range(5):
            candidate = "AMIGO-" + "".join(secrets.choice(_ALPHABET) for _ in range(6))
            user.referral_code = candidate
            self.db.add(user)
            try:
                self.db.commit()
                return candidate
            except IntegrityError:
                # Código repetido ou outra aba gerou o do mesmo aluno agora: relê e tenta de novo.
                self.db.rollback()
                self.db.refresh(user)
                if user.referral_code:
                    return user.referral_code
        raise AppError("Não foi possível gerar o seu código agora. Tente novamente.", status_code=503, code="referral_code_unavailable")

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
        counts = dict(self.db.execute(select(Referral.status, func.count(Referral.id)).group_by(Referral.status)).all())
        credits_open = self.db.scalar(
            select(func.count(Referral.id)).where(Referral.status == "rewarded", Referral.reward_applied_at.is_(None))
        ) or 0
        recent = list(self.db.scalars(select(Referral).order_by(Referral.created_at.desc()).limit(50)))
        top = self.db.execute(
            select(Referral.referrer_id, func.count(Referral.id))
            .where(Referral.status == "rewarded")
            .group_by(Referral.referrer_id)
            .order_by(func.count(Referral.id).desc())
            .limit(5)
        ).all()
        ids = {r.referrer_id for r in recent} | {r.referred_id for r in recent} | {uid for uid, _ in top}
        users = {user.id: user for user in self.db.scalars(select(User).where(User.id.in_(ids)))} if ids else {}

        def email(uid: int) -> str:
            return users[uid].email if uid in users else ""

        return {
            "total": sum(counts.values()),
            "pending": counts.get("pending", 0),
            "rewarded": counts.get("rewarded", 0),
            "credits_open": credits_open,
            "top_referrers": [
                {"user_id": uid, "name": users[uid].name if uid in users else "", "email": email(uid), "rewarded": count} for uid, count in top
            ],
            "items": [
                {
                    "id": r.id,
                    "referrer_email": email(r.referrer_id),
                    "referred_email": email(r.referred_id),
                    "status": r.status,
                    "created_at": r.created_at,
                    "reward_applied": r.reward_applied_at is not None,
                }
                for r in recent
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
