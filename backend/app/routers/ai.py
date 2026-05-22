from __future__ import annotations

import json
import time
from collections.abc import Generator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.agents.analytics import AnalyticsAgent
from app.agents.exercise import ExerciseGeneratorAgent
from app.agents.study_planner import StudyPlannerAgent
from app.core.database import get_db
from app.dependencies import get_current_user
from app.memory import get_learning_profile_payload
from app.middlewares.errors import AppError
from app.models import User
from app.queues import AIJobService, enqueue_correct_essay
from app.queues.jobs import job_payload
from app.queues.tasks import run_correct_essay_job
from app.schemas.ai import (
    AIAnalyzeRequest,
    AICorrectRequest,
    AIGenerateExerciseRequest,
    AIJobResponse,
    AIRecommendRequest,
    AIStudyPlanRequest,
)
from app.schemas.essays import EssayRead
from app.services.essay_service import EssayService
from app.utils.ai_security import contains_prompt_injection, sanitize_ai_text
from app.utils.rate_limit import check_ai_rate_limit


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/correct")
def correct_essay(
    payload: AICorrectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_ai_rate_limit(current_user.id)
    if payload.async_mode:
        jobs = AIJobService(db)
        job = jobs.create(user_id=current_user.id, kind="essay_correction", request_payload={"essay_id": payload.essay_id})
        if not enqueue_correct_essay(job.id):
            run_correct_essay_job(job.id)
            db.expire_all()
            job = jobs.get_for_user(job_id=job.id, user_id=current_user.id)
        return AIJobResponse(**job_payload(job))
    essay = EssayService(db).submit_for_correction(essay_id=payload.essay_id, user=current_user)
    return EssayRead.model_validate(essay)


@router.post("/generate-exercise")
def generate_exercise(
    payload: AIGenerateExerciseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_ai_rate_limit(current_user.id)
    focus = sanitize_ai_text(payload.focus or _default_focus(db, current_user.id), max_chars=160)
    _reject_prompt_injection(focus)
    profile = get_learning_profile_payload(db, current_user.id)
    return ExerciseGeneratorAgent().generate(
        focus=focus,
        difficulty=payload.difficulty,
        count=payload.count,
        profile=profile,
        user_id=current_user.id,
        session_id=f"user:{current_user.id}:exercise",
    )


@router.post("/analyze")
def analyze_student(
    payload: AIAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_ai_rate_limit(current_user.id)
    profile = get_learning_profile_payload(db, current_user.id)
    history = _history_payload(db, current_user) if payload.include_history else {}
    return AnalyticsAgent().analyze(profile=profile, history=history, user_id=current_user.id, session_id=f"user:{current_user.id}:analytics")


@router.post("/recommend")
def recommend(
    payload: AIRecommendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_ai_rate_limit(current_user.id)
    context = sanitize_ai_text(payload.context or "", max_chars=1000)
    _reject_prompt_injection(context)
    profile = get_learning_profile_payload(db, current_user.id)
    history = _history_payload(db, current_user)
    if context:
        profile = {**profile, "request_context": context}
    return StudyPlannerAgent().recommend(profile=profile, history=history, user_id=current_user.id, session_id=f"user:{current_user.id}:recommend")


@router.post("/study-plan")
def study_plan(
    payload: AIStudyPlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_ai_rate_limit(current_user.id)
    profile = get_learning_profile_payload(db, current_user.id)
    history = _history_payload(db, current_user)
    profile = {**profile, "intensity": payload.intensity}
    return StudyPlannerAgent().plan(
        profile=profile,
        history=history,
        days=payload.days,
        minutes_per_day=payload.minutes_per_day,
        user_id=current_user.id,
        session_id=f"user:{current_user.id}:study-plan",
    )


@router.get("/jobs/{job_id}", response_model=AIJobResponse)
def get_job(job_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> AIJobResponse:
    job = AIJobService(db).get_for_user(job_id=job_id, user_id=current_user.id)
    return AIJobResponse(**job_payload(job))


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
        raise AppError("Entrada contem instrucoes indevidas para o agente.", status_code=422, code="prompt_injection_detected")
