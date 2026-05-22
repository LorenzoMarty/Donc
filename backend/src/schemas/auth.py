from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.models.user import UserRole


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr


class UserRead(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    xp: int
    level: int
    streak_days: int
    daily_goal_minutes: int

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
