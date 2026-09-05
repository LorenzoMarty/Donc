from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CycleLiteral = Literal["monthly", "annual"]
StatusLiteral = Literal["pending", "active", "grace", "suspended", "canceled"]


class CheckoutRequest(BaseModel):
    cycle: CycleLiteral
    coupon_code: str | None = Field(default=None, max_length=40)


class CheckoutResponse(BaseModel):
    checkout_url: str
    status: StatusLiteral


class SubscriptionRead(BaseModel):
    cycle: CycleLiteral
    status: StatusLiteral
    price_charged_cents: int
    current_period_end: datetime | None
    grace_until: datetime | None
    canceled_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ChangePlanRequest(BaseModel):
    cycle: CycleLiteral
