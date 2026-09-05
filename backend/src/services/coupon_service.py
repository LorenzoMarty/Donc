from datetime import UTC, datetime

from sqlalchemy.orm import Session

from src.middlewares.errors import AppError
from src.models.subscription import Coupon, DiscountType
from src.repositories.coupons import CouponRepository


def _as_aware(value: datetime | None) -> datetime | None:
    # SQLite (usado nos testes) nao preserva tzinfo em DateTime(timezone=True) — volta naive do
    # banco. Toda escrita do projeto usa UTC, entao naive == UTC aqui.
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


class CouponService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = CouponRepository(db)

    def create(
        self,
        *,
        code: str,
        discount_type: DiscountType,
        discount_value: int,
        valid_from: datetime | None = None,
        valid_until: datetime | None = None,
        max_uses: int | None = None,
        active: bool = True,
    ) -> Coupon:
        normalized = code.strip().upper()
        if self.repository.get_by_code(normalized):
            raise AppError("Já existe um cupom com este código.", status_code=409, code="coupon_code_in_use")
        coupon = Coupon(
            code=normalized,
            discount_type=discount_type,
            discount_value=discount_value,
            valid_from=valid_from,
            valid_until=valid_until,
            max_uses=max_uses,
            active=active,
        )
        return self.repository.save(coupon)

    def update(self, coupon_id: int, **fields) -> Coupon:
        coupon = self.db.get(Coupon, coupon_id)
        if not coupon:
            raise AppError("Cupom não encontrado.", status_code=404, code="coupon_not_found")
        for key, value in fields.items():
            setattr(coupon, key, value)
        return self.repository.save(coupon)

    def deactivate(self, coupon_id: int) -> Coupon:
        return self.update(coupon_id, active=False)

    def list_all(self, *, limit: int = 50, offset: int = 0) -> list[Coupon]:
        return self.repository.list_all(limit=limit, offset=offset)

    def validate_and_apply(self, code: str, *, base_amount_cents: int, now: datetime) -> tuple[int, Coupon]:
        coupon = self.repository.get_by_code(code)
        if not coupon:
            raise AppError("Cupom inválido.", status_code=404, code="coupon_not_found")
        if not coupon.active:
            raise AppError("Este cupom não está mais ativo.", status_code=400, code="coupon_inactive")
        valid_from = _as_aware(coupon.valid_from)
        valid_until = _as_aware(coupon.valid_until)
        if valid_from is not None and now < valid_from:
            raise AppError("Este cupom ainda não é válido.", status_code=400, code="coupon_not_yet_valid")
        if valid_until is not None and now > valid_until:
            raise AppError("Este cupom expirou.", status_code=400, code="coupon_expired")
        if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
            raise AppError("Este cupom atingiu o limite de uso.", status_code=400, code="coupon_exhausted")

        if coupon.discount_type == DiscountType.PERCENT:
            discount = round(base_amount_cents * coupon.discount_value / 100)
        else:
            discount = coupon.discount_value
        final_amount = max(0, base_amount_cents - discount)
        return final_amount, coupon

    def record_redemption(self, code: str) -> None:
        coupon = self.repository.get_by_code(code)
        if not coupon:
            return
        coupon.used_count += 1
        self.repository.save(coupon)
