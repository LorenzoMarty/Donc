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
    active_count: int = 0
    canceled_30d: int = 0
    churn_rate_30d: float = 0.0


class FunnelStepRead(BaseModel):
    key: str
    label: str
    count: int
    pct: float


class RetentionRead(BaseModel):
    eligible: int
    retained: int
    rate: float


class FunnelResponse(BaseModel):
    days: int
    signups: int
    steps: list[FunnelStepRead]
    first_action_median_minutes: float | None
    first_action_within_target_pct: float
    retention_d1: RetentionRead
    retention_d7: RetentionRead


class RefundRead(BaseModel):
    mp_payment_id: str
    amount_cents: int
    refunded_at: datetime
    admin_user_id: int | None

    model_config = ConfigDict(from_attributes=True)


class ReconciliationIssueRead(BaseModel):
    kind: Literal["active_without_payment", "remote_without_local", "status_mismatch"]
    detail: str
    user_id: int | None = None
    email: str | None = None
    mp_preapproval_id: str | None = None
