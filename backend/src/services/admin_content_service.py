from __future__ import annotations

import re
import unicodedata

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from src.agents.exercise import ExerciseGeneratorAgent
from src.agents.image_generator import generate_supporting_image
from src.agents.theme_generator import ThemeGeneratorAgent
from src.config.ai_pricing import image_generation_cost_micro_usd
from src.middlewares.errors import AppError
from src.models import AIInteractionLog, Difficulty, EssayTheme, Exercise, Lesson, Module, ModuleItem
from src.schemas.admin import (
    AdminActivityRead,
    AdminLessonRead,
    AdminModuleItemRead,
    AdminModuleRead,
)
from src.services.ai_telemetry import record_ai_interaction, safe_persist_interaction


class AdminContentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Essay Themes ─────────────────────────────────────────────────────────

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
            raise AppError("A IA retornou um tema já existente. Tente gerar novamente.", status_code=409, code="duplicate_theme")

        self._generate_supporting_images(generated.supporting_texts, admin_user_id=admin_user_id)

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
                raise AppError("Título do tema precisa ter pelo menos 8 caracteres.", status_code=422, code="invalid_theme_title")
            normalized_title = self._normalize_theme_title(cleaned_title)
            active_titles = list(
                self.db.scalars(
                    select(EssayTheme.title).where(EssayTheme.id != theme_id, EssayTheme.is_active.is_(True))
                )
            )
            if normalized_title in {self._normalize_theme_title(item) for item in active_titles}:
                raise AppError("Já existe um tema ativo com esse título.", status_code=409, code="duplicate_theme")
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

    def _generate_supporting_images(self, supporting_texts: list, *, admin_user_id: int) -> None:
        """Gera imagem real (charge/tirinha) para os textos de apoio que pedirem, in-place.

        Falha ou ausencia de API key mantem image_url=None (fallback textual no frontend);
        telemetria de custo/latencia sempre e registrada, mesmo em falha."""

        for supporting_text in supporting_texts:
            supporting_text.image_url = None
            if supporting_text.type not in {"charge", "tirinha"} or not supporting_text.image_prompt:
                continue
            image_url, meta = generate_supporting_image(supporting_text.image_prompt)
            supporting_text.image_url = image_url
            safe_persist_interaction(
                self.db,
                AIInteractionLog(
                    user_id=admin_user_id,
                    workflow="admin_theme_generation",
                    agent="image_generator",
                    status=meta.status,
                    latency_ms=meta.latency_ms,
                    token_count=0,
                    input_tokens=0,
                    output_tokens=0,
                    cost_micro_usd=image_generation_cost_micro_usd(meta.model) if meta.status == "success" else 0,
                    model=meta.model,
                    error=meta.error,
                    meta={"supporting_text_type": supporting_text.type},
                ),
            )

    def _normalize_supporting_texts(self, texts: list[dict], requirements: dict[str, int] | None = None) -> list[dict]:
        allowed = {
            "motivador",
            "dados",
            "repertorio",
            "imagem",
            "grafico",
            "infografico",
            "postagem",
            "manchete",
            "tirinha",
            "charge",
        }
        structured_keys = (
            "chart_points",
            "stat_items",
            "comic_panels",
            "post_author",
            "post_handle",
            "headline_subtitle",
            "headline_source",
            "image_prompt",
            "image_url",
        )
        cleaned: list[dict] = []
        for item in texts:
            kind = str(item.get("type") or "motivador").strip()
            title = str(item.get("title") or "").strip()
            content = str(item.get("content") or "").strip()
            if kind not in allowed:
                raise AppError("Tipo de texto motivador inválido.", status_code=422, code="invalid_supporting_text_type")
            if len(title) < 4:
                raise AppError("Título do texto motivador precisa ter pelo menos 4 caracteres.", status_code=422, code="invalid_supporting_text")
            if len(content) < 20:
                raise AppError("Texto motivador precisa ter pelo menos 20 caracteres.", status_code=422, code="invalid_supporting_text")
            normalized = {"title": title, "content": content, "type": kind}
            for key in structured_keys:
                if item.get(key) is not None:
                    normalized[key] = item[key]
            cleaned.append(normalized)
        if not cleaned:
            raise AppError("Adicione pelo menos um texto motivador.", status_code=422, code="missing_supporting_texts")
        if len(cleaned) > 8:
            raise AppError("Use no máximo 8 textos motivadores por tema.", status_code=422, code="too_many_supporting_texts")
        for kind, amount in (requirements or {}).items():
            if amount > 0 and sum(1 for item in cleaned if item["type"] == kind) < amount:
                raise AppError("A IA não gerou a quantidade solicitada de textos motivadores.", status_code=422, code="supporting_text_count_mismatch")
        return cleaned

    def delete_essay_theme(self, *, theme_id: int) -> None:
        theme = self._get_active_essay_theme(theme_id)
        theme.is_active = False
        self.db.commit()

    def _get_active_essay_theme(self, theme_id: int) -> EssayTheme:
        theme = self.db.get(EssayTheme, theme_id)
        if not theme or not theme.is_active:
            raise AppError("Tema de redação não encontrado.", status_code=404, code="theme_not_found")
        return theme

    def _clean_theme_title(self, title: str) -> str:
        cleaned = re.sub(r"^\s*(?:tema\s*)?\d+\s*[\).:\-]\s*", "", title.strip(), flags=re.IGNORECASE)
        cleaned = cleaned.strip(" \"'")
        return re.sub(r"\s+", " ", cleaned)

    def _normalize_theme_title(self, title: str) -> str:
        text = unicodedata.normalize("NFKD", title.lower())
        text = "".join(char for char in text if not unicodedata.combining(char))
        return re.sub(r"[^a-z0-9]+", "", text)

    # ── Content Tree ─────────────────────────────────────────────────────────

    def content_tree(self) -> list[AdminModuleRead]:
        modules = self.db.scalars(
            select(Module)
            .options(
                selectinload(Module.lessons),
                selectinload(Module.exercises),
                selectinload(Module.items).selectinload(ModuleItem.lesson),
                selectinload(Module.items).selectinload(ModuleItem.exercise),
            )
            .order_by(Module.order, Module.id)
        ).all()
        return [self._module_to_admin_read(module) for module in modules]

    def create_module(self, *, title: str, slug: str | None, description: str, color: str, order: int | None) -> list[AdminModuleRead]:
        normalized_slug = self._unique_module_slug(slug or title)
        module = Module(
            title=title.strip(),
            slug=normalized_slug,
            description=description.strip(),
            color=color.strip() or "#65BE02",
            order=order or self._next_module_order(),
        )
        self.db.add(module)
        self.db.commit()
        self.db.refresh(module)
        return self.content_tree()

    def create_lesson(
        self,
        *,
        module_id: int,
        title: str,
        description: str,
        thumbnail_url: str,
        video_url: str,
        pdf_url: str | None = None,
        summary: str,
        duration_minutes: int,
        order: int | None,
        targets: list[str] | None = None,
    ) -> AdminLessonRead:
        module = self.db.get(Module, module_id)
        if not module:
            raise AppError("Módulo não encontrado.", status_code=404, code="module_not_found")
        lesson_order = order or self._next_lesson_order(module_id)
        item_order = order or self._next_item_order(module_id)
        lesson = Lesson(
            module_id=module_id,
            title=title.strip(),
            description=description.strip(),
            thumbnail_url=thumbnail_url.strip() or "/images/lessons/default.jpg",
            video_url=video_url.strip() or "https://www.youtube.com/embed/dQw4w9WgXcQ",
            pdf_url=(pdf_url or "").strip() or None,
            summary=summary.strip(),
            duration_minutes=duration_minutes,
            order=lesson_order,
            targets=targets or [],
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
        targets: list[str] | None = None,
    ) -> list[AdminModuleRead]:
        module = self.db.get(Module, module_id)
        if not module:
            raise AppError("Módulo não encontrado.", status_code=404, code="module_not_found")
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
            targets=targets or [],
        )
        self.db.add(exercise)
        self.db.flush()
        item_order = order or self._next_item_order(module_id)
        self.db.add(ModuleItem(module_id=module_id, kind="activity", exercise_id=exercise.id, order=item_order))
        self.db.commit()
        return self.content_tree()

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
            raise AppError("Módulo não encontrado.", status_code=404, code="module_not_found")
        lessons = list(
            self.db.scalars(select(Lesson).where(Lesson.module_id == module_id, Lesson.id.in_(lesson_ids)).order_by(Lesson.order, Lesson.id))
        )
        if len(lessons) != len(set(lesson_ids)):
            raise AppError("Selecione apenas aulas deste módulo.", status_code=422, code="invalid_activity_lessons")
        lesson_context = "\n\n".join(
            f"Aula: {lesson.title}\nDescricao: {lesson.description}\nResumo: {lesson.summary}" for lesson in lessons
        )
        generation_focus = focus.strip() if focus else f"atividade de fixacao com base nas aulas selecionadas:\n{lesson_context}"
        agent = ExerciseGeneratorAgent()
        result = agent.generate(
            focus=generation_focus,
            difficulty=difficulty,  # type: ignore[arg-type]
            count=count,
            profile={"source": "admin_module_builder", "lesson_ids": lesson_ids},
            user_id=admin_user_id,
            session_id=f"admin:{admin_user_id}:module-activity",
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

    def update_module(self, *, module_id: int, title: str | None, description: str | None, color: str | None) -> list[AdminModuleRead]:
        module = self.db.get(Module, module_id)
        if not module:
            raise AppError("Módulo não encontrado.", status_code=404, code="module_not_found")
        if title is not None:
            module.title = title.strip()
        if description is not None:
            module.description = description.strip()
        if color is not None:
            module.color = color.strip() or module.color
        self.db.commit()
        return self.content_tree()

    def delete_module(self, *, module_id: int) -> list[AdminModuleRead]:
        module = self.db.get(Module, module_id)
        if not module:
            raise AppError("Módulo não encontrado.", status_code=404, code="module_not_found")
        self.db.delete(module)
        self.db.commit()
        return self.content_tree()

    def move_module(self, *, module_id: int, direction: str) -> list[AdminModuleRead]:
        module = self.db.get(Module, module_id)
        if not module:
            raise AppError("Módulo não encontrado.", status_code=404, code="module_not_found")
        siblings = list(self.db.scalars(select(Module).order_by(Module.order, Module.id)))
        self._swap_order(siblings, module.id, direction)
        self.db.commit()
        return self.content_tree()

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
        targets: list[str] | None = None,
    ) -> list[AdminModuleRead]:
        lesson = self.db.get(Lesson, lesson_id)
        if not lesson:
            raise AppError("Aula não encontrada.", status_code=404, code="lesson_not_found")
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
        if targets is not None:
            lesson.targets = targets
        self.db.commit()
        return self.content_tree()

    def delete_lesson(self, *, lesson_id: int) -> list[AdminModuleRead]:
        lesson = self.db.get(Lesson, lesson_id)
        if not lesson:
            raise AppError("Aula não encontrada.", status_code=404, code="lesson_not_found")
        self.db.delete(lesson)
        self.db.commit()
        return self.content_tree()

    def move_lesson(self, *, lesson_id: int, direction: str) -> list[AdminModuleRead]:
        lesson = self.db.get(Lesson, lesson_id)
        if not lesson:
            raise AppError("Aula não encontrada.", status_code=404, code="lesson_not_found")
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
        return self.content_tree()

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
        targets: list[str] | None = None,
    ) -> list[AdminModuleRead]:
        exercise = self.db.get(Exercise, activity_id)
        if not exercise:
            raise AppError("Atividade não encontrada.", status_code=404, code="activity_not_found")
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
        if targets is not None:
            exercise.targets = targets
        self.db.commit()
        return self.content_tree()

    def delete_activity(self, *, activity_id: int) -> list[AdminModuleRead]:
        exercise = self.db.get(Exercise, activity_id)
        if not exercise:
            raise AppError("Atividade não encontrada.", status_code=404, code="activity_not_found")
        item = self.db.scalar(select(ModuleItem).where(ModuleItem.exercise_id == activity_id))
        if item:
            self.db.delete(item)
        self.db.delete(exercise)
        self.db.commit()
        return self.content_tree()

    def move_module_item(self, *, item_id: int, direction: str) -> list[AdminModuleRead]:
        item = self.db.get(ModuleItem, item_id)
        if not item:
            raise AppError("Item do módulo não encontrado.", status_code=404, code="module_item_not_found")
        siblings = list(
            self.db.scalars(select(ModuleItem).where(ModuleItem.module_id == item.module_id).order_by(ModuleItem.order, ModuleItem.id))
        )
        self._swap_order(siblings, item.id, direction)
        self._sync_lesson_orders(item.module_id)
        self.db.commit()
        return self.content_tree()

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

    def _next_module_order(self) -> int:
        current = self.db.scalar(select(func.max(Module.order))) or 0
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
            raise AppError("Selecione apenas aulas deste módulo para a atividade.", status_code=422, code="invalid_activity_lessons")

    def _unique_module_slug(self, value: str) -> str:
        base = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "modulo"
        slug = base[:140]
        suffix = 2
        while self.db.scalar(select(Module.id).where(Module.slug == slug)):
            suffix_text = f"-{suffix}"
            slug = f"{base[: 140 - len(suffix_text)]}{suffix_text}"
            suffix += 1
        return slug

    def _module_to_admin_read(self, module: Module) -> AdminModuleRead:
        lessons = sorted(module.lessons, key=lambda item: item.order)
        items = self._module_items(module)
        return AdminModuleRead(
            id=module.id,
            title=module.title,
            slug=module.slug,
            description=module.description,
            color=module.color,
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
            targets=lesson.targets or [],
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
            targets=exercise.targets or [],
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
