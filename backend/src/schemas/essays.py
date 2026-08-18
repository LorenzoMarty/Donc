import re

from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# Defesa em profundidade: o frontend (React) já escapa esses campos ao renderizar, então isso não
# é explorável hoje — mas o backend não deve depender só do consumidor atual pra ser seguro.
_DANGEROUS_HTML_PATTERN = re.compile(
    r"<\s*(script|iframe|object|embed|link|style)\b|\bon\w+\s*=|javascript\s*:(?!\s)",
    re.IGNORECASE,
)


def _reject_dangerous_html(value: str) -> str:
    if _DANGEROUS_HTML_PATTERN.search(value):
        raise ValueError("Conteúdo não pode conter tags/atributos de script ou HTML executável.")
    return value


SUPPORTING_TEXT_TYPES = (
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
)


class SupportingTextRead(BaseModel):
    title: str
    content: str
    type: Literal[
        "motivador", "dados", "repertorio", "imagem", "grafico", "infografico", "postagem", "manchete", "tirinha", "charge"
    ]
    chart_points: list[dict] | None = None
    stat_items: list[dict] | None = None
    comic_panels: list[str] | None = None
    post_author: str | None = None
    post_handle: str | None = None
    headline_subtitle: str | None = None
    headline_source: str | None = None
    image_prompt: str | None = None
    image_url: str | None = None

    @field_validator("type", mode="before")
    @classmethod
    def _coerce_unknown_type(cls, value: object) -> object:
        # O agente de geracao de temas usa um LLM; categorias fora do enum (alucinacao)
        # nao devem derrubar a resposta da API — caem para "motivador" como padrao seguro.
        if value not in SUPPORTING_TEXT_TYPES:
            return "motivador"
        return value


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
    status: str = "approved"
    created_at: datetime
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

    _validate_no_dangerous_html = field_validator("title", "content")(_reject_dangerous_html)


class EssayThemeGenerateRequest(BaseModel):
    focus: str | None = Field(default=None, max_length=160)


class EssayAutosaveRequest(BaseModel):
    title: str = Field(min_length=4, max_length=220)
    content: str = Field(max_length=20000)

    _validate_no_dangerous_html = field_validator("title", "content")(_reject_dangerous_html)


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
