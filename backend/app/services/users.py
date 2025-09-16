from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import HTTPException, status

from app.core.security import get_password_hash, verify_password
from app.db.mongo import get_db
from app.models.user import User, UserCreate

logger = logging.getLogger(__name__)


def _oid_str(oid: ObjectId | str) -> str:
    return str(oid) if isinstance(oid, ObjectId) else oid


async def find_user_by_email(email: str) -> Optional[User]:
    db = get_db()
    doc = await db.users.find_one({"email": email})
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])  # serialize
    return User.model_validate(doc)


async def find_user_by_id(user_id: str) -> Optional[User]:
    db = get_db()
    try:
        doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])  # serialize
    return User.model_validate(doc)


async def create_user(payload: UserCreate) -> User:
    db = get_db()
    now = datetime.utcnow()
    # Prevent creating Admin via self-signup path; default to Estimator for safety
    # Only allow creating Admin via explicit admin-protected endpoint using create_default_admin or role update
    requested_role = payload.role if getattr(payload, "role", None) else "Estimator"
    if requested_role == "Admin":
        # Downgrade to Estimator for signup/create flow; admin promotion must be done by existing Admin
        requested_role = "Estimator"
    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": get_password_hash(payload.password),
        "role": requested_role,
        "is_active": True,
        "created_at": now,
    }
    try:
        res = await db.users.insert_one(user_doc)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    user_doc["_id"] = str(res.inserted_id)
    return User.model_validate(user_doc)


async def list_users() -> List[User]:
    """List all users."""
    db = get_db()
    users = []
    
    async for doc in db.users.find({}).sort("created_at", -1):
        doc["_id"] = str(doc["_id"])
        users.append(User.model_validate(doc))
    
    return users


async def update_user(user_id: str, update_data: dict) -> Optional[User]:
    """Update user by ID."""
    db = get_db()
    
    # Remove password from update if present (use separate endpoint for password change)
    update_data.pop("password", None)
    update_data.pop("password_hash", None)
    
    # Add updated_at timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    try:
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return None
        
        # Return updated user
        return await find_user_by_id(user_id)
        
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        return None


async def create_default_admin() -> None:
    """Create default admin user if it doesn't exist."""
    try:
        existing = await find_user_by_email("admin@msbcgroup.com")
        if not existing:
            # Create admin user directly in database to avoid validation issues
            db = get_db()
            admin_doc = {
                "name": "System Admin",
                "email": "admin@msbcgroup.com",
                "password_hash": get_password_hash("msbc$123"),
                "role": "Admin",
                "is_active": True,
                "created_at": datetime.utcnow(),
            }
            await db.users.insert_one(admin_doc)
            logger.info("Default admin user created: admin@msbcgroup.com")
        else:
            # Check if existing user has correct role, fix if needed
            if existing.role != "Admin":
                await update_user(existing.id, {"role": "Admin"})
                logger.info("Updated existing admin user role")
            else:
                logger.info("Admin user already exists with correct role")
    except Exception as e:
        logger.error(f"Error creating admin user: {e}")


