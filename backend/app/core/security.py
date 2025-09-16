from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_jwt_config
from app.db.mongo import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def _create_token(subject: str, expires_delta: timedelta, token_type: str) -> str:
    cfg = get_jwt_config()
    now = datetime.now(timezone.utc)
    to_encode: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "type": token_type,
    }
    expire = now + expires_delta
    to_encode.update({"exp": int(expire.timestamp())})
    return jwt.encode(to_encode, cfg.secret, algorithm=cfg.algorithm)


def create_access_token(subject: str) -> str:
    cfg = get_jwt_config()
    return _create_token(subject, timedelta(minutes=cfg.access_minutes), "access")


def create_refresh_token(subject: str) -> str:
    cfg = get_jwt_config()
    return _create_token(subject, timedelta(days=cfg.refresh_days), "refresh")


def decode_token(token: str) -> dict[str, Any]:
    cfg = get_jwt_config()
    return jwt.decode(token, cfg.secret, algorithms=[cfg.algorithm])


async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        subject = payload.get("sub")
        if not subject:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        return subject
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")


def require_roles(*roles: str):
    async def _dep(role: str = Depends(get_current_user_role)) -> None:
        if role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    return _dep


# This helper expects a separate dependency to fetch role from DB; defined in routes where DB is available
async def get_current_user(user_id: str = Depends(get_current_user_id)) -> User:
    """Get current user from database."""
    from bson import ObjectId
    db = get_db()
    
    try:
        # Convert string ID to ObjectId for MongoDB query
        object_id = ObjectId(user_id)
        doc = await db.users.find_one({"_id": object_id})
    except Exception:
        # If ObjectId conversion fails, try as string
        doc = await db.users.find_one({"_id": user_id})
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Ensure _id is string for model validation
    doc["_id"] = str(doc["_id"])
    return User.model_validate(doc)


def require_role(*allowed_roles: str):
    """Dependency to require specific user roles."""
    async def role_checker(user: User = Depends(get_current_user)) -> None:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
    
    return role_checker


async def get_current_user_role() -> str:  # placeholder; real impl is bound in routes via dependency override
    raise NotImplementedError


