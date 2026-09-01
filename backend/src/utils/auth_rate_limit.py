from __future__ import annotations

import logging
import time

from fastapi import Request

from src.config.settings import settings
from src.middlewares.errors import AppError


logger = logging.getLogger("src.utils.auth_rate_limit")
_memory_counters: dict[str, tuple[int, int]] = {}


def check_auth_rate_limit(request: Request, *, bucket: str, identifier: str = "") -> None:
    limit = settings.auth_rate_limit_per_minute
    if limit <= 0:
        return
    minute = int(time.time() // 60)
    client_host = request.client.host if request.client else "unknown"
    normalized_identifier = identifier.strip().lower() or "anonymous"
    key = f"auth-rate:{bucket}:{client_host}:{normalized_identifier}:{minute}"
    count = _increment_redis(key) or _increment_memory(key, minute)
    if count > limit:
        raise AppError("Muitas tentativas. Aguarde um momento e tente novamente.", status_code=429, code="rate_limit_exceeded")


def _increment_redis(key: str) -> int | None:
    try:
        import redis

        client = redis.from_url(settings.redis_url, socket_connect_timeout=0.2, socket_timeout=0.2)
        count = int(client.incr(key))
        if count == 1:
            client.expire(key, 70)
        return count
    except Exception as exc:
        logger.warning("Falha ao incrementar rate limit de auth no Redis (key=%s): %s: %s", key, type(exc).__name__, exc)
        return None


def _increment_memory(key: str, minute: int) -> int:
    stale = [item_key for item_key, (_, item_minute) in _memory_counters.items() if item_minute != minute]
    for item_key in stale:
        _memory_counters.pop(item_key, None)
    count, _ = _memory_counters.get(key, (0, minute))
    count += 1
    _memory_counters[key] = (count, minute)
    return count
