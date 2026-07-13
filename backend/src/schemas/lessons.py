from pydantic import BaseModel, ConfigDict, Field


class LessonProgressRead(BaseModel):
    progress_percent: int = 0
    last_position_seconds: int = 0
    completed: bool = False
    xp_earned: int = 0
    reward_events: list[str] = Field(default_factory=list)
    total_xp: int | None = None
    rank_name: str | None = None
    next_rank_xp: int | None = None
    exercise_difficulty: str | None = None


class RankRead(BaseModel):
    name: str
    xp: int
    next_rank_xp: int | None
    exercise_difficulty: str


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
    xp_reward: int = 25
    progress: LessonProgressRead = Field(default_factory=LessonProgressRead)
    exercises: list[ExercisePreview] = []
    locked: bool = False

    model_config = ConfigDict(from_attributes=True)


class ModuleRead(BaseModel):
    id: int
    title: str
    description: str
    order: int
    progress_percent: int = 0
    completed: bool = False
    xp_reward: int = 75
    lessons: list[LessonRead] = []
    items: list[ModuleItemRead] = []
    locked: bool = False
    mastered: bool = False
    unlock_requirements: list[str] = Field(default_factory=list)
    target_competencies: list[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CourseRead(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    color: str
    progress_percent: int = 0
    completed: bool = False
    xp_reward: int = 200
    user_rank: RankRead | None = None
    modules: list[ModuleRead] = []

    model_config = ConfigDict(from_attributes=True)


class LessonProgressUpdate(BaseModel):
    progress_percent: int = Field(ge=0, le=100)
    last_position_seconds: int = Field(ge=0)
    completed: bool = False
