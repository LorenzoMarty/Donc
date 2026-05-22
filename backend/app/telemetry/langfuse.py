from __future__ import annotations

from app.core.config import settings


def configure_ai_telemetry() -> bool:
    if not (settings.langfuse_public_key and settings.langfuse_secret_key and settings.langfuse_host):
        return False
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider

        provider = TracerProvider()
        trace.set_tracer_provider(provider)
        return True
    except Exception:
        return False

