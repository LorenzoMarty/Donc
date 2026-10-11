"""Prepara o sqlite do E2E (frontend/playwright.config.ts): apaga o arquivo anterior, cria o schema,
semeia os dados demo e dá uma assinatura ativa ao aluno demo.

Por quê: `create_all()` não altera tabela existente, então um e2e_test.db de uma execução anterior
quebrava o login ("no such column"); e o acesso é 100% pago, então sem assinatura o aluno demo cai
em /assinatura; e cria 1 jogo quiz aprovado, porque o catálogo vem do banco (/games/published)
e o seed demo não traz nenhum. Recusa qualquer DATABASE_URL que não seja sqlite — nunca apaga banco real.
"""

from __future__ import annotations

import os
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

SQLITE_PREFIX = "sqlite:///"


def main() -> None:
    url = os.environ.get("DATABASE_URL", "")
    if not url.startswith(SQLITE_PREFIX):
        sys.exit(f"e2e_prepare recusado: DATABASE_URL precisa ser sqlite, recebido {url!r}")
    Path(url.removeprefix(SQLITE_PREFIX)).unlink(missing_ok=True)

    from sqlalchemy import select

    from src.database.session import Base, SessionLocal, engine
    from src.models import AIGeneratedGame, PlanCycle, Subscription, SubscriptionStatus, User
    from src.services.seed import seed_database

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_database(db)
        student = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert student is not None, "seed não criou o aluno demo"
        db.add(
            Subscription(
                user_id=student.id,
                cycle=PlanCycle.MONTHLY,
                status=SubscriptionStatus.ACTIVE,
                price_charged_cents=0,
                current_period_end=datetime.now(UTC) + timedelta(days=365),
            )
        )
        db.add(
            AIGeneratedGame(
                name="Quiz E2E",
                category="estrutura",
                skill="Tese",
                difficulty="medium",
                engine="quiz",
                status="approved",
                targets=["WEAK_THESIS"],
                questions=[
                    {
                        "prompt": f"Pergunta {n} do quiz E2E?",
                        "options": ["Alternativa correta", "Alternativa errada"],
                        "answer_index": 0,
                        "explanation": "Explicação de teste.",
                    }
                    for n in (1, 2)
                ],
            )
        )
        db.commit()


if __name__ == "__main__":
    main()
