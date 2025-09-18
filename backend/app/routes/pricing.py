from __future__ import annotations

from datetime import datetime
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
import httpx
from functools import lru_cache
from datetime import timedelta

from app.core.security import get_current_user_id
from app.db.mongo import get_db
from app.models.pricing import PricingCalcRequest, PricingCalcResponse, PricingRate, ProjectSummary, ProjectResourcePricing, PricingSummary
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


@lru_cache(maxsize=8)
def _fx_cache_key(base: str, symbols: str) -> str:
    return f"{base}:{symbols}"


@router.get("/fx")
async def get_fx(base: str = "USD", symbols: str = "AED,INR,GBP") -> dict:
    """Return fixed FX rates for smooth offline calculation.

    Fixed matrix (approx):
    - 1 USD = {"AED": 3.6725, "INR": 87.78, "GBP": 0.73}
    - 1 INR = {"USD": 0.0114, "AED": 0.0416, "GBP": 0.0083}
    - 1 GBP = {"USD": 1.3649, "INR": 119.75, "AED": 5.01}
    - 1 AED = {"USD": 0.2723, "INR": 23.98, "GBP": 0.20}
    """
    fixed = {
        "USD": {"USD": 1.0, "INR": 87.78, "GBP": 0.73, "AED": 3.6725},
        "INR": {"USD": 0.0114, "INR": 1.0, "GBP": 0.0083, "AED": 0.0416},
        "GBP": {"USD": 1.3649, "INR": 119.75, "GBP": 1.0, "AED": 5.01},
        "AED": {"USD": 0.2723, "INR": 23.98, "GBP": 0.20, "AED": 1.0},
    }
    base = base.upper()
    symbols_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    rates = {}
    for s in symbols_list:
        rates[s] = fixed.get(base, {}).get(s)
    return {"base": base, "date": None, "rates": rates}


# New: Pricing Projects overview
@router.get("/projects", response_model=List[ProjectSummary])
async def list_pricing_projects(role: str = Depends(get_current_user_role_dep)) -> List[ProjectSummary]:
    db = get_db()
    items: list[ProjectSummary] = []
    async for doc in db.estimations.find({"$or": [{"is_temporary": {"$exists": False}}, {"is_temporary": False}]}).sort("updated_at", -1):
        doc["_id"] = str(doc["_id"])  # serialize
        items.append(ProjectSummary.model_validate(doc))
    return items


@router.get("/projects/{estimation_id}/resources", response_model=List[ProjectResourcePricing])
async def get_project_resources(estimation_id: str, role: str = Depends(get_current_user_role_dep)) -> List[ProjectResourcePricing]:
    from bson import ObjectId
    db = get_db()
    est = await db.estimations.find_one({"_id": ObjectId(estimation_id)})
    if not est:
        raise HTTPException(status_code=404, detail="Estimation not found")
    out: list[ProjectResourcePricing] = []
    for res in (est.get("current_version", {}).get("resources") or []):
        role_name = res.get("role")
        day_rate = res.get("day_rate")
        currency = res.get("currency")
        
        if day_rate is None or currency is None:
            # Fallback to global rates
            rate_doc = await db.pricing_rates.find_one({"role": role_name, "region": "default"}, sort=[("version", -1)])
            if rate_doc:
                day_rate = float(rate_doc.get("day_rate", 0)) if day_rate is None else day_rate
                currency = rate_doc.get("currency", "USD") if currency is None else currency

        out.append(ProjectResourcePricing(
            role=role_name, 
            day_rate=float(day_rate or 0), 
            currency=currency or "USD", 
            region="default" # region is not stored per resource override, so we assume default
        ))
    return out


@router.put("/projects/{estimation_id}/resources", response_model=List[ProjectResourcePricing])
async def update_project_resources(estimation_id: str, updates: List[ProjectResourcePricing], role: str = Depends(get_current_user_role_dep)) -> List[ProjectResourcePricing]:
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    from bson import ObjectId
    db = get_db()
    
    est_doc = await db.estimations.find_one({"_id": ObjectId(estimation_id)})
    if not est_doc:
        raise HTTPException(status_code=404, detail="Estimation not found")

    update_map = {item.role: item for item in updates}
    
    current_resources = est_doc.get("current_version", {}).get("resources", [])
    
    for resource in current_resources:
        role_name = resource.get("role")
        if role_name in update_map:
            update_item = update_map[role_name]
            resource["day_rate"] = float(update_item.day_rate)
            resource["currency"] = update_item.currency
            
    await db.estimations.update_one(
        {"_id": ObjectId(estimation_id)},
        {"$set": {"current_version.resources": current_resources, "updated_at": datetime.utcnow()}}
    )
    
    # Return the updated resources
    return await get_project_resources(estimation_id, role)


# New: Save and retrieve per-project pricing summary (USD primary)
@router.get("/projects/{estimation_id}/summary", response_model=PricingSummary)
async def get_project_pricing_summary(estimation_id: str, role: str = Depends(get_current_user_role_dep)) -> PricingSummary:
    from bson import ObjectId
    db = get_db()
    doc = await db.estimations.find_one({"_id": ObjectId(estimation_id)}, {"pricing_summary": 1})
    data = (doc or {}).get("pricing_summary") or {}
    try:
        return PricingSummary.model_validate(data)
    except Exception:
        return PricingSummary()


@router.put("/projects/{estimation_id}/summary", response_model=PricingSummary)
async def update_project_pricing_summary(estimation_id: str, payload: PricingSummary, role: str = Depends(get_current_user_role_dep)) -> PricingSummary:
    from bson import ObjectId
    from datetime import datetime
    db = get_db()
    await db.estimations.update_one(
        {"_id": ObjectId(estimation_id)},
        {"$set": {"pricing_summary": payload.model_dump(), "updated_at": datetime.utcnow()}},
    )
    return await get_project_pricing_summary(estimation_id, role)

