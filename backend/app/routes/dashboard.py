from __future__ import annotations

from fastapi import APIRouter, Depends

from app.db.mongo import get_db
from app.core.security import get_current_user_id
from bson import ObjectId


router = APIRouter()


async def _counts_for(user_id: str | None, role: str | None) -> dict:
    db = get_db()
    base_filter = {"$or": [{"is_temporary": {"$exists": False}}, {"is_temporary": False}]}
    if role == "estimator" and user_id:
        try:
            base_filter["creator_id"] = user_id
        except Exception:
            base_filter["creator_id"] = user_id

    active_estimations = await db.estimations.count_documents(base_filter)
    pending_reviews = await db.estimations.count_documents({**base_filter, "status": "under_review"})
    pricing_ready = await db.estimations.count_documents({**base_filter, "status": "ready_for_pricing"})
    return {
        "active_estimations": active_estimations,
        "pending_reviews": pending_reviews,
        "pricing_ready_estimations": pricing_ready,
    }


@router.get("/summary")
async def summary(user_id: str | None = Depends(get_current_user_id)) -> dict:
    # If unauthenticated access is allowed in future, we could handle None user
    # For now, treat unauthenticated as no results
    role = None
    # Try to fetch role only when user_id is present
    if user_id:
        try:
            db = get_db()
            doc = await db.users.find_one({"_id": ObjectId(user_id)}, {"role": 1})
            role = doc.get("role") if doc else None
        except Exception:
            role = None
    return await _counts_for(user_id, role)


