from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from app.db.mongo import get_db
from app.models.estimation import Estimation, EstimationVersion, Feature, ResourceAllocation, ReviewRecord


def _oid(id_str: str) -> ObjectId:
    return ObjectId(id_str)


async def create_estimation(est: Estimation) -> Estimation:
    db = get_db()
    doc = est.model_dump(by_alias=True)
    res = await db.estimations.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return Estimation.model_validate(doc)


async def get_estimation(estimation_id: str) -> Optional[Estimation]:
    db = get_db()
    try:
        doc = await db.estimations.find_one({"_id": _oid(estimation_id)})
    except Exception:
        return None
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])  # serialize
    return Estimation.model_validate(doc)


async def list_estimations(created_by: str | None = None) -> List[Estimation]:
    db = get_db()
    items: list[Estimation] = []
    query: dict = {}
    if created_by:
        query["creator_id"] = created_by
    async for doc in db.estimations.find(query).sort("updated_at", -1):
        doc["_id"] = str(doc["_id"])  # serialize
        items.append(Estimation.model_validate(doc))
    return items


async def update_features(estimation_id: str, features: list[Feature]) -> Optional[Estimation]:
    db = get_db()
    now = datetime.utcnow()
    result = await db.estimations.update_one(
        {"_id": _oid(estimation_id)},
        {"$set": {"current_version.features": [f.model_dump() for f in features], "updated_at": now}},
    )
    if result.matched_count == 0:
        return None
    return await get_estimation(estimation_id)


async def update_resources(estimation_id: str, resources: list[ResourceAllocation]) -> Optional[Estimation]:
    db = get_db()
    now = datetime.utcnow()
    result = await db.estimations.update_one(
        {"_id": _oid(estimation_id)},
        {"$set": {"current_version.resources": [r.model_dump() for r in resources], "updated_at": now}},
    )
    if result.matched_count == 0:
        return None
    return await get_estimation(estimation_id)


async def add_review(estimation_id: str, review: ReviewRecord) -> Optional[Estimation]:
    db = get_db()
    now = datetime.utcnow()
    result = await db.estimations.update_one(
        {"_id": _oid(estimation_id)},
        {"$push": {"review_records": review.model_dump()}, "$set": {"updated_at": now}},
    )
    if result.matched_count == 0:
        return None
    est = await get_estimation(estimation_id)
    if est is None:
        return None
    approvals = sum(1 for r in est.review_records if r.approved)
    if est.status != "ready_for_pricing" and approvals >= 2:
        await db.estimations.update_one({"_id": _oid(estimation_id)}, {"$set": {"status": "ready_for_pricing", "updated_at": now}})
        est = await get_estimation(estimation_id)
    return est


async def snapshot_version(estimation_id: str, user_id: str, notes: str | None = None) -> Optional[Estimation]:
    est = await get_estimation(estimation_id)
    if est is None:
        return None
    new_version_number = (est.current_version.version_number or 0) + 1
    new_version = EstimationVersion(
        version_number=new_version_number,
        features=est.current_version.features,
        resources=est.current_version.resources,
        created_by=user_id,
        created_at=datetime.utcnow(),
        notes=notes,
    )
    db = get_db()
    await db.estimations.update_one(
        {"_id": _oid(estimation_id)},
        {"$push": {"versions": new_version.model_dump()}, "$set": {"current_version": new_version.model_dump(), "updated_at": datetime.utcnow()}},
    )
    return await get_estimation(estimation_id)


async def list_versions(estimation_id: str) -> list[EstimationVersion]:
    est = await get_estimation(estimation_id)
    return est.versions if est else []


async def rollback_version(estimation_id: str, version_number: int) -> Optional[Estimation]:
    est = await get_estimation(estimation_id)
    if est is None:
        return None
    target = next((v for v in est.versions if v.version_number == version_number), None)
    if target is None:
        return None
    db = get_db()
    now = datetime.utcnow()
    await db.estimations.update_one(
        {"_id": _oid(estimation_id)},
        {"$set": {"current_version": target.model_dump(), "updated_at": now}},
    )
    return await get_estimation(estimation_id)


