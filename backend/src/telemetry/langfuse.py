from __future__ import annotations

import base64

from src.config.settings import settings


_configured = False


def configure_ai_telemetry() -> bool:
    global _configured
    if _configured:
        return True
    if not (settings.langfuse_public_key and settings.langfuse_secret_key and settings.langfuse_host):
        return False
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except Exception:
        return False

    try:
        auth = base64.b64encode(f"{settings.langfuse_public_key}:{settings.langfuse_secret_key}".encode("utf-8")).decode("ascii")
        exporter = OTLPSpanExporter(
            endpoint=_langfuse_trace_endpoint(settings.langfuse_host),
            headers={
                "Authorization": f"Basic {auth}",
                "x-langfuse-ingestion-version": "4",
            },
        )
        provider = TracerProvider(
            resource=Resource.create(
                {
                    "service.name": settings.project_name,
                    "deployment.environment": settings.environment,
                    "langfuse.environment": settings.environment,
                }
            )
        )
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        _configured = True
        return True
    except Exception:
        return False


def _langfuse_trace_endpoint(host: str) -> str:
    normalized = host.rstrip("/")
    if normalized.endswith("/v1/traces"):
        return normalized
    if normalized.endswith("/api/public/otel"):
        return f"{normalized}/v1/traces"
    return f"{normalized}/api/public/otel/v1/traces"
