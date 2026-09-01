from __future__ import annotations

import os
import sys
import tempfile
import uuid
from pathlib import Path

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

TEST_DB = Path(tempfile.gettempdir()) / f"donc_ai_tests_{uuid.uuid4().hex}.db"
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["OPENAI_API_KEY"] = ""
os.environ["AI_RATE_LIMIT_PER_MINUTE"] = "1000"
os.environ["AUTH_RATE_LIMIT_PER_MINUTE"] = "1000"
os.environ["SEED_DEMO_DATA"] = "true"

from src.database.session import engine, get_db  # noqa: E402
from src.dependencies import get_current_user  # noqa: E402
from src.main import app  # noqa: E402
from src.models import User  # noqa: E402


def override_current_user(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
    assert user is not None
    return user


app.dependency_overrides[get_current_user] = override_current_user


@pytest.fixture(autouse=True)
def _no_real_broker(monkeypatch: pytest.MonkeyPatch) -> None:
    # Sem isso, o teste depende de ter ou nao um Redis/Celery real rodando na
    # maquina de quem roda a suite: com Redis local ativo, enqueue_correct_essay
    # enfileira de verdade (sem worker pra consumir) e o job fica preso em
    # "queued" em vez de cair no fallback sincrono que os testes esperam.
    from src.routes import ai as ai_router
    from src.routes import essays as essays_router

    monkeypatch.setattr(ai_router, "enqueue_correct_essay", lambda job_id: False)
    monkeypatch.setattr(essays_router, "enqueue_correct_essay", lambda job_id: False)


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def pytest_sessionfinish(session, exitstatus):  # noqa: ARG001
    engine.dispose()
    try:
        TEST_DB.unlink(missing_ok=True)
    except PermissionError:
        pass
