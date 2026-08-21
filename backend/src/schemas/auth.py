from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.models.user import UserRole

ONBOARDING_GOALS = {"900+", "850-900", "800-850", "consistencia"}
ONBOARDING_LEVELS = {"iniciante", "intermediario", "avancado"}


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr


class UpdateMeRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserRead(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    streak_days: int
    daily_goal_minutes: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class OnboardingUpdateRequest(BaseModel):
    # Ids espelhados em frontend/src/app/(app)/onboarding/page.tsx (GOALS/LEVELS) — mudou um id
    # aqui, muda lá também, senão o onboarding do frontend passa a rejeitar com 422.
    goal: Literal["900+", "850-900", "800-850", "consistencia"] | None = None
    level: Literal["iniciante", "intermediario", "avancado"] | None = None


class OnboardingRead(BaseModel):
    goal: str | None = None
    level: str | None = None
    completed: bool = False
    completed_at: datetime | None = None
