from dataclasses import dataclass

from src.models import Difficulty, User


@dataclass(frozen=True)
class Rank:
    id: int
    name: str
    min_xp: int
    max_difficulty: Difficulty


RANKS = (
    Rank(id=1, name="Aprendiz", min_xp=0, max_difficulty=Difficulty.EASY),
    Rank(id=2, name="Argumentador", min_xp=350, max_difficulty=Difficulty.MEDIUM),
    Rank(id=3, name="Estrategista", min_xp=900, max_difficulty=Difficulty.HARD),
    Rank(id=4, name="Orador", min_xp=1650, max_difficulty=Difficulty.HARD),
    Rank(id=5, name="Mestre da Redacao", min_xp=2700, max_difficulty=Difficulty.HARD),
)

DIFFICULTY_ORDER = (Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD)


def rank_for_xp(xp: int) -> Rank:
    safe_xp = max(0, xp)
    return next((rank for rank in reversed(RANKS) if safe_xp >= rank.min_xp), RANKS[0])


def next_rank_for_xp(xp: int) -> Rank | None:
    safe_xp = max(0, xp)
    return next((rank for rank in RANKS if rank.min_xp > safe_xp), None)


def level_for_xp(xp: int) -> int:
    return max(1, (max(0, xp) // 350) + 1)


def allowed_difficulties_for_xp(xp: int) -> list[Difficulty]:
    rank = rank_for_xp(xp)
    max_index = DIFFICULTY_ORDER.index(rank.max_difficulty)
    return list(DIFFICULTY_ORDER[: max_index + 1])


def allowed_difficulties_for_user(user: User) -> list[Difficulty]:
    return allowed_difficulties_for_xp(user.xp)


def next_difficulty_after_answer(*, current: Difficulty, is_correct: bool, xp: int) -> Difficulty:
    if not is_correct:
        return Difficulty.EASY

    allowed = allowed_difficulties_for_xp(xp)
    current_index = DIFFICULTY_ORDER.index(current)
    next_index = min(current_index + 1, DIFFICULTY_ORDER.index(allowed[-1]))
    return DIFFICULTY_ORDER[next_index]
