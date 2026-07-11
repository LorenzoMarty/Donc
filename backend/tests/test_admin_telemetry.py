from datetime import datetime, timezone

from src.config.settings import settings
from src.database.session import SessionLocal
from src.models import AIInteractionLog
from src.services.admin_telemetry_service import AdminTelemetryService


def test_admin_ai_telemetry_uses_configured_token_cost(client, monkeypatch):  # noqa: ARG001
    monkeypatch.setattr(settings, "ai_cost_cents_per_1k_tokens", 2.5)
    db = SessionLocal()
    try:
        db.add(
            AIInteractionLog(
                workflow="test_workflow",
                agent="TestAgent",
                status="success",
                latency_ms=100,
                token_count=2000,
                cost_estimate=0,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

        telemetry = AdminTelemetryService(db).ai_telemetry(period_days=1)
    finally:
        db.close()

    assert telemetry.total_tokens >= 2000
    assert telemetry.cost_usd_cents >= 5
    agent = next(item for item in telemetry.agents if item.agent == "TestAgent")
    assert agent.cost_usd_cents == 5
