from __future__ import annotations

import asyncio
from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from app.db.mongo import get_db
from app.models.estimation import Estimation, EstimationVersion, Feature, ResourceAllocation, ReviewRecord
from app.services.excel import ExcelService


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
    # add non-aliased id for frontend robustness
    doc["id"] = doc["_id"]
    # attach estimator name for display
    try:
        creator = await db.users.find_one({"_id": ObjectId(str(doc.get("creator_id", "")))}, {"name": 1})
        if creator and creator.get("name"):
            doc["estimator_name"] = creator["name"]
    except Exception:
        pass
    # replace version created_by ids with names for display
    try:
        def _created_by_to_name(v: dict) -> dict:
            if not isinstance(v, dict):
                return v
            user = None
            try:
                user = db.users.find_one({"_id": ObjectId(str(v.get("created_by", "")))}, {"name": 1})
            except Exception:
                user = None
            # db.users.find_one above is not awaited; use motor: need await
            return v
        # fetch map for all unique ids
        ids: set[str] = set()
        cv = doc.get("current_version") or {}
        if cv.get("created_by"):
            ids.add(str(cv["created_by"]))
        for v in doc.get("versions", []) or []:
            if isinstance(v, dict) and v.get("created_by"):
                ids.add(str(v["created_by"]))
        id_to_name: dict[str, str] = {}
        for uid in ids:
            try:
                u = await db.users.find_one({"_id": ObjectId(uid)}, {"name": 1})
                if u and u.get("name"):
                    id_to_name[uid] = u["name"]
            except Exception:
                pass
        if cv and cv.get("created_by") in id_to_name:
            cv["created_by"] = id_to_name.get(cv.get("created_by"))
            doc["current_version"] = cv
        new_versions = []
        for v in (doc.get("versions") or []):
            if isinstance(v, dict) and v.get("created_by") in id_to_name:
                v["created_by"] = id_to_name[v["created_by"]]
            new_versions.append(v)
        doc["versions"] = new_versions
    except Exception:
        pass
    return Estimation.model_validate(doc)


async def list_estimations(created_by: str | None = None) -> List[Estimation]:
    db = get_db()
    items: list[Estimation] = []
    query: dict = {}
    if created_by:
        query["creator_id"] = created_by
    async for doc in db.estimations.find(query).sort("updated_at", -1):
        doc["_id"] = str(doc["_id"])  # serialize
        doc["id"] = doc["_id"]
        # attach estimator name for display in list
        try:
            creator = await db.users.find_one({"_id": ObjectId(str(doc.get("creator_id", "")))}, {"name": 1})
            if creator and creator.get("name"):
                doc["estimator_name"] = creator["name"]
        except Exception:
            pass
        items.append(Estimation.model_validate(doc))
    return items


async def update_envelope_data(estimation_id: str, envelope: dict) -> Optional[Estimation]:
    db = get_db()
    now = datetime.utcnow()
    result = await db.estimations.update_one(
        {"_id": _oid(estimation_id)},
        {"$set": {"envelope_data": envelope, "updated_at": now}},
    )
    if result.matched_count == 0:
        return None
    est = await get_estimation(estimation_id)
    if est:
        asyncio.create_task(ExcelService.generate_excel(est))
    return est


async def update_estimation_title_client_desc(estimation_id: str, payload: dict) -> Optional[Estimation]:
    db = get_db()
    now = datetime.utcnow()
    updates: dict = {"updated_at": now}
    if "title" in payload:
        updates["title"] = payload["title"]
    if "client" in payload:
        updates["client"] = payload["client"]
    if "description" in payload:
        updates["description"] = payload["description"]
    if "status" in payload:
        updates["status"] = payload["status"]
    if "creator_id" in payload and payload["creator_id"]:
        # store as string but keep original semantics
        updates["creator_id"] = str(payload["creator_id"])
    result = await db.estimations.update_one({"_id": _oid(estimation_id)}, {"$set": updates})
    if result.matched_count == 0:
        return None
    return await get_estimation(estimation_id)


async def delete_estimation(estimation_id: str) -> bool:
    db = get_db()
    res = await db.estimations.delete_one({"_id": _oid(estimation_id)})
    return res.deleted_count > 0


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


