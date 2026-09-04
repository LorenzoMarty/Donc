"""Paridade entre listas espelhadas a mao no backend e no frontend.

Varias constantes existem em pares fisicamente separados (Python de um lado, TypeScript do
outro) sem geracao de codigo compartilhada nem validacao automatica — cada uma tem comentario
no proprio codigo apontando pra sua contraparte, mas nada falha se alguem editar so um lado.
Divergencia aqui vira 422 silencioso (onboarding) ou hub/evento rejeitado sem aviso (jogos).
Estes testes fazem parsing textual simples do arquivo TS correspondente (sem precisar de
toolchain JS) so pra travar esse contrato. Se a forma do arquivo TS mudar de um jeito que quebre
o regex, o teste falha "por falso negativo" — nesse caso, ajuste o regex, nao remova o teste.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from src.memory.cognitive_issues import EVENT_DIRECTION, HUB_TO_ISSUE
from src.schemas.auth import ONBOARDING_GOALS, ONBOARDING_LEVELS

pytestmark = pytest.mark.unit

_REPO_ROOT = Path(__file__).resolve().parents[3]
_FRONTEND_SRC = _REPO_ROOT / "frontend" / "src"


def _read(relative_path: str) -> str:
    path = _FRONTEND_SRC / relative_path
    if not path.exists():
        pytest.skip(f"arquivo frontend nao encontrado (layout do repo mudou?): {path}")
    return path.read_text(encoding="utf-8")


def test_hub_ids_match_frontend_symptoms():
    text = _read("features/gamification/symptoms.ts")
    hub_block_match = re.search(r"export const HUBS.*?=\s*\{(.*?)\n\};", text, re.DOTALL)
    assert hub_block_match, "nao encontrei o bloco `export const HUBS = {...}` em symptoms.ts"
    frontend_hub_ids = set(re.findall(r'^\s*"([a-z0-9-]+)":\s*\{', hub_block_match.group(1), re.MULTILINE))
    assert frontend_hub_ids, "regex nao capturou nenhum hub id — provavelmente o formato do arquivo mudou"
    assert frontend_hub_ids == set(HUB_TO_ISSUE.keys()), (
        "Hubs divergem entre frontend/src/features/gamification/symptoms.ts (HUBS) e "
        "backend/src/memory/cognitive_issues.py (HUB_TO_ISSUE)."
    )


def test_cognitive_events_match_frontend_types():
    text = _read("features/gamification/types.ts")
    event_block_match = re.search(r"CognitiveEvent\s*=\s*(.*?);", text, re.DOTALL)
    assert event_block_match, "nao encontrei o type `CognitiveEvent` em types.ts"
    frontend_events = set(re.findall(r'"([A-Z_]+)"', event_block_match.group(1)))
    assert frontend_events, "regex nao capturou nenhum evento — provavelmente o formato do arquivo mudou"
    assert frontend_events == set(EVENT_DIRECTION.keys()), (
        "Eventos cognitivos divergem entre frontend/src/features/gamification/types.ts "
        "(CognitiveEvent) e backend/src/memory/cognitive_issues.py (EVENT_DIRECTION)."
    )


def test_onboarding_goal_ids_match_frontend_page():
    text = _read("app/(app)/onboarding/page.tsx")
    goals_block_match = re.search(r"const GOALS\s*=\s*\[(.*?)\n\];", text, re.DOTALL)
    assert goals_block_match, "nao encontrei `const GOALS = [...]` em onboarding/page.tsx"
    frontend_goals = set(re.findall(r'id:\s*"([^"]+)"', goals_block_match.group(1)))
    assert frontend_goals, "regex nao capturou nenhum goal id — provavelmente o formato do arquivo mudou"
    assert frontend_goals == ONBOARDING_GOALS, (
        "Goals de onboarding divergem entre frontend/src/app/(app)/onboarding/page.tsx (GOALS) e "
        "backend/src/schemas/auth.py (ONBOARDING_GOALS)."
    )


def test_onboarding_level_ids_match_frontend_page():
    text = _read("app/(app)/onboarding/page.tsx")
    levels_block_match = re.search(r"const LEVELS\s*=\s*\[(.*?)\n\];", text, re.DOTALL)
    assert levels_block_match, "nao encontrei `const LEVELS = [...]` em onboarding/page.tsx"
    frontend_levels = set(re.findall(r'id:\s*"([^"]+)"', levels_block_match.group(1)))
    assert frontend_levels, "regex nao capturou nenhum level id — provavelmente o formato do arquivo mudou"
    assert frontend_levels == ONBOARDING_LEVELS, (
        "Levels de onboarding divergem entre frontend/src/app/(app)/onboarding/page.tsx (LEVELS) e "
        "backend/src/schemas/auth.py (ONBOARDING_LEVELS)."
    )
