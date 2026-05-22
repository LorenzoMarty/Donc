from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MockExamQuestionRead(BaseModel):
    id: int
    statement: str
    options: list[str]
    skill: str

    model_config = ConfigDict(from_attributes=True)


class MockExamRead(BaseModel):
    id: int
    title: str
    description: str
    area: str
    duration_minutes: int
    questions: list[MockExamQuestionRead] = []

    model_config = ConfigDict(from_attributes=True)


class MockExamSubmitRequest(BaseModel):
    answers: dict[str, str]


class MockExamSubmitResponse(BaseModel):
    attempt_id: int
    exam_id: int
    score: int
    total_questions: int
    correct_answers: int
    finished_at: datetime
    performance_by_skill: dict[str, int]

