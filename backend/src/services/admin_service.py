from __future__ import annotations

from datetime import datetime, timedelta, timezone

import re
import unicodedata

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from src.agents.exercise import ExerciseGeneratorAgent
from src.agents.game_generator import GameGeneratorAgent
from src.agents.theme_generator import ThemeGeneratorAgent
from src.config.settings import settings
from src.middlewares.errors import AppError
from src.models import AIInteractionLog, Course, Difficulty, Essay, EssayCorrection, EssayTheme, Exercise, Lesson, Module, ModuleItem, User
from src.models.events import AIGeneratedGame, UserEvent
from src.repositories.users import UserRepository
from src.schemas.admin import (
    AdminMetricsResponse,
    AdminActivityRead,
    AdminCourseRead,
    AdminLessonRead,
    AdminModuleRead,
    AdminModuleItemRead,
    AdminUserAIUsage,
    AdminUserDetailResponse,
    AdminUserLearningProfile,
    AdminUserProgress,
    AdminUserRead,
    AgentStats,
    AIGeneratedGameRead,
    AITelemetryResponse,
    DailyUsage,
    EventTypeSummary,
    GameQuestionRead,
    MasteryPointRead,
    ModelStats,
    UserActivityResponse,
    WorkflowStats,
)
from src.memory.profile import get_learning_profile_payload
from src.services.ai_telemetry import record_ai_interaction
from src.services.dashboard_service import DashboardService
from src.services.fx_rate import get_usd_brl


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def _token_cost_cents(self, tokens: int) -> int:
        return int((tokens / 1000) * settings.ai_cost_cents_per_1k_tokens)

    def _log_cost_micros(self, log: AIInteractionLog) -> int:
        """Custo da chamada em micro-USD. Usa cost_micro_usd real; cai no cálculo
        legado (token_count × taxa) para linhas antigas sem custo gravado."""
        if getattr(log, "cost_micro_usd", 0):
            return log.cost_micro_usd
        return int((log.token_count / 1000) * settings.ai_cost_cents_per_1k_tokens * 10_000)

    @staticmethod
    def _micros_to_usd_cents(micros: int) -> int:
        return int(round(micros / 10_000))

    @staticmethod
    def _micros_to_brl_cents(micros: int, rate: float) -> int:
        return int(round((micros / 1_000_000) * rate * 100))

    # ── Existing ──────────────────────────────────────────────────────────────

    def metrics(self) -> AdminMetricsResponse:
        corrected = self.db.scalar(select(func.count(EssayCorrection.id))) or 0
        average = self.db.scalar(select(func.avg(EssayCorrection.total_score))) or 0
        return AdminMetricsResponse(
            users=self.db.scalar(select(func.count(User.id))) or 0,
            essays=self.db.scalar(select(func.count(Essay.id))) or 0,
            corrected_essays=corrected,
            lessons=self.db.scalar(select(func.count(Lesson.id))) or 0,
            exercises=self.db.scalar(select(func.count(Exercise.id))) or 0,
            average_score=int(average),
            active_themes=self.db.scalar(select(func.count(EssayTheme.id)).where(EssayTheme.is_active.is_(True))) or 0,
        )

    def list_essay_themes(self) -> list[EssayTheme]:
        return list(self.db.scalars(select(EssayTheme).where(EssayTheme.is_active.is_(True)).order_by(EssayTheme.created_at.desc())))

    def generate_essay_theme(
        self,
        *,
        focus: str | None,
        admin_user_id: int,
        supporting_text_requirements: dict[str, int] | None = None,
    ) -> EssayTheme:
        existing_titles = [theme.title for theme in self.db.scalars(select(EssayTheme))]
        agent = ThemeGeneratorAgent()
        result = agent.generate_batch(
            focus=focus,
            existing_titles=existing_titles,
            count=1,
            supporting_text_requirements=supporting_text_requirements,
            user_id=admin_user_id,
            session_id=f"admin:{admin_user_id}:theme-generator",
        )
        generated = result.themes[0]
        title = self._clean_theme_title(generated.title)
        if self._normalize_theme_title(title) in {self._normalize_theme_title(item) for item in existing_titles}:
            raise AppError("A IA retornou um tema ja existente. Tente gerar novamente.", status_code=409, code="duplicate_theme")

        theme = EssayTheme(
            title=title,
            context=generated.context,
            source="IA Donc ENEM",
            supporting_texts=self._normalize_supporting_texts(
                [supporting_text.model_dump() for supporting_text in generated.supporting_texts],
                requirements=supporting_text_requirements,
            ),
            is_active=True,
        )
        self.db.add(theme)
        record_ai_interaction(
            self.db,
            workflow="admin_theme_generation",
            agent="ThemeGeneratorAgent",
            user_id=admin_user_id,
            runner=agent.runner,
            meta={"focus": focus, "generated_count": 1, "supporting_text_requirements": supporting_text_requirements or {}},
        )
        self.db.commit()
        self.db.refresh(theme)
        return theme

    def update_essay_theme(
        self,
        *,
        theme_id: int,
        title: str | None = None,
        context: str | None = None,
        supporting_texts: list[dict] | None = None,
    ) -> EssayTheme:
        theme = self._get_active_essay_theme(theme_id)
        if title is not None:
            cleaned_title = self._clean_theme_title(title)
            if len(cleaned_title) < 8:
                raise AppError("Titulo do tema precisa ter pelo menos 8 caracteres.", status_code=422, code="invalid_theme_title")
            normalized_title = self._normalize_theme_title(cleaned_title)
            active_titles = list(
                self.db.scalars(
                    select(EssayTheme.title).where(EssayTheme.id != theme_id, EssayTheme.is_active.is_(True))
                )
            )
            if normalized_title in {self._normalize_theme_title(item) for item in active_titles}:
                raise AppError("Ja existe um tema ativo com esse titulo.", status_code=409, code="duplicate_theme")
            theme.title = cleaned_title
        if context is not None:
            cleaned_context = context.strip()
            if len(cleaned_context) < 20:
                raise AppError("Contexto do tema precisa ter pelo menos 20 caracteres.", status_code=422, code="invalid_theme_context")
            theme.context = cleaned_context
        if supporting_texts is not None:
            theme.supporting_texts = self._normalize_supporting_texts(supporting_texts)
        self.db.commit()
        self.db.refresh(theme)
        return theme

    def _normalize_supporting_texts(self, texts: list[dict], requirements: dict[str, int] | None = None) -> list[dict]:
        allowed = {"motivador", "perspectiva", "dados", "repertorio", "imagem"}
        cleaned: list[dict] = []
        for item in texts:
            kind = str(item.get("type") or "motivador").strip()
            title = str(item.get("title") or "").strip()
            content = str(item.get("content") or "").strip()
            if kind not in allowed:
                raise AppError("Tipo de texto motivador invalido.", status_code=422, code="invalid_supporting_text_type")
            if len(title) < 4:
                raise AppError("Titulo do texto motivador precisa ter pelo menos 4 caracteres.", status_code=422, code="invalid_supporting_text")
            if len(content) < 40:
                raise AppError("Texto motivador precisa ter pelo menos 40 caracteres.", status_code=422, code="invalid_supporting_text")
            cleaned.append({"title": title, "content": content, "type": kind})
        if not cleaned:
            raise AppError("Adicione pelo menos um texto motivador.", status_code=422, code="missing_supporting_texts")
        if len(cleaned) > 8:
            raise AppError("Use no maximo 8 textos motivadores por tema.", status_code=422, code="too_many_supporting_texts")
        for kind, amount in (requirements or {}).items():
            if amount > 0 and sum(1 for item in cleaned if item["type"] == kind) < amount:
                raise AppError("A IA nao gerou a quantidade solicitada de textos motivadores.", status_code=422, code="supporting_text_count_mismatch")
        return cleaned

    def delete_essay_theme(self, *, theme_id: int) -> None:
        theme = self._get_active_essay_theme(theme_id)
        theme.is_active = False
        self.db.commit()

    def _get_active_essay_theme(self, theme_id: int) -> EssayTheme:
        theme = self.db.get(EssayTheme, theme_id)
        if not theme or not theme.is_active:
            raise AppError("Tema de redacao nao encontrado.", status_code=404, code="theme_not_found")
        return theme

    def users_list(self) -> list[AdminUserRead]:
        users = self.users.list_users()
        # aggregate tokens per user
        token_rows = self.db.execute(
            select(AIInteractionLog.user_id, func.sum(AIInteractionLog.token_count).label("total"))
            .where(AIInteractionLog.user_id.is_not(None))
            .group_by(AIInteractionLog.user_id)
        ).all()
        token_by_user = {row.user_id: int(row.total or 0) for row in token_rows}

        # aggregate event count per user
        event_rows = self.db.execute(
            select(UserEvent.user_id, func.count(UserEvent.id).label("cnt"))
            .where(UserEvent.user_id.is_not(None))
            .group_by(UserEvent.user_id)
        ).all()
        events_by_user = {row.user_id: int(row.cnt or 0) for row in event_rows}

        return [
            AdminUserRead(
                id=user.id,
                name=user.name,
                email=user.email,
                role=user.role.value,
                xp=user.xp,
                level=user.level,
                streak_days=user.streak_days,
                daily_goal_minutes=user.daily_goal_minutes,
                essays=len(user.essays),
                last_seen_at=user.last_seen_at,
                total_tokens=token_by_user.get(user.id, 0),
                event_count=events_by_user.get(user.id, 0),
            )
            for user in users
        ]

    def _clean_theme_title(self, title: str) -> str:
        cleaned = re.sub(r"^\s*(?:tema\s*)?\d+\s*[\).:\-]\s*", "", title.strip(), flags=re.IGNORECASE)
        cleaned = cleaned.strip(" \"'")
        return re.sub(r"\s+", " ", cleaned)

    def _normalize_theme_title(self, title: str) -> str:
        text = unicodedata.normalize("NFKD", title.lower())
        text = "".join(char for char in text if not unicodedata.combining(char))
        return re.sub(r"[^a-z0-9]+", "", text)

    # ── AI Telemetry ──────────────────────────────────────────────────────────

    def update_student(
        self,
        *,
        user_id: int,
        name: str | None = None,
        xp: int | None = None,
        level: int | None = None,
        streak_days: int | None = None,
        daily_goal_minutes: int | None = None,
    ) -> AdminUserRead:
        user = self._get_student(user_id)
        if name is not None:
            user.name = name.strip()
        if xp is not None:
            user.xp = xp
        if level is not None:
            user.level = level
        if streak_days is not None:
            user.streak_days = streak_days
        if daily_goal_minutes is not None:
            user.daily_goal_minutes = daily_goal_minutes
        self.db.commit()
        return next(item for item in self.users_list() if item.id == user.id)

    def delete_student(self, *, user_id: int, admin_user_id: int) -> None:
        if user_id == admin_user_id:
            raise AppError("Voce nao pode excluir sua propria conta.", status_code=409, code="cannot_delete_self")
        user = self._get_student(user_id)
        self.db.delete(user)
        self.db.commit()

    def user_detail(self, user_id: int) -> AdminUserDetailResponse:
        user = self.db.get(User, user_id)
        if not user:
            raise AppError("Usuario nao encontrado.", status_code=404, code="user_not_found")

        summary = next((item for item in self.users_list() if item.id == user_id), None)
        if summary is None:
            raise AppError("Usuario nao encontrado.", status_code=404, code="user_not_found")

        dashboard = DashboardService(self.db).get(user_id)
        progress = AdminUserProgress(
            progress_general=dashboard.progress_general,
            essay_average=dashboard.essay_average,
            best_essay_score=dashboard.best_essay_score,
            completed_lessons=dashboard.completed_lessons,
            correct_exercises_rate=dashboard.correct_exercises_rate,
            essays_written=dashboard.essays_written,
            mastery_map=[
                MasteryPointRead(competency=point.competency, label=point.label, value=point.value)
                for point in dashboard.mastery_map
            ],
            recurrent_errors=dashboard.recurrent_errors,
        )

        profile_payload = get_learning_profile_payload(self.db, user_id)
        learning_profile = AdminUserLearningProfile(
            weak_competencies=profile_payload.get("weak_competencies") or {},
            recurring_errors=profile_payload.get("recurring_errors") or [],
            repertories_used=profile_payload.get("repertories_used") or [],
            recommendations=profile_payload.get("recommendations") or [],
        )

        ai_usage = self._user_ai_usage(user_id)

        return AdminUserDetailResponse(
            user=summary,
            progress=progress,
            learning_profile=learning_profile,
            ai_usage=ai_usage,
        )

    def _user_ai_usage(self, user_id: int) -> AdminUserAIUsage:
        logs = self.db.scalars(select(AIInteractionLog).where(AIInteractionLog.user_id == user_id)).all()
        fx = get_usd_brl()
        rate = fx.rate
        total_tokens = sum(log.token_count for log in logs)
        total_calls = len(logs)
        error_calls = sum(1 for log in logs if log.status == "error")
        total_micros = sum(self._log_cost_micros(log) for log in logs)

        agent_map: dict[str, dict] = {}
        day_map: dict[str, dict] = {}
        for log in logs:
            micros = self._log_cost_micros(log)
            is_error = log.status == "error"
            key = f"{log.workflow}::{log.agent}"
            agent = agent_map.setdefault(
                key,
                {"agent": log.agent, "workflow": log.workflow, "calls": 0, "success": 0, "errors": 0, "tokens": 0, "latency_total": 0, "micros": 0},
            )
            agent["calls"] += 1
            agent["tokens"] += log.token_count
            agent["latency_total"] += log.latency_ms
            agent["micros"] += micros
            agent["errors" if is_error else "success"] += 1

            day = log.created_at.strftime("%Y-%m-%d") if log.created_at else "unknown"
            bucket = day_map.setdefault(day, {"tokens": 0, "calls": 0, "errors": 0, "micros": 0})
            bucket["tokens"] += log.token_count
            bucket["calls"] += 1
            bucket["micros"] += micros
            if is_error:
                bucket["errors"] += 1

        agents = [
            AgentStats(
                agent=v["agent"],
                workflow=v["workflow"],
                total_calls=v["calls"],
                success_calls=v["success"],
                error_calls=v["errors"],
                total_tokens=v["tokens"],
                avg_latency_ms=int(v["latency_total"] / v["calls"]) if v["calls"] else 0,
                cost_usd_cents=self._micros_to_usd_cents(v["micros"]),
                cost_usd_micros=v["micros"],
                cost_brl_cents=self._micros_to_brl_cents(v["micros"], rate),
            )
            for v in sorted(agent_map.values(), key=lambda x: x["micros"], reverse=True)
        ]
        daily = [
            DailyUsage(
                date=day,
                total_tokens=v["tokens"],
                total_calls=v["calls"],
                error_calls=v["errors"],
                cost_usd_cents=self._micros_to_usd_cents(v["micros"]),
                cost_usd_micros=v["micros"],
                cost_brl_cents=self._micros_to_brl_cents(v["micros"], rate),
            )
            for day, v in sorted(day_map.items())
        ]
        return AdminUserAIUsage(
            total_tokens=total_tokens,
            total_calls=total_calls,
            error_calls=error_calls,
            cost_usd_cents=self._micros_to_usd_cents(total_micros),
            cost_usd_micros=total_micros,
            cost_brl_cents=self._micros_to_brl_cents(total_micros, rate),
            usd_brl_rate=rate,
            rate_source=fx.source,
            agents=agents,
            daily=daily,
        )

    def _get_student(self, user_id: int) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise AppError("Aluno nao encontrado.", status_code=404, code="student_not_found")
        if user.role.value != "student":
            raise AppError("Esta acao so pode ser aplicada a alunos.", status_code=409, code="admin_user_protected")
        return user

    def content_tree(self) -> list[AdminCourseRead]:
        courses = self.db.scalars(
            select(Course)
            .options(
                selectinload(Course.modules).selectinload(Module.lessons),
                selectinload(Course.modules).selectinload(Module.exercises),
                selectinload(Course.modules).selectinload(Module.items).selectinload(ModuleItem.lesson),
                selectinload(Course.modules).selectinload(Module.items).selectinload(ModuleItem.exercise),
            )
            .order_by(Course.id)
        ).all()
        return [self._course_to_admin_read(course) for course in courses]

    def create_course(self, *, title: str, slug: str | None, description: str, color: str) -> AdminCourseRead:
        normalized_slug = self._unique_course_slug(slug or title)
        course = Course(title=title.strip(), slug=normalized_slug, description=description.strip(), color=color.strip() or "#65BE02")
        self.db.add(course)
        self.db.commit()
        self.db.refresh(course)
        return self._course_to_admin_read(course)

    def create_module(self, *, course_id: int, title: str, description: str, order: int | None) -> AdminModuleRead:
        course = self.db.get(Course, course_id)
        if not course:
            raise AppError("Curso nao encontrado.", status_code=404, code="course_not_found")
        module = Module(
            course_id=course_id,
            title=title.strip(),
            description=description.strip(),
            order=order or self._next_module_order(course_id),
        )
        self.db.add(module)
        self.db.commit()
        self.db.refresh(module)
        return self._module_to_admin_read(module)

    def create_lesson(
        self,
        *,
        module_id: int,
        title: str,
        description: str,
        thumbnail_url: str,
        video_url: str,
        summary: str,
        duration_minutes: int,
        order: int | None,
    ) -> AdminLessonRead:
        module = self.db.get(Module, module_id)
        if not module:
            raise AppError("Modulo nao encontrado.", status_code=404, code="module_not_found")
        lesson_order = order or self._next_lesson_order(module_id)
        item_order = order or self._next_item_order(module_id)
        lesson = Lesson(
            module_id=module_id,
            title=title.strip(),
            description=description.strip(),
            thumbnail_url=thumbnail_url.strip() or "/images/lessons/default.jpg",
            video_url=video_url.strip() or "https://www.youtube.com/embed/dQw4w9WgXcQ",
            summary=summary.strip(),
            duration_minutes=duration_minutes,
            order=lesson_order,
        )
        self.db.add(lesson)
        self.db.flush()
        self.db.add(
            ModuleItem(
                module_id=module_id,
                kind="lesson",
                lesson_id=lesson.id,
                order=item_order,
            )
        )
        self.db.commit()
        self.db.refresh(lesson)
        return self._lesson_to_admin_read(lesson)

    def create_activity(
        self,
        *,
        module_id: int,
        statement: str,
        options: list[str],
        correct_answer: str,
        explanation: str,
        skill: str,
        difficulty: str,
        lesson_id: int | None,
        base_lesson_ids: list[int],
        order: int | None,
    ) -> AdminCourseRead:
        module = self.db.get(Module, module_id)
        if not module:
            raise AppError("Modulo nao encontrado.", status_code=404, code="module_not_found")
        self._validate_activity_lessons(module_id=module_id, lesson_id=lesson_id, base_lesson_ids=base_lesson_ids)
        exercise = Exercise(
            module_id=module_id,
            lesson_id=lesson_id,
            statement=statement.strip(),
            options=[option.strip() for option in options],
            correct_answer=correct_answer,
            explanation=explanation.strip(),
            skill=skill.strip(),
            difficulty=Difficulty(difficulty),
            base_lesson_ids=base_lesson_ids,
        )
        self.db.add(exercise)
        self.db.flush()
        item_order = order or self._next_item_order(module_id)
        self.db.add(ModuleItem(module_id=module_id, kind="activity", exercise_id=exercise.id, order=item_order))
        self.db.commit()
        return self._course_read_by_id(module.course_id)

    def generate_activity_drafts(
        self,
        *,
        module_id: int,
        lesson_ids: list[int],
        difficulty: str,
        count: int,
        focus: str | None,
        admin_user_id: int,
    ) -> list[AdminActivityRead]:
        module = self.db.get(Module, module_id)
        if not module:
            raise AppError("Modulo nao encontrado.", status_code=404, code="module_not_found")
        lessons = list(
            self.db.scalars(select(Lesson).where(Lesson.module_id == module_id, Lesson.id.in_(lesson_ids)).order_by(Lesson.order, Lesson.id))
        )
        if len(lessons) != len(set(lesson_ids)):
            raise AppError("Selecione apenas aulas deste modulo.", status_code=422, code="invalid_activity_lessons")
        lesson_context = "\n\n".join(
            f"Aula: {lesson.title}\nDescricao: {lesson.description}\nResumo: {lesson.summary}" for lesson in lessons
        )
        generation_focus = focus.strip() if focus else f"atividade de fixacao com base nas aulas selecionadas:\n{lesson_context}"
        agent = ExerciseGeneratorAgent()
        result = agent.generate(
            focus=generation_focus,
            difficulty=difficulty,  # type: ignore[arg-type]
            count=count,
            profile={"source": "admin_course_builder", "lesson_ids": lesson_ids},
            user_id=admin_user_id,
            session_id=f"admin:{admin_user_id}:course-activity",
        )
        record_ai_interaction(
            self.db,
            workflow="admin_activity_generation",
            agent="ExerciseGeneratorAgent",
            user_id=admin_user_id,
            runner=agent.runner,
            meta={"module_id": module_id, "lesson_ids": lesson_ids, "difficulty": difficulty, "count": count},
        )
        drafts: list[AdminActivityRead] = []
        for index, question in enumerate(result.questions[:count], start=1):
            drafts.append(
                AdminActivityRead(
                    id=0 - index,
                    statement=question.statement,
                    options=question.options,
                    correct_answer=question.correct_answer,
                    explanation=question.explanation,
                    skill=question.skill,
                    difficulty=question.difficulty,
                    lesson_id=lesson_ids[-1] if lesson_ids else None,
                    base_lesson_ids=lesson_ids,
                    order=self._next_item_order(module_id),
                )
            )
        self.db.commit()
        return drafts

    def _course_read_by_id(self, course_id: int) -> AdminCourseRead:
        course = self.db.scalars(
            select(Course)
            .options(
                selectinload(Course.modules).selectinload(Module.lessons),
                selectinload(Course.modules).selectinload(Module.exercises),
                selectinload(Course.modules).selectinload(Module.items).selectinload(ModuleItem.lesson),
                selectinload(Course.modules).selectinload(Module.items).selectinload(ModuleItem.exercise),
            )
            .where(Course.id == course_id)
        ).first()
        if not course:
            raise AppError("Curso nao encontrado.", status_code=404, code="course_not_found")
        return self._course_to_admin_read(course)

    def update_course(self, *, course_id: int, title: str | None, description: str | None, color: str | None) -> AdminCourseRead:
        course = self.db.get(Course, course_id)
        if not course:
            raise AppError("Curso nao encontrado.", status_code=404, code="course_not_found")
        if title is not None:
            course.title = title.strip()
        if description is not None:
            course.description = description.strip()
        if color is not None:
            course.color = color.strip() or course.color
        self.db.commit()
        return self._course_read_by_id(course_id)

    def delete_course(self, *, course_id: int) -> None:
        course = self.db.get(Course, course_id)
        if not course:
            raise AppError("Curso nao encontrado.", status_code=404, code="course_not_found")
        self.db.delete(course)
        self.db.commit()

    def update_module(self, *, module_id: int, title: str | None, description: str | None) -> AdminCourseRead:
        module = self.db.get(Module, module_id)
        if not module:
            raise AppError("Modulo nao encontrado.", status_code=404, code="module_not_found")
        if title is not None:
            module.title = title.strip()
        if description is not None:
            module.description = description.strip()
        self.db.commit()
        return self._course_read_by_id(module.course_id)

    def delete_module(self, *, module_id: int) -> AdminCourseRead:
        module = self.db.get(Module, module_id)
        if not module:
            raise AppError("Modulo nao encontrado.", status_code=404, code="module_not_found")
        course_id = module.course_id
        self.db.delete(module)
        self.db.commit()
        return self._course_read_by_id(course_id)

    def move_module(self, *, module_id: int, direction: str) -> AdminCourseRead:
        module = self.db.get(Module, module_id)
        if not module:
            raise AppError("Modulo nao encontrado.", status_code=404, code="module_not_found")
        siblings = list(
            self.db.scalars(
                select(Module).where(Module.course_id == module.course_id).order_by(Module.order, Module.id)
            )
        )
        self._swap_order(siblings, module.id, direction)
        self.db.commit()
        return self._course_read_by_id(module.course_id)

    def update_lesson(
        self,
        *,
        lesson_id: int,
        title: str | None,
        description: str | None,
        summary: str | None,
        thumbnail_url: str | None,
        video_url: str | None,
        duration_minutes: int | None,
    ) -> AdminCourseRead:
        lesson = self.db.get(Lesson, lesson_id)
        if not lesson:
            raise AppError("Aula nao encontrada.", status_code=404, code="lesson_not_found")
        if title is not None:
            lesson.title = title.strip()
        if description is not None:
            lesson.description = description.strip()
        if summary is not None:
            lesson.summary = summary.strip()
        if thumbnail_url is not None:
            lesson.thumbnail_url = thumbnail_url.strip() or lesson.thumbnail_url
        if video_url is not None:
            lesson.video_url = video_url.strip() or lesson.video_url
        if duration_minutes is not None:
            lesson.duration_minutes = duration_minutes
        self.db.commit()
        return self._course_read_by_id(self.db.get(Module, lesson.module_id).course_id)

    def delete_lesson(self, *, lesson_id: int) -> AdminCourseRead:
        lesson = self.db.get(Lesson, lesson_id)
        if not lesson:
            raise AppError("Aula nao encontrada.", status_code=404, code="lesson_not_found")
        course_id = self.db.get(Module, lesson.module_id).course_id
        self.db.delete(lesson)
        self.db.commit()
        return self._course_read_by_id(course_id)

    def move_lesson(self, *, lesson_id: int, direction: str) -> AdminCourseRead:
        lesson = self.db.get(Lesson, lesson_id)
        if not lesson:
            raise AppError("Aula nao encontrada.", status_code=404, code="lesson_not_found")
        item = self.db.scalar(select(ModuleItem).where(ModuleItem.lesson_id == lesson_id))
        if item:
            return self.move_module_item(item_id=item.id, direction=direction)
        siblings = list(
            self.db.scalars(
                select(Lesson).where(Lesson.module_id == lesson.module_id).order_by(Lesson.order, Lesson.id)
            )
        )
        self._swap_order(siblings, lesson.id, direction)
        self.db.commit()
        return self._course_read_by_id(self.db.get(Module, lesson.module_id).course_id)

    def update_activity(
        self,
        *,
        activity_id: int,
        statement: str | None,
        options: list[str] | None,
        correct_answer: str | None,
        explanation: str | None,
        skill: str | None,
        difficulty: str | None,
        lesson_id: int | None,
        base_lesson_ids: list[int] | None,
    ) -> AdminCourseRead:
        exercise = self.db.get(Exercise, activity_id)
        if not exercise:
            raise AppError("Atividade nao encontrada.", status_code=404, code="activity_not_found")
        if base_lesson_ids is not None or lesson_id is not None:
            self._validate_activity_lessons(
                module_id=exercise.module_id,
                lesson_id=lesson_id,
                base_lesson_ids=base_lesson_ids if base_lesson_ids is not None else exercise.base_lesson_ids,
            )
        if statement is not None:
            exercise.statement = statement.strip()
        if options is not None:
            exercise.options = [option.strip() for option in options]
        if correct_answer is not None:
            exercise.correct_answer = correct_answer
        if explanation is not None:
            exercise.explanation = explanation.strip()
        if skill is not None:
            exercise.skill = skill.strip()
        if difficulty is not None:
            exercise.difficulty = Difficulty(difficulty)
        if lesson_id is not None:
            exercise.lesson_id = lesson_id
        if base_lesson_ids is not None:
            exercise.base_lesson_ids = base_lesson_ids
        self.db.commit()
        return self._course_read_by_id(self.db.get(Module, exercise.module_id).course_id)

    def delete_activity(self, *, activity_id: int) -> AdminCourseRead:
        exercise = self.db.get(Exercise, activity_id)
        if not exercise:
            raise AppError("Atividade nao encontrada.", status_code=404, code="activity_not_found")
        course_id = self.db.get(Module, exercise.module_id).course_id
        item = self.db.scalar(select(ModuleItem).where(ModuleItem.exercise_id == activity_id))
        if item:
            self.db.delete(item)
        self.db.delete(exercise)
        self.db.commit()
        return self._course_read_by_id(course_id)

    def move_module_item(self, *, item_id: int, direction: str) -> AdminCourseRead:
        item = self.db.get(ModuleItem, item_id)
        if not item:
            raise AppError("Item do modulo nao encontrado.", status_code=404, code="module_item_not_found")
        siblings = list(
            self.db.scalars(select(ModuleItem).where(ModuleItem.module_id == item.module_id).order_by(ModuleItem.order, ModuleItem.id))
        )
        self._swap_order(siblings, item.id, direction)
        self._sync_lesson_orders(item.module_id)
        self.db.commit()
        return self._course_read_by_id(self.db.get(Module, item.module_id).course_id)

    def _swap_order(self, siblings: list, item_id: int, direction: str) -> None:
        # Normaliza ordens sequenciais (1..n) e troca com o vizinho.
        for position, sibling in enumerate(siblings):
            sibling.order = position + 1
        index = next((i for i, s in enumerate(siblings) if s.id == item_id), None)
        if index is None:
            return
        target = index - 1 if direction == "up" else index + 1
        if target < 0 or target >= len(siblings):
            return
        siblings[index].order, siblings[target].order = siblings[target].order, siblings[index].order

    def _next_module_order(self, course_id: int) -> int:
        current = self.db.scalar(select(func.max(Module.order)).where(Module.course_id == course_id)) or 0
        return int(current) + 1

    def _next_lesson_order(self, module_id: int) -> int:
        current = self.db.scalar(select(func.max(Lesson.order)).where(Lesson.module_id == module_id)) or 0
        return int(current) + 1

    def _next_item_order(self, module_id: int) -> int:
        current = self.db.scalar(select(func.max(ModuleItem.order)).where(ModuleItem.module_id == module_id)) or 0
        if current:
            return int(current) + 1
        return self._next_lesson_order(module_id)

    def _sync_lesson_orders(self, module_id: int) -> None:
        items = list(
            self.db.scalars(
                select(ModuleItem).where(ModuleItem.module_id == module_id, ModuleItem.kind == "lesson").order_by(ModuleItem.order, ModuleItem.id)
            )
        )
        for position, item in enumerate(items, start=1):
            if item.lesson:
                item.lesson.order = position

    def _validate_activity_lessons(self, *, module_id: int, lesson_id: int | None, base_lesson_ids: list[int]) -> None:
        ids = {item for item in [lesson_id, *base_lesson_ids] if item is not None}
        if not ids:
            return
        found = set(self.db.scalars(select(Lesson.id).where(Lesson.module_id == module_id, Lesson.id.in_(ids))))
        if found != ids:
            raise AppError("Selecione apenas aulas deste modulo para a atividade.", status_code=422, code="invalid_activity_lessons")

    def _unique_course_slug(self, value: str) -> str:
        base = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "curso"
        slug = base[:140]
        suffix = 2
        while self.db.scalar(select(Course.id).where(Course.slug == slug)):
            suffix_text = f"-{suffix}"
            slug = f"{base[: 140 - len(suffix_text)]}{suffix_text}"
            suffix += 1
        return slug

    def _course_to_admin_read(self, course: Course) -> AdminCourseRead:
        modules = sorted(course.modules, key=lambda item: item.order)
        return AdminCourseRead(
            id=course.id,
            title=course.title,
            slug=course.slug,
            description=course.description,
            color=course.color,
            modules=[self._module_to_admin_read(module) for module in modules],
        )

    def _module_to_admin_read(self, module: Module) -> AdminModuleRead:
        lessons = sorted(module.lessons, key=lambda item: item.order)
        items = self._module_items(module)
        return AdminModuleRead(
            id=module.id,
            title=module.title,
            description=module.description,
            order=module.order,
            lessons=[self._lesson_to_admin_read(lesson) for lesson in lessons],
            items=items,
        )

    def _lesson_to_admin_read(self, lesson: Lesson) -> AdminLessonRead:
        return AdminLessonRead(
            id=lesson.id,
            title=lesson.title,
            description=lesson.description,
            thumbnail_url=lesson.thumbnail_url,
            video_url=lesson.video_url,
            summary=lesson.summary,
            duration_minutes=lesson.duration_minutes,
            order=lesson.order,
        )

    def _activity_to_admin_read(self, exercise: Exercise, order: int | None = None) -> AdminActivityRead:
        item_order = order
        if item_order is None and exercise.module_item:
            item_order = exercise.module_item.order
        return AdminActivityRead(
            id=exercise.id,
            statement=exercise.statement,
            options=exercise.options,
            correct_answer=exercise.correct_answer,
            explanation=exercise.explanation,
            skill=exercise.skill,
            difficulty=exercise.difficulty.value,
            lesson_id=exercise.lesson_id,
            base_lesson_ids=exercise.base_lesson_ids or [],
            order=item_order or 0,
        )

    def _module_items(self, module: Module) -> list[AdminModuleItemRead]:
        explicit_items = [item for item in module.items if (item.kind == "lesson" and item.lesson) or (item.kind == "activity" and item.exercise)]
        if not explicit_items:
            return [
                AdminModuleItemRead(id=0 - lesson.id, kind="lesson", order=lesson.order, lesson=self._lesson_to_admin_read(lesson))
                for lesson in sorted(module.lessons, key=lambda item: (item.order, item.id))
            ]
        return [
            AdminModuleItemRead(
                id=item.id,
                kind="lesson" if item.kind == "lesson" else "activity",
                order=item.order,
                lesson=self._lesson_to_admin_read(item.lesson) if item.kind == "lesson" and item.lesson else None,
                activity=self._activity_to_admin_read(item.exercise, order=item.order) if item.kind == "activity" and item.exercise else None,
            )
            for item in sorted(explicit_items, key=lambda entry: (entry.order, entry.id))
        ]

    def ai_telemetry(self, period_days: int = 30) -> AITelemetryResponse:
        since = datetime.now(timezone.utc) - timedelta(days=period_days)
        fx = get_usd_brl()
        rate = fx.rate

        base = select(AIInteractionLog).where(AIInteractionLog.created_at >= since)
        logs = self.db.scalars(base).all()

        total_tokens = sum(log.token_count for log in logs)
        total_calls = len(logs)
        error_calls = sum(1 for log in logs if log.status == "error")
        total_micros = sum(self._log_cost_micros(log) for log in logs)

        agent_map: dict[str, dict] = {}
        workflow_map: dict[str, dict] = {}
        model_map: dict[str, dict] = {}
        day_map: dict[str, dict] = {}
        for log in logs:
            micros = self._log_cost_micros(log)
            is_error = log.status == "error"

            key = f"{log.workflow}::{log.agent}"
            agent = agent_map.setdefault(
                key,
                {"agent": log.agent, "workflow": log.workflow, "calls": 0, "success": 0, "errors": 0, "tokens": 0, "latency_total": 0, "micros": 0},
            )
            agent["calls"] += 1
            agent["tokens"] += log.token_count
            agent["latency_total"] += log.latency_ms
            agent["micros"] += micros
            agent["errors" if is_error else "success"] += 1

            wf = workflow_map.setdefault(
                log.workflow, {"workflow": log.workflow, "calls": 0, "errors": 0, "tokens": 0, "micros": 0}
            )
            wf["calls"] += 1
            wf["tokens"] += log.token_count
            wf["micros"] += micros
            if is_error:
                wf["errors"] += 1

            model_name = log.model or (log.meta or {}).get("model") or "desconhecido"
            md = model_map.setdefault(model_name, {"model": model_name, "calls": 0, "tokens": 0, "micros": 0})
            md["calls"] += 1
            md["tokens"] += log.token_count
            md["micros"] += micros

            day = log.created_at.strftime("%Y-%m-%d") if log.created_at else "unknown"
            bucket = day_map.setdefault(day, {"tokens": 0, "calls": 0, "errors": 0, "micros": 0})
            bucket["tokens"] += log.token_count
            bucket["calls"] += 1
            bucket["micros"] += micros
            if is_error:
                bucket["errors"] += 1

        agents = [
            AgentStats(
                agent=v["agent"],
                workflow=v["workflow"],
                total_calls=v["calls"],
                success_calls=v["success"],
                error_calls=v["errors"],
                total_tokens=v["tokens"],
                avg_latency_ms=int(v["latency_total"] / v["calls"]) if v["calls"] else 0,
                cost_usd_cents=self._micros_to_usd_cents(v["micros"]),
                cost_usd_micros=v["micros"],
                cost_brl_cents=self._micros_to_brl_cents(v["micros"], rate),
            )
            for v in sorted(agent_map.values(), key=lambda x: x["micros"], reverse=True)
        ]

        workflows = [
            WorkflowStats(
                workflow=v["workflow"],
                total_calls=v["calls"],
                error_calls=v["errors"],
                total_tokens=v["tokens"],
                cost_usd_micros=v["micros"],
                cost_brl_cents=self._micros_to_brl_cents(v["micros"], rate),
                avg_cost_brl_cents=self._micros_to_brl_cents(int(v["micros"] / v["calls"]) if v["calls"] else 0, rate),
            )
            for v in sorted(workflow_map.values(), key=lambda x: x["micros"], reverse=True)
        ]

        models = [
            ModelStats(
                model=v["model"],
                total_calls=v["calls"],
                total_tokens=v["tokens"],
                cost_usd_micros=v["micros"],
                cost_brl_cents=self._micros_to_brl_cents(v["micros"], rate),
            )
            for v in sorted(model_map.values(), key=lambda x: x["micros"], reverse=True)
        ]

        daily = [
            DailyUsage(
                date=day,
                total_tokens=v["tokens"],
                total_calls=v["calls"],
                error_calls=v["errors"],
                cost_usd_cents=self._micros_to_usd_cents(v["micros"]),
                cost_usd_micros=v["micros"],
                cost_brl_cents=self._micros_to_brl_cents(v["micros"], rate),
            )
            for day, v in sorted(day_map.items())
        ]

        # top users por custo (micro-USD agregado)
        user_micros: dict[int, dict] = {}
        for log in logs:
            if log.user_id is None:
                continue
            entry = user_micros.setdefault(log.user_id, {"tokens": 0, "micros": 0})
            entry["tokens"] += log.token_count
            entry["micros"] += self._log_cost_micros(log)
        top_sorted = sorted(user_micros.items(), key=lambda kv: kv[1]["micros"], reverse=True)[:10]
        user_ids = [uid for uid, _ in top_sorted]
        user_names: dict[int, str] = {}
        if user_ids:
            name_rows = self.db.execute(select(User.id, User.name, User.email).where(User.id.in_(user_ids))).all()
            user_names = {row.id: f"{row.name} ({row.email})" for row in name_rows}
        top_users = [
            {
                "user_id": uid,
                "label": user_names.get(uid, f"User {uid}"),
                "total_tokens": data["tokens"],
                "cost_usd_cents": self._micros_to_usd_cents(data["micros"]),
                "cost_usd_micros": data["micros"],
                "cost_brl_cents": self._micros_to_brl_cents(data["micros"], rate),
            }
            for uid, data in top_sorted
        ]

        return AITelemetryResponse(
            period_days=period_days,
            has_data=total_calls > 0,
            total_tokens=total_tokens,
            total_calls=total_calls,
            error_calls=error_calls,
            cost_usd_cents=self._micros_to_usd_cents(total_micros),
            cost_usd_micros=total_micros,
            cost_brl_cents=self._micros_to_brl_cents(total_micros, rate),
            usd_brl_rate=rate,
            rate_source=fx.source,
            agents=agents,
            workflows=workflows,
            models=models,
            daily=daily,
            top_users=top_users,
        )

    # ── User Activity ──────────────────────────────────────────────────────────

    def user_activity(self, period_days: int = 7) -> UserActivityResponse:
        since = datetime.now(timezone.utc) - timedelta(days=period_days)
        events = self.db.scalars(select(UserEvent).where(UserEvent.created_at >= since)).all()
        total_events = len(events)

        type_map: dict[str, int] = {}
        for ev in events:
            type_map[ev.event_type] = type_map.get(ev.event_type, 0) + 1

        by_type = [EventTypeSummary(event_type=k, count=v) for k, v in sorted(type_map.items(), key=lambda x: x[1], reverse=True)]

        online_cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
        online_now = self.db.scalar(
            select(func.count(User.id)).where(User.last_seen_at >= online_cutoff)
        ) or 0

        return UserActivityResponse(
            period_days=period_days,
            total_events=total_events,
            by_type=by_type,
            online_now=online_now,
        )

    # ── Event Tracking ────────────────────────────────────────────────────────

    def track_event(
        self,
        *,
        user_id: int | None,
        event_type: str,
        entity_id: str | None = None,
        entity_type: str | None = None,
        duration_ms: int | None = None,
        meta: dict | None = None,
    ) -> None:
        self.db.add(
            UserEvent(
                user_id=user_id,
                event_type=event_type,
                entity_id=entity_id,
                entity_type=entity_type,
                duration_ms=duration_ms,
                meta=meta or {},
            )
        )
        self.db.commit()

    # ── AI Game Generation ────────────────────────────────────────────────────

    def generate_game(
        self,
        *,
        skill: str,
        category: str,
        difficulty: str,
        count: int,
        name: str | None,
        admin_user_id: int,
    ) -> AIGeneratedGameRead:
        agent = GameGeneratorAgent()
        result = agent.generate(skill=skill, category=category, difficulty=difficulty, count=count, user_id=admin_user_id)
        game = AIGeneratedGame(
            name=name or result.name,
            category=category,
            skill=skill,
            difficulty=difficulty,
            xp_reward=40,
            questions=[{"prompt": q.prompt, "options": q.options, "answer_index": q.answer_index, "explanation": q.explanation} for q in result.questions],
            status="pending",
        )
        self.db.add(game)
        record_ai_interaction(
            self.db,
            workflow="admin_game_generation",
            agent="GameGeneratorAgent",
            user_id=admin_user_id,
            runner=agent.runner,
            meta={"skill": skill, "category": category, "difficulty": difficulty, "count": count},
        )
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def list_ai_games(self, status: str | None = None) -> list[AIGeneratedGameRead]:
        query = select(AIGeneratedGame).order_by(AIGeneratedGame.created_at.desc())
        if status:
            query = query.where(AIGeneratedGame.status == status)
        games = self.db.scalars(query).all()
        return [self._game_to_read(g) for g in games]

    def review_game(
        self,
        game_id: int,
        *,
        action: str,
        notes: str | None,
        questions: list[dict] | None,
        name: str | None,
        xp_reward: int | None,
        reviewer_id: int,
    ) -> AIGeneratedGameRead:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo nao encontrado.", status_code=404, code="game_not_found")
        game.status = "approved" if action == "approve" else "rejected"
        game.reviewed_at = datetime.now(timezone.utc)
        game.reviewed_by = reviewer_id
        if notes is not None:
            game.admin_notes = notes
        if questions is not None:
            game.questions = questions
        if name is not None:
            game.name = name
        if xp_reward is not None:
            game.xp_reward = xp_reward
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def update_game(
        self,
        game_id: int,
        *,
        name: str | None = None,
        xp_reward: int | None = None,
        questions: list[dict] | None = None,
    ) -> AIGeneratedGameRead:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo nao encontrado.", status_code=404, code="game_not_found")
        if name is not None:
            game.name = name
        if xp_reward is not None:
            game.xp_reward = xp_reward
        if questions is not None:
            game.questions = questions
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def delete_game(self, game_id: int) -> None:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo nao encontrado.", status_code=404, code="game_not_found")
        self.db.delete(game)
        self.db.commit()

    def _game_to_read(self, game: AIGeneratedGame) -> AIGeneratedGameRead:
        questions = [
            GameQuestionRead(
                prompt=q.get("prompt", ""),
                options=q.get("options", []),
                answer_index=q.get("answer_index", 0),
                explanation=q.get("explanation", ""),
            )
            for q in (game.questions or [])
        ]
        return AIGeneratedGameRead(
            id=game.id,
            name=game.name,
            category=game.category,
            skill=game.skill,
            difficulty=game.difficulty,
            xp_reward=game.xp_reward,
            questions=questions,
            status=game.status,
            admin_notes=game.admin_notes,
            created_at=game.created_at,
            reviewed_at=game.reviewed_at,
        )
