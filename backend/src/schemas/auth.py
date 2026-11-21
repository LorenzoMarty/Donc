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
    accept_terms: bool = False
    turnstile_token: str | None = Field(default=None, max_length=2048)


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=20, max_length=4096)
    accept_terms: bool = False


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr
    turnstile_token: str | None = Field(default=None, max_length=2048)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class UpdatePreferencesRequest(BaseModel):
    reminders_enabled: bool


class UnsubscribeRemindersRequest(BaseModel):
    token: str = Field(min_length=3, max_length=120)


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
    email_verified: bool = True
    reminders_enabled: bool = True

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
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
