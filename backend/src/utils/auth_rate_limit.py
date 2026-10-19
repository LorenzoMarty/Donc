from __future__ import annotations

import logging
import time

from fastapi import Request

from src.config.settings import settings
from src.middlewares.errors import AppError
from src.utils.client_ip import client_ip


logger = logging.getLogger("src.utils.auth_rate_limit")
_memory_counters: dict[str, tuple[int, int]] = {}
# Contadores diarios ficam separados: o expurgo por minuto de `_increment_memory` apagaria estes.
_daily_counters: dict[str, tuple[int, int]] = {}


def check_auth_rate_limit(request: Request, *, bucket: str, identifier: str = "") -> None:
    limit = settings.auth_rate_limit_per_minute
    if limit <= 0:
        return
    minute = int(time.time() // 60)
    client_host = client_ip(request)
    normalized_identifier = identifier.strip().lower() or "anonymous"
    key = f"auth-rate:{bucket}:{client_host}:{normalized_identifier}:{minute}"
    count = _increment_redis(key) or _increment_memory(key, minute)
    if count > limit:
        raise AppError("Muitas tentativas. Aguarde um momento e tente novamente.", status_code=429, code="rate_limit_exceeded")


def check_daily_ip_limit(request: Request, *, bucket: str, limit: int) -> None:
    """Teto de acoes por IP em 24h (ex.: contas novas). `limit <= 0` desliga."""
    if limit <= 0:
        return
    day = int(time.time() // 86400)
    key = f"auth-daily:{bucket}:{client_ip(request)}:{day}"
    count = _increment_redis(key, ttl=90000) or _increment_daily_memory(key, day)
    if count > limit:
        raise AppError(
            "Muitas contas criadas a partir desta rede hoje. Tente novamente amanhã ou fale com o suporte.",
            status_code=429,
            code="signup_limit_exceeded",
        )


def _increment_redis(key: str, ttl: int = 70) -> int | None:
    try:
        import redis

        client = redis.from_url(settings.redis_url, socket_connect_timeout=0.2, socket_timeout=0.2)
        count = int(client.incr(key))
        if count == 1:
            client.expire(key, ttl)
        return count
    except Exception as exc:
        logger.warning("Falha ao incrementar rate limit de auth no Redis (key=%s): %s: %s", key, type(exc).__name__, exc)
        return None


def _increment_daily_memory(key: str, day: int) -> int:
    for stale in [item_key for item_key, (_, item_day) in _daily_counters.items() if item_day != day]:
        _daily_counters.pop(stale, None)
    count, _ = _daily_counters.get(key, (0, day))
    count += 1
    _daily_counters[key] = (count, day)
    return count


def _increment_memory(key: str, minute: int) -> int:
    stale = [item_key for item_key, (_, item_minute) in _memory_counters.items() if item_minute != minute]
    for item_key in stale:
        _memory_counters.pop(item_key, None)
    count, _ = _memory_counters.get(key, (0, minute))
    count += 1
    _memory_counters[key] = (count, minute)
    return count
