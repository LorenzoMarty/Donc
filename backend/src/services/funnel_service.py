"""Funil de aquisição e retenção, derivado dos registros que o produto já grava.

Sem tabela nem evento novo: cada passo vem de um timestamp que já existe (cadastro, onboarding,
assinatura, aula concluída, redação enviada, jogo/exercício). Coorte = alunos cadastrados nos
últimos `days` dias.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from statistics import median

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import (
    Essay,
    ExerciseAnswer,
    GameAttempt,
    LessonProgress,
    StudentProfile,
    Subscription,
    SubscriptionStatus,
    User,
    UserRole,
)
from src.services.streak_service import STREAK_TIMEZONE

FIRST_ACTION_TARGET_MINUTES = 3


@dataclass
class FunnelStep:
    key: str
    label: str
    count: int
    pct: float  # sobre os cadastros da coorte


@dataclass
class Retention:
    eligible: int
    retained: int
    rate: float


@dataclass
class FunnelResult:
    days: int
    signups: int
    steps: list[FunnelStep]
    first_action_median_minutes: float | None
    first_action_within_target_pct: float
    retention_d1: Retention
    retention_d7: Retention


def _aware(value: datetime) -> datetime:
    # SQLite (testes) devolve datetime naive; Postgres devolve aware.
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _local_day(value: datetime) -> date:
    return _aware(value).astimezone(STREAK_TIMEZONE).date()


def _pct(part: int, whole: int) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


class FunnelService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def metrics(self, *, days: int = 30, now: datetime | None = None) -> FunnelResult:
        now = _aware(now or datetime.now(UTC))
        users = {
            user.id: _aware(user.created_at)
            for user in self.db.scalars(
                select(User).where(
                    User.role == UserRole.STUDENT, User.deleted_at.is_(None), User.created_at >= now - timedelta(days=days)
                )
            )
        }
        ids = list(users)
        if not ids:
            empty = Retention(0, 0, 0.0)
            return FunnelResult(days, 0, [], None, 0.0, empty, empty)

        onboarded = set(self.db.scalars(select(StudentProfile.user_id).where(StudentProfile.user_id.in_(ids), StudentProfile.completed.is_(True))))
        subs = {s.user_id: s for s in self.db.scalars(select(Subscription).where(Subscription.user_id.in_(ids)))}
        paid = {
            uid
            for uid, sub in subs.items()
            if sub.current_period_end is not None or sub.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE)
        }
        lesson_done = set(self.db.scalars(select(LessonProgress.user_id).where(LessonProgress.user_id.in_(ids), LessonProgress.completed.is_(True))))
        essay_sent = set(self.db.scalars(select(Essay.user_id).where(Essay.user_id.in_(ids), Essay.submitted_at.is_not(None))))

        activity = self._activity_timestamps(ids)
        acted = {uid for uid, stamps in activity.items() if stamps}

        signups = len(ids)
        steps = [
            FunnelStep("signup", "Cadastro", signups, 100.0),
            FunnelStep("onboarding", "Onboarding concluído", len(onboarded), _pct(len(onboarded), signups)),
            FunnelStep("checkout_start", "Iniciou o checkout", len(subs), _pct(len(subs), signups)),
            FunnelStep("paid", "Pagou", len(paid), _pct(len(paid), signups)),
            FunnelStep("first_action", "Primeira atividade", len(acted), _pct(len(acted), signups)),
            FunnelStep("first_lesson", "Primeira aula concluída", len(lesson_done), _pct(len(lesson_done), signups)),
            FunnelStep("first_essay", "Primeira redação enviada", len(essay_sent), _pct(len(essay_sent), signups)),
        ]

        minutes = [
            (min(stamps) - users[uid]).total_seconds() / 60 for uid, stamps in activity.items() if stamps and min(stamps) >= users[uid]
        ]
        within = sum(1 for value in minutes if value <= FIRST_ACTION_TARGET_MINUTES)

        return FunnelResult(
            days=days,
            signups=signups,
            steps=steps,
            first_action_median_minutes=round(median(minutes), 1) if minutes else None,
            first_action_within_target_pct=_pct(within, len(minutes)),
            retention_d1=self._retention(users, activity, offset_days=1, now=now),
            retention_d7=self._retention(users, activity, offset_days=7, now=now),
        )

    def _activity_timestamps(self, ids: list[int]) -> dict[int, list[datetime]]:
        """Toda atividade pedagógica registrada (jogo, exercício, aula, redação) por aluno."""
        sources = [
            (GameAttempt.user_id, GameAttempt.completed_at),
            (ExerciseAnswer.user_id, ExerciseAnswer.answered_at),
            (LessonProgress.user_id, LessonProgress.updated_at),
            (Essay.user_id, Essay.created_at),
        ]
        result: dict[int, list[datetime]] = {uid: [] for uid in ids}
        for user_col, time_col in sources:
            for uid, stamp in self.db.execute(select(user_col, time_col).where(user_col.in_(ids))):
                result[uid].append(_aware(stamp))
        return result

    @staticmethod
    def _retention(users: dict[int, datetime], activity: dict[int, list[datetime]], *, offset_days: int, now: datetime) -> Retention:
        today = _local_day(now)
        eligible = retained = 0
        for uid, created in users.items():
            target = _local_day(created) + timedelta(days=offset_days)
            if target > today:
                continue  # ainda não deu tempo de voltar nesse dia
            eligible += 1
            if any(_local_day(stamp) == target for stamp in activity[uid]):
                retained += 1
        return Retention(eligible, retained, _pct(retained, eligible))
