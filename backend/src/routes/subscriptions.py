import logging

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.middlewares.errors import AppError
from src.models import PlanCycle, User
from src.schemas.common import ApiResponse, success_response
from src.schemas.subscriptions import ChangePlanRequest, CheckoutRequest, CheckoutResponse, SubscriptionRead
from src.services.subscription_service import SubscriptionService

logger = logging.getLogger("src.routes.subscriptions")

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.post("/checkout", response_model=ApiResponse[CheckoutResponse], status_code=201)
def checkout(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[CheckoutResponse]:
    service = SubscriptionService(db)
    subscription, checkout_url = service.start_checkout(
        current_user, cycle=PlanCycle(payload.cycle), coupon_code=payload.coupon_code
    )
    return success_response(
        CheckoutResponse(checkout_url=checkout_url, status=subscription.status.value),
        "Checkout criado.",
    )


@router.get("/me", response_model=ApiResponse[SubscriptionRead | None])
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[SubscriptionRead | None]:
    subscription = SubscriptionService(db).get_effective(current_user)
    if not subscription:
        return success_response(None)
    return success_response(SubscriptionRead.model_validate(subscription))


@router.post("/change-plan", response_model=ApiResponse[SubscriptionRead])
def change_plan(
    payload: ChangePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SubscriptionRead]:
    subscription = SubscriptionService(db).change_plan(current_user, new_cycle=PlanCycle(payload.cycle))
    return success_response(SubscriptionRead.model_validate(subscription), "Plano alterado.")


@router.post("/cancel", response_model=ApiResponse[SubscriptionRead])
def cancel(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[SubscriptionRead]:
    subscription = SubscriptionService(db).cancel(current_user)
    return success_response(SubscriptionRead.model_validate(subscription), "Assinatura cancelada.")


@router.post("/webhook", status_code=200)
async def webhook(request: Request, response: Response, db: Session = Depends(get_db)) -> dict:
    # Publica (Mercado Pago -> nos): sem cookie de sessao, sem CSRF (o middleware global e
    # no-op sem cookie `access_token`), autenticada por assinatura HMAC (`x-signature`) quando
    # MERCADOPAGO_WEBHOOK_SECRET esta configurado.
    try:
        payload = await request.json()
    except ValueError:
        return {"success": True}

    try:
        SubscriptionService(db).handle_webhook(payload, dict(request.headers))
    except AppError:
        raise
    except Exception:
        logger.exception("Falha ao processar webhook do Mercado Pago")
        response.status_code = 200  # sempre 2xx pro MP nao ficar reentregando indefinidamente
    return {"success": True}
