from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.middlewares.errors import AppError
from src.models import MockExam, MockExamQuestion, User, UserRole
from src.services.exam_service import ExamService

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, *, email: str = "aluno@teste.com") -> User:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user


def _make_exam(db, *, question_count: int = 4) -> MockExam:
    exam = MockExam(title="Simulado", description="desc")
    db.add(exam)
    db.flush()
    for i in range(question_count):
        db.add(
            MockExamQuestion(
                exam_id=exam.id,
                statement=f"Questao {i}",
                options=["A", "B", "C", "D", "E"],
                correct_answer="A",
                explanation="porque sim",
                skill="gramatica" if i % 2 == 0 else "interpretacao",
            )
        )
    db.commit()
    db.refresh(exam)
    return exam


def test_submit_with_no_answers_scores_zero():
    db = _session()
    user = _make_user(db)
    exam = _make_exam(db)

    result = ExamService(db).submit(user=user, exam_id=exam.id, answers={})

    assert result["score"] == 0
    assert result["correct_answers"] == 0
    assert result["total_questions"] == len(exam.questions)


def test_submit_with_all_correct_answers_scores_100():
    db = _session()
    user = _make_user(db)
    exam = _make_exam(db)
    answers = {str(q.id): q.correct_answer for q in exam.questions}

    result = ExamService(db).submit(user=user, exam_id=exam.id, answers=answers)

    assert result["score"] == 100
    assert result["correct_answers"] == len(exam.questions)


def test_submit_with_all_wrong_answers_scores_zero():
    db = _session()
    user = _make_user(db)
    exam = _make_exam(db)
    answers = {str(q.id): "Z" for q in exam.questions}

    result = ExamService(db).submit(user=user, exam_id=exam.id, answers=answers)

    assert result["score"] == 0
    assert result["correct_answers"] == 0


def test_submit_with_partial_answers_computes_proportional_score():
    db = _session()
    user = _make_user(db)
    exam = _make_exam(db, question_count=4)
    questions = sorted(exam.questions, key=lambda q: q.id)
    answers = {str(questions[0].id): questions[0].correct_answer, str(questions[1].id): questions[1].correct_answer}

    result = ExamService(db).submit(user=user, exam_id=exam.id, answers=answers)

    assert result["correct_answers"] == 2
    assert result["score"] == 50
    assert set(result["performance_by_skill"].keys()) == {"gramatica", "interpretacao"}


def test_submit_persists_attempt_and_is_listable():
    db = _session()
    user = _make_user(db)
    exam = _make_exam(db)
    answers = {str(q.id): q.correct_answer for q in exam.questions}

    service = ExamService(db)
    result = service.submit(user=user, exam_id=exam.id, answers=answers)

    attempts = service.list_attempts(user.id)
    assert len(attempts) == 1
    assert attempts[0]["attempt_id"] == result["attempt_id"]
    assert attempts[0]["score"] == 100


def test_submitting_same_exam_twice_creates_two_independent_attempts():
    db = _session()
    user = _make_user(db)
    exam = _make_exam(db)
    answers = {str(q.id): q.correct_answer for q in exam.questions}

    service = ExamService(db)
    first = service.submit(user=user, exam_id=exam.id, answers=answers)
    second = service.submit(user=user, exam_id=exam.id, answers={})

    assert first["attempt_id"] != second["attempt_id"]
    attempts = service.list_attempts(user.id)
    assert len(attempts) == 2


def test_get_attempt_detail_rejects_other_users_attempt():
    db = _session()
    owner = _make_user(db, email="dono@teste.com")
    intruder = _make_user(db, email="intruso@teste.com")
    exam = _make_exam(db)
    service = ExamService(db)
    attempt = service.submit(user=owner, exam_id=exam.id, answers={})

    with pytest.raises(AppError) as exc_info:
        service.get_attempt_detail(attempt_id=attempt["attempt_id"], user_id=intruder.id)

    assert exc_info.value.code == "exam_attempt_not_found"


def test_submit_with_invalid_exam_id_raises_not_found():
    db = _session()
    user = _make_user(db)

    with pytest.raises(AppError) as exc_info:
        ExamService(db).submit(user=user, exam_id=999, answers={})

    assert exc_info.value.code == "exam_not_found"


def test_submit_with_exam_without_questions_scores_zero():
    db = _session()
    user = _make_user(db)
    exam = _make_exam(db, question_count=0)

    result = ExamService(db).submit(user=user, exam_id=exam.id, answers={})

    assert result["score"] == 0
    assert result["total_questions"] == 0
