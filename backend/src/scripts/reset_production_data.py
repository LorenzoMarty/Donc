from __future__ import annotations

import argparse

from sqlalchemy import delete

from src.database.session import Base, SessionLocal, engine
from src.models import (
    AIGeneratedGame,
    AIInteractionLog,
    AIJob,
    AIKnowledgeChunk,
    AIKnowledgeDocument,
    Essay,
    EssayCorrection,
    EssayTheme,
    EssayVersion,
    EssayVersionCorrection,
    Exercise,
    ExerciseAnswer,
    Goal,
    Lesson,
    LessonProgress,
    Module,
    StudentLearningProfile,
    User,
    UserEvent,
    UserGameProgress,
    UserRole,
)
from src.config.security import get_password_hash
from src.services.seed import seed_database
from src.vectorstore import seed_knowledge_base


CONFIRMATION = "RESET_PRODUCTION_DATA"


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset production data without loading demo accounts.")
    parser.add_argument("--confirm", required=True, help=f"Required literal value: {CONFIRMATION}")
    parser.add_argument("--wipe-catalog", action="store_true", help="Also remove course, lesson, exercise, theme and knowledge catalog before reseeding.")
    parser.add_argument("--admin-email", help="Optional first admin email to create after reset.")
    parser.add_argument("--admin-password", help="Optional first admin password to create after reset.")
    parser.add_argument("--admin-name", default="Admin", help="Optional first admin display name.")
    args = parser.parse_args()

    if args.confirm != CONFIRMATION:
        raise SystemExit(f"Refusing to reset data. Pass --confirm {CONFIRMATION}.")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _reset_transactional_data(db)
        if args.wipe_catalog:
            _reset_catalog_data(db)
        else:
            db.execute(delete(EssayTheme).where(EssayTheme.source == "IA Donc ENEM"))
        db.commit()

        seed_database(db, include_demo_data=False)
        seed_knowledge_base(db)
        if args.admin_email or args.admin_password:
            _create_admin(db, email=args.admin_email, password=args.admin_password, name=args.admin_name)
        db.commit()
    finally:
        db.close()

    print("Production data reset completed. Demo accounts were not created.")


def _reset_transactional_data(db) -> None:
    for model in [
        AIGeneratedGame,
        UserEvent,
        AIInteractionLog,
        AIJob,
        StudentLearningProfile,
        UserGameProgress,
        Goal,
        LessonProgress,
        ExerciseAnswer,
        EssayVersionCorrection,
        EssayVersion,
        EssayCorrection,
        Essay,
        User,
    ]:
        db.execute(delete(model))


def _reset_catalog_data(db) -> None:
    for model in [
        Exercise,
        Lesson,
        Module,
        EssayTheme,
        AIKnowledgeChunk,
        AIKnowledgeDocument,
    ]:
        db.execute(delete(model))


def _create_admin(db, *, email: str | None, password: str | None, name: str) -> None:
    if not email or not password:
        raise SystemExit("Pass both --admin-email and --admin-password to create the first admin.")
    db.add(
        User(
            name=name.strip() or "Admin",
            email=email.strip().lower(),
            hashed_password=get_password_hash(password),
            role=UserRole.ADMIN,
            streak_days=0,
            daily_goal_minutes=45,
        )
    )


if __name__ == "__main__":
    main()
