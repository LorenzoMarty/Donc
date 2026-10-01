from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from src.config.settings import settings


logger = logging.getLogger("src.agents.elimination_gate.jev")

# Cada pergunta Noul devolve P(afirmacao verdadeira). Todas descrevem um motivo de reprovacao.
_RISK_QUESTIONS = {
    "fuga_total": "O texto nao aborda o tema proposto ou desenvolve um assunto totalmente diferente.",
    "genero_invalido": "O texto nao e uma redacao dissertativo-argumentativa (e poema, receita, carta, lista, etc.).",
    "dh_explicita": "O texto defende ou incentiva violacao de direitos humanos, violencia ou discriminacao.",
    "sem_sentido": "O texto e ininteligivel, composto de palavras soltas, repeticao artificial ou trechos sem sentido.",
    "copia": "O texto copia trechos extensos dos textos motivadores ou de outras fontes.",
    "linguagem_ofensiva": "O texto contem linguagem ofensiva, desrespeitosa ou piadas em vez de argumentacao.",
    "tangente": "O texto trata o tema apenas de forma parcial ou tangencial.",
}


@dataclass(frozen=True)
class JevGateResult:
    approved: bool
    input_tokens: int
    output_tokens: int
    model: str


def jev_enabled() -> bool:
    return bool(settings.jev_api_key)


def screen_essay(theme: str, content: str) -> JevGateResult | None:
    """Pre-triagem Jev. approved=True so se TODOS os riscos < teto; None se Jev indisponivel/resposta invalida
    (chamador deve cair no gate GPT)."""
    if not jev_enabled():
        return None
    try:
        resp = httpx.post(
            settings.jev_base_url,
            headers={"Authorization": f"Bearer {settings.jev_api_key}"},
            json={
                "model": settings.jev_model,
                "state": f"Tema: {theme}\n\nRedacao:\n{content}",
                "questions": {k: {"type": "noul", "instructions": v} for k, v in _RISK_QUESTIONS.items()},
            },
            timeout=settings.jev_timeout_seconds,
        )
        resp.raise_for_status()
        body = resp.json()
        answers = body["answers"]
        risks = [float(answers[k]["noul"]) for k in _RISK_QUESTIONS]  # KeyError se faltar pergunta -> fallback
        usage = body.get("usage") or {}
        return JevGateResult(
            approved=max(risks) < settings.jev_gate_max_risk,
            input_tokens=int(usage.get("input_tokens", 0)),
            output_tokens=int(usage.get("output_tokens", 0)),
            model=str(body.get("model") or settings.jev_model),
        )
    except Exception as exc:  # rede, 4xx/5xx, JSON/shape inesperado: nunca derruba a correcao
        logger.warning("Jev indisponivel — gate segue para GPT: %s", exc)
        return None
