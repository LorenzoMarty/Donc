from __future__ import annotations

import logging
from typing import Any

from src.config.settings import settings


logger = logging.getLogger("src.telemetry")

_client: Any | None = None
_configured = False


def _mask_pii(data: Any, **_: Any) -> Any:
    """Mascara texto livre antes de enviar ao Langfuse.

    Decisao de privacidade: redacoes e correcoes sao PII do aluno. Toda string
    (input/output/metadata textual — inclui prompt e resposta do LLM) e redigida.
    Numeros, booleans e a estrutura (chaves de dict) sao preservados, assim como
    nome do span, modelo, tokens, custo e latencia (atributos OTel, fora do mask).
    """
    if isinstance(data, str):
        return "[REDACTED]" if data else data
    if isinstance(data, dict):
        return {key: _mask_pii(value) for key, value in data.items()}
    if isinstance(data, (list, tuple)):
        return [_mask_pii(item) for item in data]
    return data


def configure_ai_telemetry() -> bool:
    """Inicializa o cliente Langfuse (SDK v4) e instrumenta o agno via OpenLIT.

    Degradacao graciosa: sem credenciais ou sem libs instaladas, retorna False e
    a aplicacao segue sem tracing. Idempotente.
    """
    global _client, _configured
    if _configured:
        return _client is not None
    _configured = True

    if not (settings.langfuse_public_key and settings.langfuse_secret_key and settings.langfuse_host):
        logger.info("Langfuse desabilitado: credenciais ausentes.")
        return False

    try:
        from langfuse import Langfuse
    except Exception as exc:  # pragma: no cover - depende de dependencia opcional
        logger.warning("Langfuse indisponivel (import falhou): %s", exc)
        return False

    try:
        client = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
            environment=settings.environment,
            release=settings.project_name,
            mask=_mask_pii,
        )
    except Exception as exc:  # pragma: no cover - falha de telemetria nunca bloqueia o app
        logger.warning("Falha ao inicializar Langfuse: %s", exc)
        return False

    _instrument_agno(client)
    _client = client
    logger.info("Langfuse tracing ativo (environment=%s).", settings.environment)
    return True


def _instrument_agno(client: Any) -> None:
    """Auto-instrumenta o framework agno/OpenAI via OpenLIT, exportando para o
    tracer do Langfuse. Captura modelo, tokens, custo, prompt/resposta e tool
    calls automaticamente — best practice do skill (preferir integracao nativa).
    """
    try:
        import openlit

        openlit.init(tracer=client._otel_tracer, disable_batch=False)
    except Exception as exc:  # pragma: no cover - sem openlit, spans manuais ainda funcionam
        logger.warning("OpenLIT indisponivel; tracing automatico do agno desativado: %s", exc)


def get_ai_telemetry_client() -> Any | None:
    """Retorna o cliente Langfuse configurado, ou None se tracing estiver off."""
    return _client


def flush_ai_telemetry() -> None:
    """Forca o envio dos spans em buffer. Seguro chamar mesmo sem tracing."""
    if _client is not None:
        try:
            _client.flush()
        except Exception as exc:  # pragma: no cover
            logger.warning("Falha ao dar flush no Langfuse: %s", exc)
