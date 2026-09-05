"""Gate de assinatura (REQ-11) e bypass de ADMIN (REQ-6) na aplicacao FastAPI real — a logica
pura ja e coberta em tests/unit/test_subscription_status.py, isto verifica a fiacao real em
src/main.py (dependencies=[Depends(require_active_subscription)] nos routers protegidos)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config.security import get_password_hash
from src.database.session import get_db
from src.dependencies import get_current_user, require_active_subscription
from src.main import app
from src.models import PlanCycle, SubscriptionStatus, User, UserRole
from src.models.subscription import Subscription
from tests.conftest import override_current_user

pytestmark = pytest.mark.integration


@pytest.fixture()
def restore_subscription_gate():
    # As demais suites dependem do bypass global (conftest.py) — este arquivo o remove so
    # durante o teste, pra exercitar o gate real, e sempre restaura no finally.
    del app.dependency_overrides[require_active_subscription]
    yield
    app.dependency_overrides[require_active_subscription] = override_current_user


def test_student_without_subscription_is_blocked(client: TestClient, restore_subscription_gate):
    response = client.get("/api/v1/dashboard")
    assert response.status_code == 402
    assert response.json()["error"] == "subscription_required"


def test_student_with_active_subscription_is_allowed(client: TestClient, restore_subscription_gate):
    from src.database.session import SessionLocal

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        db.add(
            Subscription(
                user_id=user.id,
                cycle=PlanCycle.MONTHLY,
                status=SubscriptionStatus.ACTIVE,
                price_charged_cents=5_900,
                current_period_end=datetime.now(UTC) + timedelta(days=10),
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.get("/api/v1/dashboard")
    assert response.status_code == 200


def test_admin_bypasses_subscription_gate(client: TestClient, restore_subscription_gate):
    from src.database.session import SessionLocal

    db = SessionLocal()
    try:
        admin = User(name="Admin", email="admin-gate-test@teste.com", hashed_password=get_password_hash("12345678"), role=UserRole.ADMIN)
        db.add(admin)
        db.commit()
        db.refresh(admin)
        admin_id = admin.id
    finally:
        db.close()

    def override_admin(db: Session = Depends(get_db)) -> User:
        return db.get(User, admin_id)

    app.dependency_overrides[get_current_user] = override_admin
    try:
        response = client.get("/api/v1/dashboard")
        assert response.status_code == 200
    finally:
        app.dependency_overrides[get_current_user] = override_current_user


def test_webhook_endpoint_is_public_and_ignores_unknown_payload(client: TestClient):
    response = client.post("/api/v1/subscriptions/webhook", json={"type": "test", "data": {}})
    assert response.status_code == 200
