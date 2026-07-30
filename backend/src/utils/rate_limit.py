from __future__ import annotations

import logging
import time

from src.config.settings import settings
from src.middlewares.errors import AppError

logger = logging.getLogger("src.utils.rate_limit")

_memory_counters: dict[str, tuple[int, int]] = {}


def check_ai_rate_limit(user_id: int) -> None:
    limit = settings.ai_rate_limit_per_minute
    if limit <= 0:
        return
    minute = int(time.time() // 60)
    key = f"ai-rate:{user_id}:{minute}"
    count = _increment_redis(key) or _increment_memory(key, minute)
    if count > limit:
        raise AppError("Limite de uso de IA atingido. Aguarde alguns instantes.", status_code=429, code="rate_limited")


def _increment_redis(key: str) -> int | None:
    try:
        import redis

        client = redis.from_url(settings.redis_url, socket_connect_timeout=0.2, socket_timeout=0.2)
        count = int(client.incr(key))
        if count == 1:
            client.expire(key, 70)
        return count
    except Exception as exc:
        # Fallback e o contador em memoria do processo (nao compartilhado entre
        # replicas) — se o Redis cair, o rate limit de IA fica menos efetivo, e isso
        # precisa aparecer nos logs em vez de falhar silenciosamente.
        logger.warning("Falha ao incrementar rate limit no Redis (key=%s, caindo para contador em memoria): %s: %s", key, type(exc).__name__, exc)
        return None


def _increment_memory(key: str, minute: int) -> int:
    stale = [item_key for item_key, (_, item_minute) in _memory_counters.items() if item_minute != minute]
    for item_key in stale:
        _memory_counters.pop(item_key, None)
    count, _ = _memory_counters.get(key, (0, minute))
    count += 1
    _memory_counters[key] = (count, minute)
    return count

