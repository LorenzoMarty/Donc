from __future__ import annotations

import re

from src.agents.base import AgnoAgentRunner
from src.agents.schemas import EliminationGateOutput, PreProcessorOutput
from src.prompts.agent_instructions import ELIMINATION_GATE_INSTRUCTIONS


class EliminationGateAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def evaluate(
        self,
        theme: str,
        content: str,
        preprocessor: PreProcessorOutput,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> EliminationGateOutput:
        fallback = self._fallback(content=content, preprocessor=preprocessor)
        prompt = f"""Tema: {theme}
Metadados: palavras={preprocessor.word_count}, paragrafos={preprocessor.paragraph_count}
Redacao:
{content}"""
        return self.runner.run_structured(
            agent_name="EliminationGateAgent",
            description="Triagem eliminatória: detecta ZERO, DESVIO_GRAVE, TANGENCIAMENTO ou APPROVED.",
            instructions=ELIMINATION_GATE_INSTRUCTIONS,
            prompt=prompt,
            output_schema=EliminationGateOutput,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, content: str, preprocessor: PreProcessorOutput) -> EliminationGateOutput:
        dh_pattern = r"\b(exterminar|eliminar|matar|torturar|violencia contra|retirar direitos)\b"
        if re.search(dh_pattern, content, re.I):
            return EliminationGateOutput(
                status="ZERO",
                reason="Conteúdo com violação explícita de direitos humanos.",
                zero_rule="dh_explicita",
            )
        if preprocessor.word_count < 80 or preprocessor.paragraph_count < 2:
            return EliminationGateOutput(
                status="ZERO",
                reason="Texto insuficiente para avaliação.",
                zero_rule="sem_condicoes",
            )
        if not preprocessor.has_minimum_structure:
            return EliminationGateOutput(
                status="DESVIO_GRAVE",
                reason="Texto sem estrutura mínima dissertativo-argumentativa.",
            )
        return EliminationGateOutput(
            status="APPROVED",
            reason="Texto aprovado para análise completa.",
        )
