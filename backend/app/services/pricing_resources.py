from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from app.db.mongo import get_db
from app.models.pricing_resource import PricingResource


def _oid(id_str: str) -> ObjectId | None:
    """Safely parse a Mongo ObjectId. Returns None if invalid/empty."""
    try:
        if not id_str:
            return None
        return ObjectId(id_str)
    except Exception:
        return None


async def create_pricing_resources(estimation_id: str, resources: List[dict]) -> List[PricingResource]:
    """Create pricing resources for an estimation"""
    db = get_db()
    now = datetime.utcnow()
    
    # First, delete existing pricing resources for this estimation
    await db.pricing_resources.delete_many({"estimation_id": estimation_id})
    
    # Create new pricing resources
    created_resources = []
    for resource_data in resources:
        pricing_resource = PricingResource(
            estimation_id=estimation_id,
            role=resource_data.get("role", ""),
            days=float(resource_data.get("days", 0)),
            count=int(resource_data.get("count", 1)),
            hourly_rate=float(resource_data.get("hourly_rate", 0)),
            day_rate=float(resource_data.get("day_rate", 0)),
            currency=resource_data.get("currency", "USD"),
            region=resource_data.get("region", "default"),
            total_cost=float(resource_data.get("total_cost", 0)),
            created_at=now,
            updated_at=now
        )
        
        doc = pricing_resource.model_dump(by_alias=True, exclude={"id"})
        result = await db.pricing_resources.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        created_resources.append(PricingResource.model_validate(doc))
    
    return created_resources


async def get_pricing_resources(estimation_id: str) -> List[PricingResource]:
    """Get pricing resources for an estimation"""
    db = get_db()
    resources = []
    
    async for doc in db.pricing_resources.find({"estimation_id": estimation_id}).sort("created_at", 1):
        doc["_id"] = str(doc["_id"])
        doc["id"] = doc["_id"]
        resources.append(PricingResource.model_validate(doc))
    
    return resources


async def update_pricing_resources(estimation_id: str, resources: List[dict]) -> List[PricingResource]:
    """Update pricing resources for an estimation"""
    return await create_pricing_resources(estimation_id, resources)


async def sync_resources_from_envelope(estimation_id: str, envelope_resources: List[dict]) -> List[PricingResource]:
    """Sync pricing resources from estimation envelope data"""
    db = get_db()
    
    # Get existing pricing resources
    existing_resources = await get_pricing_resources(estimation_id)
    existing_by_role = {r.role: r for r in existing_resources}
    
    # Prepare new resources, preserving pricing data where available
    new_resources = []
    for env_resource in envelope_resources:
        role = env_resource.get("role", "")
        days = float(env_resource.get("days", 0))
        count = int(env_resource.get("count", 1))
        
        # Use existing pricing data if available, otherwise default values
        existing = existing_by_role.get(role)
        if existing:
            new_resources.append({
                "role": role,
                "days": days,
                "count": count,
                "hourly_rate": existing.hourly_rate,
                "day_rate": existing.day_rate,
                "currency": existing.currency,
                "region": existing.region,
                "total_cost": existing.day_rate * days * count
            })
        else:
            new_resources.append({
                "role": role,
                "days": days,
                "count": count,
                "hourly_rate": 0.0,
                "day_rate": 0.0,
                "currency": "USD",
                "region": "default",
                "total_cost": 0.0
            })
    
    return await create_pricing_resources(estimation_id, new_resources)