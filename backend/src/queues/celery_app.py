from __future__ import annotations

from src.config.settings import settings

try:
    from celery import Celery

    celery_app = Celery(
        "donc_ai",
        broker=settings.redis_url,
        backend=settings.redis_url,
        include=["src.queues.tasks"],
    )
    celery_app.conf.task_track_started = True
    celery_app.conf.result_expires = 3600
    # Correcao de redacao (unica task real, src/queues/tasks.py) roda EliminationGateAgent
    # sequencial e so depois os 6 analisadores em paralelo (correction.py) — nao e 1 chamada de IA,
    # sao 2 estagios. Cada chamada individual pode levar ate ~91.5s no pior caso (2 tentativas de
    # settings.ai_sync_timeout_seconds=45s + backoff, ver agents/base.py::_RETRY_ATTEMPTS_PER_MODEL)
    # antes de trocar pro modelo de fallback e tentar de novo — outros ~91.5s. Pior caso real da
    # pipeline inteira: ~183s (gate) + ~183s (o mais lento dos 6 analisadores em paralelo) = ~366s.
    # Limite antigo (120s/100s) matava o worker via SIGKILL bem antes disso, sem excecao tratada,
    # sem telemetria, deixando o job preso em "running" ate o expire_stale_job (jobs.py) resolver.
    # Margem generosa aqui: e o unico jeito de virar excecao tratada (job marcado failed com causa)
    # em vez de kill silencioso — o custo (worker preso por ate 7min no cenario raro de degradacao
    # total da API) e aceitavel porque esse cenario ja e uma falha de infra externa, nao o caminho
    # comum.
    celery_app.conf.task_time_limit = 420
    celery_app.conf.task_soft_time_limit = 400
except Exception:
    celery_app = None
