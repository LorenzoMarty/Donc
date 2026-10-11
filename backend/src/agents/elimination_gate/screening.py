from __future__ import annotations

from dataclasses import dataclass

from src.config.settings import settings


# Cada pergunta Noul devolve P(afirmacao verdadeira). Todas descrevem um motivo de reprovacao.
RISK_QUESTIONS = {
    "fuga_total": "O texto nao aborda o tema proposto ou desenvolve um assunto totalmente diferente.",
    "genero_invalido": "O texto nao e uma redacao dissertativo-argumentativa (e poema, receita, carta, lista, etc.).",
    "dh_explicita": "O texto defende ou incentiva violacao de direitos humanos, violencia ou discriminacao.",
    "sem_sentido": "O texto e ininteligivel, composto de palavras soltas, repeticao artificial ou trechos sem sentido.",
    "copia": "O texto copia trechos extensos dos textos motivadores ou de outras fontes.",
    "linguagem_ofensiva": "O texto contem linguagem ofensiva, desrespeitosa ou piadas em vez de argumentacao.",
    "tangente": "O texto trata o tema apenas de forma parcial ou tangencial.",
}


@dataclass(frozen=True)
class GateScreening:
    approved: bool
    input_tokens: int
    output_tokens: int
    model: str


def risks_approved(answers: dict) -> bool:
    """True so se TODAS as probabilidades de risco < teto. KeyError se faltar pergunta (chamador cai no GPT)."""
    return max(float(answers[k]["noul"]) for k in RISK_QUESTIONS) < settings.screening_max_risk


def screen_essay(theme: str, content: str) -> GateScreening | None:
    """Pre-triagem barata do gate. Laya (local) tem prioridade se ligado, senao Jev (API). None = indisponivel/
    resposta invalida/desligado: o chamador deve cair no gate GPT."""
    from src.agents.elimination_gate.jev import screen_jev
    from src.agents.elimination_gate.laya import screen_laya

    return screen_laya(theme, content) if settings.laya_enabled else screen_jev(theme, content)
