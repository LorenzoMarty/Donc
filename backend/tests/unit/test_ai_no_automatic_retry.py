"""P2b Bloco 3 (REQ-10) — nenhum retry automatico de IA existe hoje; se algum dia for adicionado,
precisa ser limitado e nunca disparar em paralelo com uma tentativa ainda em voo. Este teste
documenta e protege o estado atual (sem retry automatico == constraint trivialmente satisfeita)
contra uma regressao silenciosa (ex.: alguem adiciona `autoretry_for`/`max_retries` sem tambem
adicionar o guard-rail de custo)."""

from __future__ import annotations

import pytest

from src.queues.tasks import correct_essay_task

pytestmark = pytest.mark.unit


def test_correct_essay_task_has_no_automatic_retry_configured():
    if correct_essay_task is None:
        pytest.skip("Celery indisponivel nesta configuracao — sem task registrada.")
    assert not getattr(correct_essay_task, "autoretry_for", None)
