from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings


class TutorService:
    def __init__(self, _: Session) -> None:
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    def answer(self, *, message: str, context: str | None = None) -> dict[str, list[str] | str]:
        fallback = {
            "answer": (
                "Vamos por partes. No ENEM, priorize clareza, tese bem definida, argumentos conectados "
                "e uma proposta de intervencao completa. Para a sua duvida, identifique primeiro o conceito "
                "central, veja um exemplo e depois aplique em uma frase propria."
            ),
            "suggestions": [
                "Reescrever um paragrafo com mais coesao",
                "Treinar uma proposta de intervencao",
                "Revisar uma regra gramatical com exemplos",
            ],
        }
        if not self.client:
            return fallback

        try:
            response = self.client.responses.create(
                model=settings.openai_model,
                input=[
                    {
                        "role": "system",
                        "content": (
                            "Voce e uma tutora de Portugues e Redacao ENEM. Responda em portugues do Brasil, "
                            "de forma clara, curta e pedagogica. Nao resolva fora do escopo de Portugues, "
                            "Linguagens e Redacao ENEM."
                        ),
                    },
                    {"role": "user", "content": f"Contexto: {context or 'sem contexto'}\n\nPergunta: {message}"},
                ],
            )
            return {
                "answer": response.output_text,
                "suggestions": [
                    "Ver um exemplo ENEM",
                    "Transformar em checklist de estudo",
                    "Praticar com uma questao objetiva",
                ],
            }
        except Exception:
            return fallback

