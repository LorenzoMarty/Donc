from pydantic import BaseModel, ConfigDict, Field


class ExerciseRead(BaseModel):
    id: int
    statement: str
    options: list[str]
    skill: str
    difficulty: str
    module_id: int
    lesson_id: int | None

    model_config = ConfigDict(from_attributes=True)


class ExerciseSubmitRequest(BaseModel):
    selected_answer: str = Field(pattern="^[A-E]$")


class ExerciseSubmitResponse(BaseModel):
    exercise_id: int
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str
    next_difficulty: str
    xp_earned: int

