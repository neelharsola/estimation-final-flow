from __future__ import annotations

import logging
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user_id,
    get_password_hash,
    verify_password,
)
from app.db.mongo import get_db
from app.models.user import PasswordResetFinish, PasswordResetStart, TokenPair, UserCreate, UserLogin, UserPublic
from app.services.audit import log_action
from app.services.users import create_user, find_user_by_email, find_user_by_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])




@router.post("/signup", response_model=UserPublic)
async def signup(payload: UserCreate) -> UserPublic:
    # Enforce that signup cannot create Admin. Role is forced to Estimator here.
    if getattr(payload, "role", None) == "Admin":
        payload.role = "Estimator"
    user = await create_user(payload)
    return UserPublic(
        id=user.id or "",
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )




@router.post("/login", response_model=TokenPair)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]) -> TokenPair:
    user = await find_user_by_email(form.username)
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    return TokenPair(access_token=create_access_token(user.id or ""), refresh_token=create_refresh_token(user.id or ""))


@router.post("/refresh", response_model=TokenPair)
async def refresh(token: str) -> TokenPair:
    # Simple trust-based refresh: validate token type=refresh in security.decode_token inside dependency if needed
    from app.core.security import decode_token

    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        sub = payload.get("sub")
        return TokenPair(access_token=create_access_token(sub), refresh_token=create_refresh_token(sub))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")


@router.post("/forgot-password")
async def forgot_password(payload: PasswordResetStart) -> dict:
    # In LAN/offline, store a one-time token in memory or collection; for MVP just respond OK
    return {"status": "ok"}


@router.post("/reset-password")
async def reset_password(payload: PasswordResetFinish) -> dict:
    # MVP stub; production would verify token and update hash
    return {"status": "ok"}


class ChangePasswordPayload(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
async def change_password(payload: ChangePasswordPayload, user_id: str = Depends(get_current_user_id)) -> dict:
    user = await find_user_by_id(user_id)
    if not user or not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Old password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    await get_db().users.update_one({"_id": __import__("bson").ObjectId(user_id)}, {"$set": {"password_hash": get_password_hash(payload.new_password)}})
    return {"status": "ok"}


