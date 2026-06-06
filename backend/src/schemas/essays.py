from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SupportingTextRead(BaseModel):
    title: str
    content: str
    type: Literal["motivador", "perspectiva", "dados", "repertorio", "imagem"]


class InlineAnnotationRead(BaseModel):
    paragraph_index: int
    quote: str
    comment: str
    competency: str
    type: str


class EssayThemeRead(BaseModel):
    id: int
    title: str
    context: str
    source: str
    supporting_texts: list[SupportingTextRead] = Field(default_factory=list)

    @field_validator("supporting_texts", mode="before")
    @classmethod
    def coerce_none(cls, v: object) -> object:
        return v or []

    model_config = ConfigDict(from_attributes=True)


class EssayCreateRequest(BaseModel):
    theme_id: int
    title: str = Field(min_length=4, max_length=220)
    content: str = Field(default="", max_length=20000)


class EssayThemeGenerateRequest(BaseModel):
    focus: str | None = Field(default=None, max_length=160)


class EssayAutosaveRequest(BaseModel):
    title: str = Field(min_length=4, max_length=220)
    content: str = Field(max_length=20000)


class EssayCorrectionRead(BaseModel):
    id: int
    total_score: int
    competency_1: int
    competency_2: int
    competency_3: int
    competency_4: int
    competency_5: int
    strengths: list[str]
    errors: list[str]
    suggestions: list[str]
    feedback: str
    recurrent_patterns: list[str]
    inline_annotations: list[InlineAnnotationRead] = Field(default_factory=list)
    created_at: datetime

    @field_validator("inline_annotations", mode="before")
    @classmethod
    def coerce_none(cls, v: object) -> object:
        return v or []

    model_config = ConfigDict(from_attributes=True)


class EssayVersionCorrectionRead(BaseModel):
    id: int
    total_score: int
    competency_1: int
    competency_2: int
    competency_3: int
    competency_4: int
    competency_5: int
    strengths: list[str]
    errors: list[str]
    suggestions: list[str]
    feedback: str
    recurrent_patterns: list[str]
    inline_annotations: list[InlineAnnotationRead] = Field(default_factory=list)
    created_at: datetime

    @field_validator("inline_annotations", mode="before")
    @classmethod
    def coerce_none(cls, v: object) -> object:
        return v or []

    model_config = ConfigDict(from_attributes=True)


class EssayVersionRead(BaseModel):
    id: int
    version_number: int
    title: str
    content: str
    status: str
    word_count: int
    line_count: int
    paragraph_count: int
    score: int | None
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None
    correction: EssayVersionCorrectionRead | None = None

    model_config = ConfigDict(from_attributes=True)


class EssayRead(BaseModel):
    id: int
    title: str
    content: str
    status: str
    word_count: int
    line_count: int
    paragraph_count: int
    score: int | None
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None
    theme: EssayThemeRead
    correction: EssayCorrectionRead | None = None
    versions: list[EssayVersionRead] = []

    model_config = ConfigDict(from_attributes=True)


class EssayEvolutionPoint(BaseModel):
    label: str
    score: int
    c1: int
    c2: int
    c3: int
    c4: int
    c5: int


class EssayHistoryResponse(BaseModel):
    essays: list[EssayRead]
    average_score: int
    weakest_competency: str
    recurrent_errors: list[str]
    evolution: list[EssayEvolutionPoint]


class EssaySubmitResponse(BaseModel):
    job_id: str
    essay_id: int


class JobStatusRead(BaseModel):
    job_id: str
    status: str
    essay: EssayRead | None = None
    error: str | None = None
