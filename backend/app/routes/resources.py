from __future__ import annotations

from datetime import datetime
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.db.mongo import get_db
from app.models.resource import Resource


router = APIRouter()


async def get_current_user_role_dep(user_id: str = Depends(get_current_user_id)) -> str:
    db = get_db()
    doc = await db.users.find_one({"_id": ObjectId(user_id)}, {"role": 1})
    if not doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return str(doc.get("role", "")).lower()


@router.get("/resources", response_model=List[Resource])
async def list_resources() -> List[Resource]:
    db = get_db()
    items: list[Resource] = []
    async for doc in db.resources.find({}).sort("updated_at", -1):
        doc["_id"] = str(doc["_id"])  # serialize
        items.append(Resource.model_validate(doc))
    return items


@router.post("/resources", response_model=Resource)
async def create_resource(payload: Resource, role: str = Depends(get_current_user_role_dep)) -> Resource:
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin can create resources")
    db = get_db()
    doc = payload.model_dump(by_alias=True, exclude={"id"})
    now = datetime.utcnow()
    doc["created_at"] = now
    doc["updated_at"] = now
    res = await db.resources.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return Resource.model_validate(doc)


@router.put("/resources/{resource_id}", response_model=Resource)
async def update_resource(resource_id: str, updates: dict, role: str = Depends(get_current_user_role_dep)) -> Resource:
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin can update resources")
    db = get_db()
    updates = {k: v for k, v in updates.items() if k in {"name", "role", "notes", "rates"}}
    updates["updated_at"] = datetime.utcnow()
    result = await db.resources.update_one({"_id": ObjectId(resource_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.resources.find_one({"_id": ObjectId(resource_id)})
    doc["_id"] = str(doc["_id"])  # serialize
    return Resource.model_validate(doc)


@router.delete("/resources/{resource_id}")
async def delete_resource(resource_id: str, role: str = Depends(get_current_user_role_dep)) -> dict:
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin can delete resources")
    db = get_db()
    res = await db.resources.delete_one({"_id": ObjectId(resource_id)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}


