"""CouponService: CRUD (REQ-8) e validacao/aplicacao no checkout (REQ-9)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 - registra os modelos no Base.metadata
from src.database.session import Base
from src.middlewares.errors import AppError
from src.models.subscription import DiscountType
from src.services.coupon_service import CouponService

pytestmark = pytest.mark.unit

NOW = datetime(2026, 9, 4, 12, 0, tzinfo=UTC)


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_create_coupon_normalizes_code_to_uppercase():
    service = CouponService(_session())
    coupon = service.create(code="  promo10  ", discount_type=DiscountType.PERCENT, discount_value=10)
    assert coupon.code == "PROMO10"


def test_validate_and_apply_percent_discount():
    service = CouponService(_session())
    service.create(code="PROMO10", discount_type=DiscountType.PERCENT, discount_value=10)
    final_amount, coupon = service.validate_and_apply("promo10", base_amount_cents=5_900, now=NOW)
    assert final_amount == 5_310
    assert coupon.code == "PROMO10"


def test_validate_and_apply_fixed_discount_never_goes_negative():
    service = CouponService(_session())
    service.create(code="FIXED100", discount_type=DiscountType.FIXED, discount_value=100_000)
    final_amount, _ = service.validate_and_apply("FIXED100", base_amount_cents=5_900, now=NOW)
    assert final_amount == 0


def test_validate_and_apply_rejects_unknown_code():
    service = CouponService(_session())
    with pytest.raises(AppError) as exc_info:
        service.validate_and_apply("NAOEXISTE", base_amount_cents=5_900, now=NOW)
    assert exc_info.value.code == "coupon_not_found"


def test_validate_and_apply_rejects_inactive_coupon():
    service = CouponService(_session())
    service.create(code="OFF", discount_type=DiscountType.PERCENT, discount_value=10, active=False)
    with pytest.raises(AppError) as exc_info:
        service.validate_and_apply("OFF", base_amount_cents=5_900, now=NOW)
    assert exc_info.value.code == "coupon_inactive"


def test_validate_and_apply_rejects_expired_coupon():
    service = CouponService(_session())
    service.create(
        code="EXPIRED",
        discount_type=DiscountType.PERCENT,
        discount_value=10,
        valid_until=NOW - timedelta(days=1),
    )
    with pytest.raises(AppError) as exc_info:
        service.validate_and_apply("EXPIRED", base_amount_cents=5_900, now=NOW)
    assert exc_info.value.code == "coupon_expired"


def test_validate_and_apply_rejects_not_yet_valid_coupon():
    service = CouponService(_session())
    service.create(
        code="FUTURE",
        discount_type=DiscountType.PERCENT,
        discount_value=10,
        valid_from=NOW + timedelta(days=1),
    )
    with pytest.raises(AppError) as exc_info:
        service.validate_and_apply("FUTURE", base_amount_cents=5_900, now=NOW)
    assert exc_info.value.code == "coupon_not_yet_valid"


def test_validate_and_apply_rejects_exhausted_coupon():
    service = CouponService(_session())
    service.create(code="LIMITED", discount_type=DiscountType.PERCENT, discount_value=10, max_uses=1)
    coupon = service.repository.get_by_code("LIMITED")
    coupon.used_count = 1
    service.repository.save(coupon)
    with pytest.raises(AppError) as exc_info:
        service.validate_and_apply("LIMITED", base_amount_cents=5_900, now=NOW)
    assert exc_info.value.code == "coupon_exhausted"


def test_record_redemption_increments_used_count():
    service = CouponService(_session())
    coupon = service.create(code="PROMO10", discount_type=DiscountType.PERCENT, discount_value=10)
    service.record_redemption(coupon.code)
    refreshed = service.repository.get_by_code("PROMO10")
    assert refreshed.used_count == 1


def test_deactivate_coupon():
    service = CouponService(_session())
    coupon = service.create(code="PROMO10", discount_type=DiscountType.PERCENT, discount_value=10)
    service.deactivate(coupon.id)
    refreshed = service.repository.get_by_code("PROMO10")
    assert refreshed.active is False
