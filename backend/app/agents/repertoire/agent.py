from __future__ import annotations

import re

from app.agents.base import AgnoAgentRunner
from app.agents.schemas import RepertoireAnalysis
from app.prompts.agent_instructions import REPERTOIRE_INSTRUCTIONS


class RepertoireAgent:
    KNOWN_REPERTOIRES = {
        "constituicao": "Constituicao Federal de 1988",
        "durkheim": "Emile Durkheim",
        "bauman": "Zygmunt Bauman",
        "freire": "Paulo Freire",
        "aristoteles": "Aristoteles",
        "kant": "Immanuel Kant",
        "foucault": "Michel Foucault",
        "ibge": "Dados do IBGE",
        "onu": "ONU",
        "unesco": "UNESCO",
    }

    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def analyze(
        self,
        *,
        theme: str,
        content: str,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> RepertoireAnalysis:
        fallback = self._fallback(theme=theme, content=content)
        prompt = f"""
{REPERTOIRE_INSTRUCTIONS}

Tema: {theme}
Redacao:
{content}
"""
        return self.runner.run_structured(
            agent_name="RepertoireAgent",
            description="Valida repertorios socioculturais e sugere conexoes ao tema.",
            instructions=REPERTOIRE_INSTRUCTIONS,
            prompt=prompt,
            output_schema=RepertoireAnalysis,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, theme: str, content: str) -> RepertoireAnalysis:
        lowered = content.lower()
        found = [label for key, label in self.KNOWN_REPERTOIRES.items() if key in lowered]
        score = 82 if found else 48
        weak_connections = [] if found else ["O texto ainda nao apresenta repertorio sociocultural produtivo."]
        return RepertoireAnalysis(
            repertoire_score=score,
            repertories_found=found,
            weak_connections=weak_connections,
            suggested_repertories=[
                "Use a Constituicao Federal de 1988 para discutir direitos sociais e cidadania.",
                "Conecte Paulo Freire a educacao critica quando o tema envolver escola, leitura ou inclusao.",
                "Mobilize dados de orgaos oficiais apenas quando eles sustentarem diretamente o argumento.",
            ],
            sociocultural_links=[
                f"Relacione o repertorio ao problema central do tema: {theme}.",
                "Explique a ponte entre referencia e tese; nao cite apenas para decorar o paragrafo.",
            ],
        )
