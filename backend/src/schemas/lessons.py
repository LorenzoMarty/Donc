from pydantic import BaseModel, ConfigDict, Field


class LessonProgressRead(BaseModel):
    progress_percent: int = 0
    last_position_seconds: int = 0
    completed: bool = False


class ExercisePreview(BaseModel):
    id: int
    statement: str
    skill: str
    difficulty: str

    model_config = ConfigDict(from_attributes=True)


class ModuleActivityRead(BaseModel):
    id: int
    statement: str
    skill: str
    difficulty: str
    lesson_id: int | None = None
    base_lesson_ids: list[int] = Field(default_factory=list)


class ModuleItemRead(BaseModel):
    id: int
    kind: str
    order: int
    lesson: "LessonRead | None" = None
    activity: ModuleActivityRead | None = None


class LessonRead(BaseModel):
    id: int
    title: str
    description: str
    thumbnail_url: str
    video_url: str
    pdf_url: str | None = None
    summary: str
    duration_minutes: int
    order: int
    progress: LessonProgressRead = Field(default_factory=LessonProgressRead)
    exercises: list[ExercisePreview] = []
    locked: bool = False

    model_config = ConfigDict(from_attributes=True)


class ModuleRead(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    color: str
    order: int
    progress_percent: int = 0
    completed: bool = False
    lessons: list[LessonRead] = []
    items: list[ModuleItemRead] = []
    locked: bool = False
    mastered: bool = False
    unlock_requirements: list[str] = Field(default_factory=list)
    target_competencies: list[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class LessonProgressUpdate(BaseModel):
    progress_percent: int = Field(ge=0, le=100)
    last_position_seconds: int = Field(ge=0)
    completed: bool = False
