from pydantic import BaseModel


class AdminMetricsResponse(BaseModel):
    users: int
    essays: int
    corrected_essays: int
    lessons: int
    exercises: int
    average_score: int
    active_themes: int


class AdminUserRead(BaseModel):
    id: int
    name: str
    email: str
    role: str
    xp: int
    level: int
    essays: int

