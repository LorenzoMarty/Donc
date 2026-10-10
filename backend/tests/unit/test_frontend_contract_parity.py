"""Paridade de nomes de campo entre os tipos TS de `frontend/src/types/api.ts` e os schemas Pydantic
de redacao — o contrato e escrito a mao nos dois lados, entao um campo novo/renomeado so de um
lado passaria despercebido (o TS nao quebra, o Pydantic nao reclama)."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from src.schemas.essays import (
    EssayCorrectionRead,
    EssayRead,
    EssaySubmitResponse,
    EssayThemeRead,
    EssayVersionRead,
    JobStatusRead,
)

pytestmark = pytest.mark.unit

API_TS = Path(__file__).resolve().parents[3] / "frontend" / "src" / "types" / "api.ts"

PAIRS = [
    ("Essay", EssayRead),
    ("EssayTheme", EssayThemeRead),
    ("EssayCorrection", EssayCorrectionRead),
    ("EssayVersion", EssayVersionRead),
    ("EssaySubmitResponse", EssaySubmitResponse),
    ("JobStatus", JobStatusRead),
]


def _ts_fields(source: str, type_name: str) -> set[str]:
    match = re.search(rf"export type {type_name} = \{{\n(.*?)\n\}};", source, re.DOTALL)
    assert match, f"tipo {type_name} nao encontrado em api.ts"
    return set(re.findall(r"^  (\w+)\??:", match.group(1), re.MULTILINE))


@pytest.mark.parametrize(("ts_name", "schema"), PAIRS, ids=[name for name, _ in PAIRS])
def test_ts_type_has_same_fields_as_pydantic_schema(ts_name: str, schema: type) -> None:
    if not API_TS.exists():
        pytest.skip("frontend/ ausente (backend isolado)")
    assert _ts_fields(API_TS.read_text(encoding="utf-8"), ts_name) == set(schema.model_fields)
