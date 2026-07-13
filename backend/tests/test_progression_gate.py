from sqlalchemy import select

from src.database.session import SessionLocal
from src.models import Course, Essay, EssayCorrection, EssayStatus, EssayTheme, Exercise, ExerciseAnswer, LessonProgress, Module, User, UserRole
from src.services.progression_service import ProgressionService


def _course(db) -> Course:
    course = db.scalar(select(Course).where(Course.slug == "destrave-redacao"))
    assert course is not None
    return course


def _make_isolated_student(db) -> User:
    """A fresh user with no lesson progress, exercise answers or essay corrections —
    avoids coupling to seed defaults or state left behind by other tests sharing this DB."""
    user = User(
        name="Gate Test Student",
        email="gate-test-student@example.com",
        hashed_password="not-used-in-this-test",
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_first_module_is_always_unlocked_but_later_modules_start_locked(client):
    response = client.get("/api/v1/lessons/courses")
    assert response.status_code == 200
    course = response.json()["data"][0]
    modules = sorted(course["modules"], key=lambda item: item["order"])

    assert modules[0]["locked"] is False
    assert modules[1]["locked"] is True
    assert modules[1]["unlock_requirements"]


def test_get_lesson_on_locked_module_returns_403(client):
    courses_response = client.get("/api/v1/lessons/courses")
    course = courses_response.json()["data"][0]
    modules = sorted(course["modules"], key=lambda item: item["order"])
    locked_module = next(module for module in modules if module["locked"])
    locked_lesson = locked_module["lessons"][0]

    response = client.get(f"/api/v1/lessons/{locked_lesson['id']}")
    assert response.status_code == 403
    assert response.json()["error"] == "lesson_locked"


def test_get_lesson_on_unlocked_module_succeeds(client):
    courses_response = client.get("/api/v1/lessons/courses")
    course = courses_response.json()["data"][0]
    modules = sorted(course["modules"], key=lambda item: item["order"])
    unlocked_lesson = modules[0]["lessons"][0]

    response = client.get(f"/api/v1/lessons/{unlocked_lesson['id']}")
    assert response.status_code == 200
    assert response.json()["data"]["locked"] is False


def test_module_mastery_requires_lessons_activity_and_competency(client):  # noqa: ARG001 - client boots the seeded app
    db = SessionLocal()
    try:
        student = _make_isolated_student(db)
        course = _course(db)
        modules = sorted(course.modules, key=lambda item: item.order)
        module = modules[0]

        progression = ProgressionService(db)
        lesson_ids = [lesson.id for lesson in module.lessons]

        state = progression.module_mastery(module, student.id)
        assert state.lessons_done is False, "brand-new student has no lesson progress at all"
        assert state.mastered is False

        for lesson_id in lesson_ids:
            db.add(LessonProgress(user_id=student.id, lesson_id=lesson_id, progress_percent=100, completed=True))
        db.commit()

        state = progression.module_mastery(module, student.id)
        assert state.lessons_done is True
        assert state.activity_passed is False, "no exercise answers submitted yet"
        assert state.mastered is False

        exercises = list(db.scalars(select(Exercise).where(Exercise.module_id == module.id)))
        assert exercises, "module 1 seed data must ship exercises for this test to be meaningful"
        for exercise in exercises:
            db.add(
                ExerciseAnswer(
                    user_id=student.id,
                    exercise_id=exercise.id,
                    selected_answer=exercise.correct_answer,
                    is_correct=True,
                )
            )
        db.commit()

        state = progression.module_mastery(module, student.id)
        assert state.activity_passed is True
        assert state.competency_clear is True, "brand-new student has no corrected essays yet — competency gate is graceful"
        assert state.mastered is True

        # Now prove the competency gate actually engages: a corrected essay scoring below the
        # threshold on the module's target competencies (c2, c3) should re-lock mastery.
        theme = db.scalar(select(EssayTheme))
        assert theme is not None
        essay = Essay(user_id=student.id, theme_id=theme.id, title="Redacao de teste - fraca", status=EssayStatus.CORRECTED, score=400)
        db.add(essay)
        db.flush()
        db.add(
            EssayCorrection(
                essay_id=essay.id,
                total_score=400,
                competency_1=120,
                competency_2=100,
                competency_3=100,
                competency_4=120,
                competency_5=120,
                strengths=[],
                errors=[],
                suggestions=[],
                feedback="",
                recurrent_patterns=[],
            )
        )
        db.commit()

        state = progression.module_mastery(module, student.id)
        assert state.competency_clear is False
        assert set(state.weak_competencies) == {"c2", "c3"}
        assert state.mastered is False

        unlock_map = progression.unlock_map(course, student.id)
        assert unlock_map[modules[1].id] is False
    finally:
        db.close()
