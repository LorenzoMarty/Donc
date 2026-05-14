from pydantic import BaseModel, Field


class TutorMessageRequest(BaseModel):
    message: str = Field(min_length=2, max_length=4000)
    context: str | None = Field(default=None, max_length=1000)


class TutorMessageResponse(BaseModel):
    answer: str
    suggestions: list[str]

