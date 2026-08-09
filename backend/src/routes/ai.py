from __future__ import annotations

import json
import time
from collections.abc import Generator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.agents.analytics import AnalyticsAgent
from src.agents.exercise import ExerciseGeneratorAgent
from src.agents.rewrite_evaluator import RewriteEvaluatorAgent
from src.agents.study_planner import StudyPlannerAgent
from src.database.session import get_db
from src.dependencies import get_current_user
from src.memory import get_learning_profile_payload
from src.middlewares.errors import AppError
from src.models import User
from src.queues import AIJobService, enqueue_correct_essay
from src.queues.jobs import job_payload
from src.queues.tasks import run_correct_essay_job
from src.schemas.common import ApiResponse, success_response
from src.schemas.ai import (
    AIAnalyzeRequest,
    AICorrectRequest,
    AIEvaluateRewriteRequest,
    AIGenerateExerciseRequest,
    AIJobResponse,
    AIRecommendRequest,
    AIStudyPlanRequest,
    LearningProfileRead,
    RecommendedActionRead,
)
from src.agents.schemas import AnalyticsResult, ExerciseGenerationResult, RecommendationResult, RewriteEvaluationResult, StudyPlanResult
from src.schemas.essays import EssayRead
from src.services.ai_telemetry import record_ai_interaction
from src.services.essay_service import EssayService
from src.services.recommendation_service import RecommendationEngine
from src.memory.profile import get_or_create_learning_profile
from src.utils.ai_security import contains_prompt_injection, sanitize_ai_text
from src.utils.rate_limit import require_ai_rate_limit


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/correct", response_model=ApiResponse[EssayRead | AIJobResponse], dependencies=[Depends(require_ai_rate_limit)])
def correct_essay(
    payload: AICorrectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.async_mode:
        jobs = AIJobService(db)
        active_job = jobs.get_active_for_essay(user_id=current_user.id, essay_id=payload.essay_id)
        if active_job:
            return success_response(AIJobResponse(**job_payload(active_job)), "Correcao ja em andamento.")
        job = jobs.create(user_id=current_user.id, kind="essay_correction", request_payload={"essay_id": payload.essay_id})
        if not enqueue_correct_essay(job.id):
            run_correct_essay_job(job.id)
            db.expire_all()
            job = jobs.get_for_user(job_id=job.id, user_id=current_user.id)
        return success_response(AIJobResponse(**job_payload(job)), "Correcao enviada para processamento.")
    essay = EssayService(db).submit_for_correction(essay_id=payload.essay_id, user=current_user)
    return success_response(EssayRead.model_validate(essay), "Redacao corrigida.")


@router.post("/generate-exercise", response_model=ApiResponse[ExerciseGenerationResult], dependencies=[Depends(require_ai_rate_limit)])
def generate_exercise(
    payload: AIGenerateExerciseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    focus = sanitize_ai_text(payload.focus or _default_focus(db, current_user.id), max_chars=160)
    _reject_prompt_injection(focus)
    profile = get_learning_profile_payload(db, current_user.id)
    agent = ExerciseGeneratorAgent()
    result = agent.generate(
        focus=focus,
        difficulty=payload.difficulty,
        count=payload.count,
        profile=profile,
        user_id=current_user.id,
        session_id=f"user:{current_user.id}:exercise",
    )
    record_ai_interaction(
        db,
        workflow="exercise_generation",
        agent="ExerciseGeneratorAgent",
        user_id=current_user.id,
        runner=agent.runner,
        meta={"focus": focus, "difficulty": payload.difficulty, "count": payload.count},
        commit=True,
    )
    return success_response(result)


@router.post("/evaluate-rewrite", response_model=ApiResponse[RewriteEvaluationResult], dependencies=[Depends(require_ai_rate_limit)])
def evaluate_rewrite(
    payload: AIEvaluateRewriteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    original = sanitize_ai_text(payload.original, max_chars=800)
    rewritten = sanitize_ai_text(payload.rewritten, max_chars=800)
    criteria = sanitize_ai_text(payload.criteria, max_chars=240) if payload.criteria else None
    _reject_prompt_injection(rewritten)
    agent = RewriteEvaluatorAgent()
    result = agent.evaluate(
        original=original,
        rewritten=rewritten,
        criteria=criteria,
        user_id=current_user.id,
        session_id=f"user:{current_user.id}:rewrite",
    )
    record_ai_interaction(
        db,
        workflow="rewrite_evaluation",
        agent="RewriteEvaluatorAgent",
        user_id=current_user.id,
        runner=agent.runner,
        meta={"criteria": criteria or ""},
        commit=True,
    )
    return success_response(result)


@router.post("/analyze", response_model=ApiResponse[AnalyticsResult], dependencies=[Depends(require_ai_rate_limit)])
def analyze_student(
    payload: AIAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_learning_profile_payload(db, current_user.id)
    history = _history_payload(db, current_user) if payload.include_history else {}
    agent = AnalyticsAgent()
    result = agent.analyze(profile=profile, history=history, user_id=current_user.id, session_id=f"user:{current_user.id}:analytics")
    record_ai_interaction(
        db,
        workflow="student_analytics",
        agent="AnalyticsAgent",
        user_id=current_user.id,
        runner=agent.runner,
        meta={"include_history": payload.include_history},
        commit=True,
    )
    return success_response(result)


@router.post("/recommend", response_model=ApiResponse[RecommendationResult], dependencies=[Depends(require_ai_rate_limit)])
def recommend(
    payload: AIRecommendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    context = sanitize_ai_text(payload.context or "", max_chars=1000)
    _reject_prompt_injection(context)
    profile = get_learning_profile_payload(db, current_user.id)
    history = _history_payload(db, current_user)
    if context:
        profile = {**profile, "request_context": context}
    agent = StudyPlannerAgent()
    result = agent.recommend(profile=profile, history=history, user_id=current_user.id, session_id=f"user:{current_user.id}:recommend")
    record_ai_interaction(
        db,
        workflow="study_recommendation",
        agent="StudyPlannerAgent",
        user_id=current_user.id,
        runner=agent.runner,
        meta={"has_context": bool(context)},
        commit=True,
    )
    return success_response(result)


@router.post("/study-plan", response_model=ApiResponse[StudyPlanResult], dependencies=[Depends(require_ai_rate_limit)])
def study_plan(
    payload: AIStudyPlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_learning_profile_payload(db, current_user.id)
    history = _history_payload(db, current_user)
    profile = {**profile, "intensity": payload.intensity}
    agent = StudyPlannerAgent()
    result = agent.plan(
        profile=profile,
        history=history,
        days=payload.days,
        minutes_per_day=payload.minutes_per_day,
        user_id=current_user.id,
        session_id=f"user:{current_user.id}:study-plan",
    )
    record_ai_interaction(
        db,
        workflow="study_plan_generation",
        agent="StudyPlannerAgent",
        user_id=current_user.id,
        runner=agent.runner,
        meta={"days": payload.days, "minutes_per_day": payload.minutes_per_day, "intensity": payload.intensity},
        commit=True,
    )
    return success_response(result)


@router.get("/learning-profile", response_model=ApiResponse[LearningProfileRead])
def learning_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[LearningProfileRead]:
    payload = get_learning_profile_payload(db, current_user.id)
    return success_response(LearningProfileRead.from_payload(payload))


@router.get("/recommended-actions", response_model=ApiResponse[list[RecommendedActionRead]])
def recommended_actions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[list[RecommendedActionRead]]:
    profile = get_or_create_learning_profile(db, current_user.id)
    db.commit()
    actions = RecommendationEngine(db).recommend(profile)
    return success_response(
        [
            RecommendedActionRead(
                type=a.type,
                target_issue=a.target_issue,
                target=a.target,
                reason=a.reason,
                estimated_minutes=a.estimated_minutes,
            )
            for a in actions
        ]
    )


@router.get("/jobs/{job_id}", response_model=ApiResponse[AIJobResponse])
def get_job(job_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[AIJobResponse]:
    job = AIJobService(db).get_for_user(job_id=job_id, user_id=current_user.id)
    return success_response(AIJobResponse(**job_payload(job)))


@router.get("/jobs/{job_id}/stream")
def stream_job(job_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> StreamingResponse:
    AIJobService(db).get_for_user(job_id=job_id, user_id=current_user.id)

    def events() -> Generator[str, None, None]:
        deadline = time.time() + 30
        last_status = None
        while time.time() < deadline:
            db.expire_all()
            job = AIJobService(db).get_for_user(job_id=job_id, user_id=current_user.id)
            payload = job_payload(job)
            if payload["status"] != last_status:
                last_status = payload["status"]
                yield f"event: progress\ndata: {json.dumps(payload)}\n\n"
            if payload["status"] in {"completed", "failed"}:
                return
            time.sleep(1)
        yield "event: heartbeat\ndata: {}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream")


def _history_payload(db: Session, user: User) -> dict:
    try:
        return EssayService(db).history(user.id).model_dump(mode="json")
    except Exception:
        return {}


def _default_focus(db: Session, user_id: int) -> str:
    profile = get_learning_profile_payload(db, user_id)
    weak = profile.get("weak_competencies") or {}
    if weak:
        return f"Competencia {max(weak, key=weak.get).upper()}"
    return "Competencia 3"


def _reject_prompt_injection(text: str) -> None:
    if text and contains_prompt_injection(text):
        raise AppError("Entrada contém instruções indevidas para o agente.", status_code=422, code="prompt_injection_detected")
