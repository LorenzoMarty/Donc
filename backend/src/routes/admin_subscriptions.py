from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import require_admin
from src.models import DiscountType, User
from src.schemas.admin_subscriptions import (
    AdminSubscriberRead,
    AdminSubscribersResponse,
    CouponCreateRequest,
    CouponListResponse,
    CouponRead,
    CouponUpdateRequest,
)
from src.schemas.common import ApiResponse, success_response
from src.services.admin_subscription_service import AdminSubscriptionService
from src.services.coupon_service import CouponService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/subscribers", response_model=ApiResponse[AdminSubscribersResponse])
def list_subscribers(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminSubscribersResponse]:
    result = AdminSubscriptionService(db).list_subscribers(limit=limit, offset=offset)
    items = [
        AdminSubscriberRead(
            user_id=row.user_id,
            name=row.name,
            email=row.email,
            cycle=row.cycle.value,
            status=row.status.value,
            price_charged_cents=row.price_charged_cents,
            current_period_end=row.current_period_end,
            canceled_at=row.canceled_at,
        )
        for row in result.items
    ]
    return success_response(AdminSubscribersResponse(items=items, total=result.total, mrr_cents=result.mrr_cents))


@router.get("/coupons", response_model=ApiResponse[CouponListResponse])
def list_coupons(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[CouponListResponse]:
    service = CouponService(db)
    items = service.list_all(limit=limit, offset=offset)
    return success_response(
        CouponListResponse(items=[CouponRead.model_validate(item) for item in items], total=service.repository.count_all())
    )


@router.post("/coupons", response_model=ApiResponse[CouponRead], status_code=201)
def create_coupon(
    payload: CouponCreateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[CouponRead]:
    coupon = CouponService(db).create(
        code=payload.code,
        discount_type=DiscountType(payload.discount_type),
        discount_value=payload.discount_value,
        valid_from=payload.valid_from,
        valid_until=payload.valid_until,
        max_uses=payload.max_uses,
    )
    return success_response(CouponRead.model_validate(coupon), "Cupom criado.")


@router.patch("/coupons/{coupon_id}", response_model=ApiResponse[CouponRead])
def update_coupon(
    coupon_id: int,
    payload: CouponUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[CouponRead]:
    fields = payload.model_dump(exclude_unset=True)
    if "discount_type" in fields:
        fields["discount_type"] = DiscountType(fields["discount_type"])
    coupon = CouponService(db).update(coupon_id, **fields)
    return success_response(CouponRead.model_validate(coupon), "Cupom atualizado.")


@router.post("/coupons/{coupon_id}/deactivate", response_model=ApiResponse[CouponRead])
def deactivate_coupon(
    coupon_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[CouponRead]:
    coupon = CouponService(db).deactivate(coupon_id)
    return success_response(CouponRead.model_validate(coupon), "Cupom desativado.")
