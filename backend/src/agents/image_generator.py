from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from src.config.settings import settings

logger = logging.getLogger("src.agents.image_generator")


@dataclass
class ImageGenMeta:
    status: str
    latency_ms: int
    error: str | None = None
    model: str | None = None


def generate_supporting_image(prompt: str) -> tuple[str | None, ImageGenMeta]:
    """Gera uma imagem (charge/tirinha) a partir de uma descricao visual.

    Retorna (data_url, meta). Sem API key ou em caso de falha, retorna (None, meta_com_erro) —
    o caller mantem image_url=None e o frontend cai no fallback textual (mesmo padrao de
    degradacao graciosa do AgnoAgentRunner)."""

    start = time.perf_counter()
    model = settings.openai_image_model

    if not settings.openai_api_key:
        return None, ImageGenMeta(status="fallback", latency_ms=0, error="openai_api_key_missing", model=model)

    try:
        from openai import OpenAI
    except Exception as exc:
        return None, ImageGenMeta(status="fallback", latency_ms=0, error=f"openai_import_failed: {exc}", model=model)

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.images.generate(model=model, prompt=prompt, size="1024x1024", n=1)
        b64 = response.data[0].b64_json
        latency_ms = int((time.perf_counter() - start) * 1000)
        if not b64:
            return None, ImageGenMeta(status="fallback", latency_ms=latency_ms, error="empty_image_response", model=model)
        return f"data:image/png;base64,{b64}", ImageGenMeta(status="success", latency_ms=latency_ms, model=model)
    except Exception as exc:
        latency_ms = int((time.perf_counter() - start) * 1000)
        logger.warning("Falha ao gerar imagem de apoio (%s).", exc, exc_info=True)
        return None, ImageGenMeta(status="fallback", latency_ms=latency_ms, error=str(exc), model=model)
