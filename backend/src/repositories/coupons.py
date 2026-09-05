from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models import Coupon


class CouponRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_code(self, code: str) -> Coupon | None:
        return self.db.scalar(select(Coupon).where(Coupon.code == code.strip().upper()))

    def list_all(self, *, limit: int, offset: int) -> list[Coupon]:
        query = select(Coupon).order_by(Coupon.created_at.desc()).limit(limit).offset(offset)
        return list(self.db.scalars(query))

    def count_all(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Coupon)) or 0

    def save(self, coupon: Coupon) -> Coupon:
        self.db.add(coupon)
        self.db.commit()
        self.db.refresh(coupon)
        return coupon
