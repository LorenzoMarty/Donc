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


class LessonRead(BaseModel):
    id: int
    title: str
    description: str
    thumbnail_url: str
    video_url: str
    summary: str
    duration_minutes: int
    order: int
    progress: LessonProgressRead = Field(default_factory=LessonProgressRead)
    exercises: list[ExercisePreview] = []

    model_config = ConfigDict(from_attributes=True)


class ModuleRead(BaseModel):
    id: int
    title: str
    description: str
    order: int
    lessons: list[LessonRead] = []

    model_config = ConfigDict(from_attributes=True)


class SubjectRead(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    color: str
    modules: list[ModuleRead] = []

    model_config = ConfigDict(from_attributes=True)


class LessonProgressUpdate(BaseModel):
    progress_percent: int = Field(ge=0, le=100)
    last_position_seconds: int = Field(ge=0)
    completed: bool = False

