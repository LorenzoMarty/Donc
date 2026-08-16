from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# Schemas de saida estruturada da IA pra cada engine nao-quiz (ver GamePayloadEditor no
# frontend) — um item novo por vez (rodada/caso/escada), anexado ao `payload` existente do jogo,
# no mesmo espirito de "gerar mais perguntas" que ja existe pros engines question-based.


class OrderRoundGen(BaseModel):
    instruction: str = Field(min_length=10, max_length=300)
    items: list[str] = Field(min_length=3, max_length=6, description="Itens na ordem correta.")
    explanation: str = Field(min_length=10, max_length=400)


class OrderGenerationResult(BaseModel):
    rounds: list[OrderRoundGen] = Field(min_length=1, max_length=5)


class FillBlankRoundGen(BaseModel):
    prompt: str = Field(min_length=10, max_length=400, description="Use ___ pra marcar a lacuna.")
    accepted: list[str] = Field(min_length=1, max_length=4, description="Respostas aceitas pra lacuna.")
    explanation: str = Field(min_length=10, max_length=400)


class FillBlankGenerationResult(BaseModel):
    rounds: list[FillBlankRoundGen] = Field(min_length=1, max_length=5)


class DuelRoundGen(BaseModel):
    context: str = Field(min_length=5, max_length=200)
    a: str = Field(min_length=10, max_length=500, description="Versao A do trecho.")
    b: str = Field(min_length=10, max_length=500, description="Versao B do trecho.")
    winner: Literal["a", "b"]
    dimension: str = Field(min_length=3, max_length=120, description="Dimensao decisiva, ex: progressao, naturalidade.")
    explanation: str = Field(min_length=10, max_length=400)


class DuelGenerationResult(BaseModel):
    rounds: list[DuelRoundGen] = Field(min_length=1, max_length=5)


class EscalationOptionGen(BaseModel):
    text: str = Field(min_length=3, max_length=300)
    correct: bool
    note: str = Field(default="", max_length=300)


class EscalationRungGen(BaseModel):
    level: int = Field(ge=1, le=5)
    instruction: str = Field(min_length=5, max_length=300)
    options: list[EscalationOptionGen] = Field(min_length=2, max_length=4)


class EscalationLadderGen(BaseModel):
    theme: str = Field(min_length=3, max_length=150)
    rungs: list[EscalationRungGen] = Field(min_length=2, max_length=4, description="Niveis 1..N, dificuldade crescente.")


class EscalationGenerationResult(BaseModel):
    ladders: list[EscalationLadderGen] = Field(min_length=1, max_length=3)


class ArtificialityRoundGen(BaseModel):
    passage: str = Field(min_length=20, max_length=600)
    verdict: Literal["humano", "artificial"]
    explanation: str = Field(min_length=10, max_length=400)


class ArtificialityGenerationResult(BaseModel):
    rounds: list[ArtificialityRoundGen] = Field(min_length=1, max_length=5)


class CorrectorCandidateGen(BaseModel):
    label: str = Field(min_length=5, max_length=200, description="Descricao curta do problema candidato.")
    competency: Literal["C1", "C2", "C3", "C4", "C5"]
    present: bool = Field(description="Se esse problema de fato ocorre no paragrafo abaixo.")


class CorrectorCaseGen(BaseModel):
    paragraph: str = Field(min_length=40, max_length=800, description="Paragrafo de redacao a ser diagnosticado.")
    candidates: list[CorrectorCandidateGen] = Field(min_length=3, max_length=6)


class CorrectorGenerationResult(BaseModel):
    cases: list[CorrectorCaseGen] = Field(min_length=1, max_length=3)


class EssayCollapseRoundGen(BaseModel):
    brief: str = Field(min_length=10, max_length=300, description="Contexto/proposta do paragrafo a montar.")
    fragments: list[str] = Field(min_length=3, max_length=6, description="Fragmentos na ordem correta de montagem.")
    explanation: str = Field(min_length=10, max_length=400)


class EssayCollapseGenerationResult(BaseModel):
    rounds: list[EssayCollapseRoundGen] = Field(min_length=1, max_length=3)


class SurgeryOptionGen(BaseModel):
    text: str = Field(min_length=3, max_length=300)
    grade: Literal["S", "A", "B", "C", "Fraco"]
    note: str = Field(default="", max_length=300)


class SurgerySegmentGen(BaseModel):
    kind: Literal["text", "choice"]
    text: str | None = Field(default=None, max_length=400, description="Preenchido quando kind=text.")
    options: list[SurgeryOptionGen] | None = Field(default=None, description="Preenchido quando kind=choice.")


class SurgeryCaseGen(BaseModel):
    brief: str = Field(min_length=10, max_length=300)
    segments: list[SurgerySegmentGen] = Field(min_length=2, max_length=6)


class SurgeryGenerationResult(BaseModel):
    cases: list[SurgeryCaseGen] = Field(min_length=1, max_length=3)


class ClassifyItemGen(BaseModel):
    text: str = Field(min_length=3, max_length=300)
    bucket: str = Field(description="Deve ser exatamente um dos rotulos em `buckets`.")


class ClassifyGenerationResult(BaseModel):
    buckets: list[str] = Field(min_length=2, max_length=6, description="Rotulos completos dos baldes — reusa os existentes se houver.")
    items: list[ClassifyItemGen] = Field(min_length=3, max_length=10)
