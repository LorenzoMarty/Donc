from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.middlewares.errors import AppError
from src.models import LearningReward, Lesson, LessonProgress, Module, User
from src.repositories.learning import LearningRepository
from src.schemas.lessons import CourseRead, ExercisePreview, LessonProgressRead, LessonRead, ModuleActivityRead, ModuleItemRead, ModuleRead, RankRead
from src.services.progression_service import ProgressionService
from src.services.rank_service import allowed_difficulties_for_user, level_for_xp, next_rank_for_xp, rank_for_xp


LESSON_XP = 25
MODULE_XP = 75
COURSE_XP = 200


class LessonService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = LearningRepository(db)
        self.progression = ProgressionService(db)

    def list_courses(self, user_id: int) -> list[CourseRead]:
        courses = self.repo.list_courses()
        user = self._get_user(user_id)
        return [self._course_schema(course, user_id, user=user) for course in courses]

    def _course_schema(self, course, user_id: int, *, user: User) -> CourseRead:
        unlock_map = self.progression.unlock_map(course, user_id)
        return CourseRead(
            id=course.id,
            title=course.title,
            slug=course.slug,
            description=course.description,
            color=course.color,
            progress_percent=self._course_progress(course, user_id),
            completed=self._course_completed(course.id, user_id),
            xp_reward=COURSE_XP,
            user_rank=self._rank_schema(user),
            modules=[
                self._module_schema(module, user_id, unlock_map=unlock_map)
                for module in sorted(course.modules, key=lambda item: item.order)
            ],
        )

    def get_lesson(self, lesson_id: int, user_id: int) -> LessonRead:
        lesson = self.repo.get_lesson(lesson_id)
        if not lesson:
            raise AppError("Aula nao encontrada.", status_code=404, code="lesson_not_found")
        module = lesson.module
        unlock_map = self.progression.unlock_map(module.course, user_id)
        if not unlock_map.get(module.id, True):
            raise AppError(
                "Este modulo ainda esta bloqueado. Conclua o modulo anterior para liberar esta aula.",
                status_code=403,
                code="lesson_locked",
            )
        return self._lesson_schema(lesson, user_id, locked=False)

    def update_progress(self, lesson_id: int, user_id: int, *, progress_percent: int, last_position_seconds: int, completed: bool) -> LessonProgressRead:
        lesson = self.repo.get_lesson(lesson_id)
        if not lesson:
            raise AppError("Aula nao encontrada.", status_code=404, code="lesson_not_found")
        user = self._get_user(user_id)
        progress = self.repo.get_progress(user_id, lesson_id)
        if not progress:
            progress = LessonProgress(user_id=user_id, lesson_id=lesson_id)
            self.db.add(progress)

        progress.progress_percent = 100 if completed else progress_percent
        progress.last_position_seconds = last_position_seconds
        progress.completed = completed or progress.progress_percent >= 100
        self.db.flush()

        xp_earned = 0
        reward_events: list[str] = []
        if progress.completed:
            xp_earned += self._award_once(user, "lesson", lesson.id, LESSON_XP, f"Aula concluida: +{LESSON_XP} XP", reward_events)
            xp_earned += self._award_module_if_complete(user, lesson, reward_events)
            xp_earned += self._award_course_if_complete(user, lesson, reward_events)

        self.db.commit()
        self.db.refresh(progress)
        self.db.refresh(user)
        rank = rank_for_xp(user.xp)
        next_rank = next_rank_for_xp(user.xp)
        return LessonProgressRead(
            progress_percent=progress.progress_percent,
            last_position_seconds=progress.last_position_seconds,
            completed=progress.completed,
            xp_earned=xp_earned,
            reward_events=reward_events,
            total_xp=user.xp,
            rank_name=rank.name,
            next_rank_xp=next_rank.min_xp if next_rank else None,
            exercise_difficulty=rank.max_difficulty.value,
        )

    def _module_schema(self, module, user_id: int, *, unlock_map: dict[int, bool]) -> ModuleRead:
        locked = not unlock_map.get(module.id, True)
        mastery = self.progression.module_mastery(module, user_id)
        return ModuleRead(
            id=module.id,
            title=module.title,
            description=module.description,
            order=module.order,
            progress_percent=self._module_progress(module, user_id),
            completed=self._module_completed(module.id, user_id),
            xp_reward=MODULE_XP,
            lessons=[
                self._lesson_schema(lesson, user_id, locked=locked)
                for lesson in sorted(module.lessons, key=lambda item: item.order)
            ],
            items=self._module_items(module, user_id, locked=locked),
            locked=locked,
            mastered=mastery.mastered,
            unlock_requirements=self.progression.pending_requirements(mastery) if locked else [],
            target_competencies=module.target_competencies or [],
        )

    def _lesson_schema(self, lesson, user_id: int, *, locked: bool = False) -> LessonRead:
        progress = self.repo.get_progress(user_id, lesson.id)
        user = self._get_user(user_id)
        allowed_difficulties = set(allowed_difficulties_for_user(user))
        return LessonRead(
            id=lesson.id,
            title=lesson.title,
            description=lesson.description,
            thumbnail_url=lesson.thumbnail_url,
            video_url=lesson.video_url,
            summary=lesson.summary,
            duration_minutes=lesson.duration_minutes,
            order=lesson.order,
            xp_reward=LESSON_XP,
            progress=LessonProgressRead(
                progress_percent=progress.progress_percent if progress else 0,
                last_position_seconds=progress.last_position_seconds if progress else 0,
                completed=progress.completed if progress else False,
            ),
            exercises=[
                ExercisePreview(id=ex.id, statement=ex.statement, skill=ex.skill, difficulty=ex.difficulty.value)
                for ex in lesson.exercises
                if ex.difficulty in allowed_difficulties
            ],
            locked=locked,
        )

    def _rank_schema(self, user: User) -> RankRead:
        rank = rank_for_xp(user.xp)
        next_rank = next_rank_for_xp(user.xp)
        return RankRead(
            name=rank.name,
            xp=user.xp,
            next_rank_xp=next_rank.min_xp if next_rank else None,
            exercise_difficulty=rank.max_difficulty.value,
        )

    def _module_items(self, module, user_id: int, *, locked: bool = False) -> list[ModuleItemRead]:
        items = [
            item
            for item in getattr(module, "items", [])
            if (item.kind == "lesson" and item.lesson) or (item.kind == "activity" and item.exercise)
        ]
        if not items:
            return [
                ModuleItemRead(
                    id=0 - lesson.id,
                    kind="lesson",
                    order=lesson.order,
                    lesson=self._lesson_schema(lesson, user_id, locked=locked),
                )
                for lesson in sorted(module.lessons, key=lambda item: (item.order, item.id))
            ]
        user = self._get_user(user_id)
        allowed_difficulties = set(allowed_difficulties_for_user(user))
        result: list[ModuleItemRead] = []
        for item in sorted(items, key=lambda entry: (entry.order, entry.id)):
            if item.kind == "lesson" and item.lesson:
                result.append(
                    ModuleItemRead(
                        id=item.id,
                        kind="lesson",
                        order=item.order,
                        lesson=self._lesson_schema(item.lesson, user_id, locked=locked),
                    )
                )
            elif item.kind == "activity" and item.exercise and item.exercise.difficulty in allowed_difficulties:
                result.append(
                    ModuleItemRead(
                        id=item.id,
                        kind="activity",
                        order=item.order,
                        activity=ModuleActivityRead(
                            id=item.exercise.id,
                            statement=item.exercise.statement,
                            skill=item.exercise.skill,
                            difficulty=item.exercise.difficulty.value,
                            lesson_id=item.exercise.lesson_id,
                            base_lesson_ids=item.exercise.base_lesson_ids or [],
                        ),
                    )
                )
        return result

    def _get_user(self, user_id: int) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise AppError("Usuario nao encontrado.", status_code=404, code="user_not_found")
        return user

    def _module_progress(self, module, user_id: int) -> int:
        lessons = list(module.lessons)
        if not lessons:
            return 0
        return round(sum(self._lesson_progress_percent(lesson, user_id) for lesson in lessons) / len(lessons))

    def _course_progress(self, course, user_id: int) -> int:
        lessons = [lesson for module in course.modules for lesson in module.lessons]
        if not lessons:
            return 0
        return round(sum(self._lesson_progress_percent(lesson, user_id) for lesson in lessons) / len(lessons))

    def _lesson_progress_percent(self, lesson, user_id: int) -> int:
        progress = self.repo.get_progress(user_id, lesson.id)
        return progress.progress_percent if progress else 0

    def _module_completed(self, module_id: int, user_id: int) -> bool:
        lesson_ids = list(self.db.scalars(select(Lesson.id).where(Lesson.module_id == module_id)))
        if not lesson_ids:
            return False
        completed_count = self.db.scalar(
            select(func.count(LessonProgress.id)).where(
                LessonProgress.user_id == user_id,
                LessonProgress.lesson_id.in_(lesson_ids),
                LessonProgress.completed.is_(True),
            )
        ) or 0
        return completed_count == len(lesson_ids)

    def _course_completed(self, course_id: int, user_id: int) -> bool:
        lesson_ids = list(self.db.scalars(select(Lesson.id).join(Module).where(Module.course_id == course_id)))
        if not lesson_ids:
            return False
        completed_count = self.db.scalar(
            select(func.count(LessonProgress.id)).where(
                LessonProgress.user_id == user_id,
                LessonProgress.lesson_id.in_(lesson_ids),
                LessonProgress.completed.is_(True),
            )
        ) or 0
        return completed_count == len(lesson_ids)

    def _award_once(self, user: User, reward_type: str, target_id: int, xp: int, label: str, reward_events: list[str]) -> int:
        reward = self.db.scalar(
            select(LearningReward).where(
                LearningReward.user_id == user.id,
                LearningReward.reward_type == reward_type,
                LearningReward.target_id == target_id,
            )
        )
        if reward:
            return 0

        self.db.add(LearningReward(user_id=user.id, reward_type=reward_type, target_id=target_id, xp=xp))
        user.xp += xp
        user.level = max(user.level, level_for_xp(user.xp))
        reward_events.append(label)
        return xp

    def _award_module_if_complete(self, user: User, lesson, reward_events: list[str]) -> int:
        module_id = lesson.module_id
        if not self._module_completed(module_id, user.id):
            return 0
        return self._award_once(user, "module", module_id, MODULE_XP, f"Modulo concluido: +{MODULE_XP} XP", reward_events)

    def _award_course_if_complete(self, user: User, lesson, reward_events: list[str]) -> int:
        course_id = lesson.module.course_id
        if not self._course_completed(course_id, user.id):
            return 0
        return self._award_once(user, "course", course_id, COURSE_XP, f"Curso concluido: +{COURSE_XP} XP", reward_events)
