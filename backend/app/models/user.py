from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(BaseModel):
    id: str = Field(default_factory=generate_uuid, alias="_id")
    email: EmailStr
    name: str
    password_hash: Optional[str] = None  # For OAuth users
    oauth_provider: Optional[str] = None
    oauth_id: Optional[str] = None
    role: Literal["Admin", "Estimator", "Ops"] = "Estimator"
    is_active: bool = True
    last_login: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: Literal["Admin", "Estimator", "Ops"] = "Estimator"
    password: Optional[str] = None  # For non-OAuth users


class UserUpdateRole(BaseModel):
    role: Literal["Admin", "Estimator", "Ops"]


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str = Field(alias="_id")
    name: str
    email: EmailStr
    role: Literal["Admin", "Estimator", "Ops"]
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        populate_by_name = True


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class PasswordResetStart(BaseModel):
    email: EmailStr


class PasswordResetFinish(BaseModel):
    token: str
    new_password: str


