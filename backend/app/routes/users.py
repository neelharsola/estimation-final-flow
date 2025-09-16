from __future__ import annotations

import logging
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response

from app.core.security import get_current_user_id, require_role
from app.db.mongo import get_db
from app.models.user import User, UserCreate, UserPublic, UserUpdateRole
from app.services.audit import log_action
from app.services.users import create_user, find_user_by_id, list_users, update_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.options("/")
async def options_create_user():
    """Handle preflight OPTIONS request for user creation."""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "false",
            "Access-Control-Max-Age": "3600",
        }
    )


@router.post("/", response_model=UserPublic)
async def create_new_user(
    user_data: UserCreate,
    user_id: str = Depends(get_current_user_id),
    _: None = Depends(require_role("Admin"))
) -> UserPublic:
    """Create a new user (Admin only)."""
    try:
        user = await create_user(user_data)
        
        # Log action
        await log_action(
            user_id=user_id,
            action="CREATE_USER",
            resource_id=user.id,
            metadata={"email": user.email, "role": user.role}
        )
        
        return UserPublic(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            last_login=user.last_login,
            created_at=user.created_at
        )
        
    except Exception as e:
        logger.error(f"Failed to create user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")


@router.get("/", response_model=List[UserPublic])
async def list_all_users(
    user_id: str = Depends(get_current_user_id),
    _: None = Depends(require_role("Admin"))
) -> List[UserPublic]:
    """List all users (Admin only)."""
    try:
        users = await list_users()
        return [
            UserPublic(
                id=user.id,
                name=user.name,
                email=user.email,
                role=user.role,
                is_active=user.is_active,
                last_login=user.last_login,
                created_at=user.created_at
            )
            for user in users
        ]
    except Exception as e:
        logger.error(f"Failed to list users: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve users")


@router.get("/me", response_model=UserPublic)
async def get_current_user_info(user_id: str = Depends(get_current_user_id)) -> UserPublic:
    """Get current user information."""
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserPublic(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        last_login=user.last_login,
        created_at=user.created_at
    )


@router.patch("/{target_user_id}", response_model=UserPublic)
async def update_user_role(
    target_user_id: str,
    update_data: UserUpdateRole,
    user_id: str = Depends(get_current_user_id),
    _: None = Depends(require_role("Admin"))
) -> UserPublic:
    """Update user role (Admin only)."""
    try:
        user = await find_user_by_id(target_user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user role
        db = get_db()
        await db.users.update_one(
            {"_id": target_user_id},
            {"$set": {"role": update_data.role}}
        )
        
        # Get updated user
        updated_user = await find_user_by_id(target_user_id)
        
        # Log action
        await log_action(
            user_id=user_id,
            action="UPDATE_USER",
            resource_id=target_user_id,
            metadata={"old_role": user.role, "new_role": update_data.role}
        )
        
        return UserPublic(
            id=updated_user.id,
            name=updated_user.name,
            email=updated_user.email,
            role=updated_user.role,
            is_active=updated_user.is_active,
            last_login=updated_user.last_login,
            created_at=updated_user.created_at
        )
        
    except Exception as e:
        logger.error(f"Failed to update user: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")


@router.delete("/{target_user_id}")
async def delete_user(
    target_user_id: str,
    user_id: str = Depends(get_current_user_id),
    _: None = Depends(require_role("Admin"))
) -> dict:
    """Delete user (Admin only)."""
    try:
        user = await find_user_by_id(target_user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Don't allow deleting self
        if target_user_id == user_id:
            raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
        # Delete user
        db = get_db()
        result = await db.users.delete_one({"_id": target_user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Log action
        await log_action(
            user_id=user_id,
            action="DELETE_USER",
            resource_id=target_user_id,
            metadata={"email": user.email, "role": user.role}
        )
        
        return {"message": "User deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete user: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user")