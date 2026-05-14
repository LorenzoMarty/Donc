from __future__ import annotations

import hashlib
import re

from openai import OpenAI
from pydantic import BaseModel, Field

from app.core.config import settings


class EssayAIResult(BaseModel):
    total_score: int = Field(ge=0, le=1000)
    competency_1: int = Field(ge=0, le=200)
    competency_2: int = Field(ge=0, le=200)
    competency_3: int = Field(ge=0, le=200)
    competency_4: int = Field(ge=0, le=200)
    competency_5: int = Field(ge=0, le=200)
    strengths: list[str] = Field(min_length=1)
    errors: list[str] = Field(min_length=1)
    suggestions: list[str] = Field(min_length=1)
    feedback: str = Field(min_length=20)
    recurrent_patterns: list[str] = Field(default_factory=list)


class EssayAIService:
    def __init__(self) -> None:
        self.model = settings.openai_model
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        self._cache: dict[str, EssayAIResult] = {}

    def correct(self, *, theme: str, context: str, content: str) -> EssayAIResult:
        cache_key = self._cache_key(theme, content)
        if cache_key in self._cache:
            return self._cache[cache_key]

        result = self._fallback(theme=theme, content=content)
        if self.client:
            try:
                result = self._correct_with_openai(theme=theme, context=context, content=content)
            except Exception:
                result = self._fallback(theme=theme, content=content)

        self._cache[cache_key] = result
        return result

    def _correct_with_openai(self, *, theme: str, context: str, content: str) -> EssayAIResult:
        system = (
            "Voce e um corretor especialista em redacao do ENEM. Avalie exclusivamente pelo padrao ENEM, "
            "com notas de 0 a 200 para cada uma das cinco competencias. Seja exigente, pedagogico e pratico. "
            "A resposta deve ser util para estudo, com feedback humanizado e sugestoes acionaveis."
        )
        user = (
            f"Tema: {theme}\n\nTextos motivadores/resumo do recorte: {context}\n\n"
            f"Redacao do estudante:\n{content}"
        )
        response = self.client.responses.parse(
            model=self.model,
            input=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            text_format=EssayAIResult,
        )
        parsed = getattr(response, "output_parsed", None)
        if parsed:
            return parsed

        for output in getattr(response, "output", []):
            for item in getattr(output, "content", []):
                item_parsed = getattr(item, "parsed", None)
                if item_parsed:
                    return item_parsed
        raise RuntimeError("OpenAI response did not include a parsed correction.")

    def _fallback(self, *, theme: str, content: str) -> EssayAIResult:
        words = re.findall(r"\b[\wÀ-ÿ'-]+\b", content)
        paragraphs = [p for p in content.split("\n") if p.strip()]
        connectors = len(re.findall(r"\b(portanto|ademais|contudo|entretanto|assim|desse modo|além disso|logo)\b", content, re.I))
        intervention_terms = len(re.findall(r"\b(governo|escola|midia|familia|sociedade|medida|proposta|intervencao|intervenção)\b", content, re.I))

        length_score = 200 if len(words) >= 260 else max(80, int(len(words) / 260 * 200))
        structure_score = 200 if len(paragraphs) >= 4 else 120 + len(paragraphs) * 20
        connector_score = min(200, 120 + connectors * 18)
        intervention_score = min(200, 110 + intervention_terms * 18)
        argument_score = min(200, int((length_score + structure_score) / 2))

        c1 = self._round_competency(length_score)
        c2 = self._round_competency(structure_score)
        c3 = self._round_competency(argument_score)
        c4 = self._round_competency(connector_score)
        c5 = self._round_competency(intervention_score)
        total = c1 + c2 + c3 + c4 + c5

        return EssayAIResult(
            total_score=total,
            competency_1=c1,
            competency_2=c2,
            competency_3=c3,
            competency_4=c4,
            competency_5=c5,
            strengths=[
                "O texto se mantem conectado ao tema proposto.",
                "Ha tentativa clara de organizar tese, argumentos e fechamento.",
            ],
            errors=[
                "Revise desvios de norma-padrao e pontuacao antes da versao final.",
                "A proposta de intervencao pode detalhar melhor agente, acao, meio e finalidade.",
            ],
            suggestions=[
                "Inclua repertorio sociocultural especifico e conectado ao argumento central.",
                "Use conectivos entre paragrafos para tornar a progressao argumentativa mais visivel.",
                "Finalize com uma intervencao completa: agente, acao, modo, efeito e detalhamento.",
            ],
            feedback=(
                f"Sua redacao sobre '{theme}' apresenta uma base promissora. Para elevar a nota, fortaleça "
                "a progressao dos argumentos, detalhe melhor a intervencao e faca uma revisao final focada em clareza."
            ),
            recurrent_patterns=["intervencao pouco detalhada", "coesao interparagrafal a melhorar"],
        )

    def _cache_key(self, theme: str, content: str) -> str:
        return hashlib.sha256(f"{theme}:{content}".encode("utf-8")).hexdigest()

    def _round_competency(self, value: int) -> int:
        value = max(0, min(200, value))
        return int(round(value / 40) * 40)

