from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DiscountTypeLiteral = Literal["percent", "fixed"]


class CouponCreateRequest(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    discount_type: DiscountTypeLiteral
    discount_value: int = Field(gt=0)
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    max_uses: int | None = Field(default=None, gt=0)


class CouponUpdateRequest(BaseModel):
    discount_type: DiscountTypeLiteral | None = None
    discount_value: int | None = Field(default=None, gt=0)
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    max_uses: int | None = Field(default=None, gt=0)
    active: bool | None = None


class CouponRead(BaseModel):
    id: int
    code: str
    discount_type: DiscountTypeLiteral
    discount_value: int
    valid_from: datetime | None
    valid_until: datetime | None
    max_uses: int | None
    used_count: int
    active: bool

    model_config = ConfigDict(from_attributes=True)


class CouponListResponse(BaseModel):
    items: list[CouponRead]
    total: int


class AdminSubscriberRead(BaseModel):
    user_id: int
    name: str
    email: str
    cycle: Literal["monthly", "annual"]
    status: Literal["pending", "active", "grace", "suspended", "canceled"]
    price_charged_cents: int
    current_period_end: datetime | None
    canceled_at: datetime | None


class AdminSubscribersResponse(BaseModel):
    items: list[AdminSubscriberRead]
    total: int
    mrr_cents: int
