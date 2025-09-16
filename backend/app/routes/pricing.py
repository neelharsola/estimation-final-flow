from __future__ import annotations

from datetime import datetime
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user_id
from app.db.mongo import get_db
from app.models.pricing import PricingCalcRequest, PricingCalcResponse, PricingRate
from app.services.pricing import calculate_pricing


router = APIRouter()


async def get_current_user_role_dep(user_id: str = Depends(get_current_user_id)) -> str:
    db = get_db()
    doc = await db.users.find_one({"_id": ObjectId(user_id)}, {"role": 1})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    return str(doc.get("role", "")).lower()


@router.get("/rates", response_model=List[PricingRate])
async def list_rates(role: str = Depends(get_current_user_role_dep)) -> List[PricingRate]:
    db = get_db()
    items: list[PricingRate] = []
    async for doc in db.pricing_rates.find({}).sort([("role", 1), ("region", 1), ("version", -1)]):
        doc["_id"] = str(doc["_id"])  # serialize
        items.append(PricingRate.model_validate(doc))
    return items


@router.post("/rates", response_model=PricingRate)
async def create_rate(payload: PricingRate, role: str = Depends(get_current_user_role_dep)) -> PricingRate:
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    doc = payload.model_dump(by_alias=True)
    res = await db.pricing_rates.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return PricingRate.model_validate(doc)


@router.put("/rates/{rate_id}", response_model=PricingRate)
async def update_rate(rate_id: str, updates: dict, role: str = Depends(get_current_user_role_dep)) -> PricingRate:
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    allowed = {"day_rate", "currency", "version", "effective_from"}
    payload = {k: v for k, v in updates.items() if k in allowed}
    await db.pricing_rates.update_one({"_id": ObjectId(rate_id)}, {"$set": payload})
    doc = await db.pricing_rates.find_one({"_id": ObjectId(rate_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    doc["_id"] = str(doc["_id"])  # serialize
    return PricingRate.model_validate(doc)


@router.delete("/rates/{rate_id}")
async def delete_rate(rate_id: str, role: str = Depends(get_current_user_role_dep)) -> dict:
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    await db.pricing_rates.delete_one({"_id": ObjectId(rate_id)})
    return {"status": "ok"}


@router.post("/calc", response_model=PricingCalcResponse)
async def calc(req: PricingCalcRequest) -> PricingCalcResponse:
    try:
        return await calculate_pricing(req.estimation_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


