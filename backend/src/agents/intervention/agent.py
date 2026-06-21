from __future__ import annotations

import re

from src.agents.base import AgnoAgentRunner
from src.agents.schemas import InterventionAnalysisV2, InterventionElements
from src.prompts.agent_instructions import INTERVENTION_INSTRUCTIONS

_AGENTE = re.compile(r"\b(governo|estado|ministerio|escola|familia|midia|sociedade|ong|universidade|secretaria|municipio|municipios|poder\s+publico)\b", re.I)
_ACAO = re.compile(r"\b(deve|deveria|precisa|promover|criar|implementar|financiar|fiscalizar|oferecer|realizar|desenvolver|elaborar|adotar)\b", re.I)
_MEIO = re.compile(r"\b(por\s+meio|mediante|atraves|com\s+campanhas|com\s+aulas|parcerias|plataformas|programas|politicas\s+publicas|via\s+legislacao)\b", re.I)
_FINALIDADE = re.compile(r"\b(a\s+fim\s+de|para\s+que|com\s+o\s+objetivo|com\s+a\s+finalidade|visando|para\s+reduzir|para\s+garantir|para\s+promover)\b", re.I)
_DETALHAMENTO = re.compile(r"\b(publico.alvo|periodicamente|em\s+escolas|nas\s+redes|municipal|federal|formacao|capacitar|dados|recursos|prazo|orcamento|monitoramento)\b", re.I)
_DH_VIOLATION = re.compile(r"\b(exterminar|eliminar|matar|torturar|violencia\s+contra|retirar\s+direitos|deportar|encarcarar\s+sem)\b", re.I)


class InterventionAnalyzerAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def analyze(
        self,
        theme: str,
        content: str,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> InterventionAnalysisV2:
        fallback = self._fallback(content=content)
        prompt = f"""Tema: {theme}
Redacao:
{content}"""
        return self.runner.run_structured(
            agent_name="InterventionAnalyzerAgent",
            description="Avalia proposta de intervenção ENEM: 5 elementos, viabilidade, DH.",
            instructions=INTERVENTION_INSTRUCTIONS,
            prompt=prompt,
            output_schema=InterventionAnalysisV2,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, content: str) -> InterventionAnalysisV2:
        last_para = ""
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n+|\n", content) if p.strip()]
        if paragraphs:
            last_para = paragraphs[-1]
        dh_violation = bool(_DH_VIOLATION.search(content))
        agente = bool(_AGENTE.search(last_para))
        acao = bool(_ACAO.search(last_para))
        meio = bool(_MEIO.search(last_para))
        finalidade = bool(_FINALIDADE.search(last_para))
        detalhamento = bool(_DETALHAMENTO.search(last_para))
        elements = InterventionElements(agente=agente, acao=acao, meio=meio, finalidade=finalidade, detalhamento=detalhamento)
        count = sum([agente, acao, meio, finalidade, detalhamento])
        absent = count == 0
        completeness = count * 20
        is_generic = count <= 2
        quote_words = last_para.split()[:15]
        return InterventionAnalysisV2(
            elements=elements,
            completeness_score=completeness,
            is_generic=is_generic,
            absent=absent,
            has_human_rights_violation=dh_violation,
            sample_quote=" ".join(quote_words) if quote_words else "",
        )
