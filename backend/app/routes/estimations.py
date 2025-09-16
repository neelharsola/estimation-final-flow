from __future__ import annotations

from datetime import datetime
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.db.mongo import get_db
from app.models.estimation import Estimation, EstimationVersion, Feature, ResourceAllocation, ReviewRecord
from app.services.estimations import (
    add_review,
    create_estimation,
    get_estimation,
    list_estimations,
    list_versions,
    rollback_version,
    snapshot_version,
    update_features,
    update_resources,
    update_estimation_title_client_desc,
    delete_estimation,
    update_envelope_data,
)


router = APIRouter()


async def get_current_user_role_dep(user_id: str = Depends(get_current_user_id)) -> str:
    db = get_db()
    doc = await db.users.find_one({"_id": ObjectId(user_id)}, {"role": 1})
    if not doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return str(doc.get("role", "")).lower()


async def _list_estims(user_id: str, role: str) -> List[Estimation]:
    # Estimators see only their own; ops/admin see all
    if role == "estimator":
        return await list_estimations(created_by=user_id)
    return await list_estimations()


@router.get("/", response_model=List[Estimation])
async def get_all(user_id: str = Depends(get_current_user_id), role: str = Depends(get_current_user_role_dep)) -> List[Estimation]:
    return await _list_estims(user_id, role)


# Removed duplicate GET without slash to reduce redundancy


@router.post("/", response_model=Estimation)
async def create(payload: Estimation, user_id: str = Depends(get_current_user_id), role: str = Depends(get_current_user_role_dep)) -> Estimation:
    if role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin is read-only for estimations")
    now = datetime.utcnow()
    payload.created_at = now
    payload.updated_at = now
    payload.creator_id = user_id
    if payload.current_version is None:
        payload.current_version = EstimationVersion(
            version_number=1,
            features=[],
            resources=[],
            created_by=user_id,
            created_at=now,
        )
    if payload.versions is None:
        payload.versions = []
    if payload.review_records is None:
        payload.review_records = []
    return await create_estimation(payload)


@router.get("/{estimation_id}", response_model=Estimation)
async def get_one(estimation_id: str) -> Estimation:
    est = await get_estimation(estimation_id)
    if est is None:
        raise HTTPException(status_code=404, detail="Not found")
    return est


@router.patch("/{estimation_id}", response_model=Estimation)
async def update_basic(
    estimation_id: str,
    payload: dict,
    role: str = Depends(get_current_user_role_dep)
) -> Estimation:
    # Allow admin, estimator, ops to update; but only admin can change creator_id
    if role not in ("estimator", "ops", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    if "creator_id" in payload and role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin can change estimator")
    est = await update_estimation_title_client_desc(estimation_id, payload)
    if est is None:
        raise HTTPException(status_code=404, detail="Not found")
    return est


@router.delete("/{estimation_id}")
async def remove(estimation_id: str, role: str = Depends(get_current_user_role_dep)) -> dict:
    if role not in ("estimator", "ops"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only estimator or ops can delete")
    ok = await delete_estimation(estimation_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}


@router.put("/{estimation_id}/features", response_model=Estimation)
async def set_features(estimation_id: str, features: List[Feature], role: str = Depends(get_current_user_role_dep)) -> Estimation:
    if role not in ("estimator", "ops"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only estimator or ops can modify features")
    est = await update_features(estimation_id, features)
    if est is None:
        raise HTTPException(status_code=404, detail="Not found")
    return est


@router.put("/{estimation_id}/resources", response_model=Estimation)
async def set_resources(estimation_id: str, resources: List[ResourceAllocation], role: str = Depends(get_current_user_role_dep)) -> Estimation:
    if role not in ("estimator", "ops"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only estimator or ops can modify resources")
    est = await update_resources(estimation_id, resources)
    if est is None:
        raise HTTPException(status_code=404, detail="Not found")
    return est
# Update full envelope_data for an estimation
@router.put("/{estimation_id}/envelope", response_model=Estimation)
async def set_envelope(
    estimation_id: str,
    payload: dict,
    user_id: str = Depends(get_current_user_id),
    role: str = Depends(get_current_user_role_dep),
) -> Estimation:
    # Check permissions: Admin and Ops can edit any. Estimators can only edit their own.
    if role not in ("admin", "ops"):
        if role == "estimator":
            existing_est = await get_estimation(estimation_id)
            if not existing_est:
                raise HTTPException(status_code=404, detail="Not found")
            if existing_est.creator_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Estimators can only modify their own estimations.",
                )
        else:
            # Deny any other role
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify the envelope.",
            )

    est = await update_envelope_data(estimation_id, payload)
    if est is None:
        raise HTTPException(status_code=404, detail="Not found")
    return est


# Removed reviewer-only review endpoint as 'reviewer' role is no longer used


@router.post("/{estimation_id}/versions", response_model=Estimation)
async def create_version(estimation_id: str, user_id: str = Depends(get_current_user_id), role: str = Depends(get_current_user_role_dep)) -> Estimation:
    if role not in ("estimator", "ops"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only estimator or ops can snapshot versions")
    est = await snapshot_version(estimation_id, user_id)
    if est is None:
        raise HTTPException(status_code=404, detail="Not found")
    return est


@router.get("/{estimation_id}/versions", response_model=List[EstimationVersion])
async def versions(estimation_id: str) -> List[EstimationVersion]:
    return await list_versions(estimation_id)


@router.post("/{estimation_id}/versions/{version_number}/rollback", response_model=Estimation)
async def rollback(estimation_id: str, version_number: int, role: str = Depends(get_current_user_role_dep)) -> Estimation:
    if role not in ("estimator", "ops"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only estimator or ops can rollback versions")
    est = await rollback_version(estimation_id, version_number)
    if est is None:
        raise HTTPException(status_code=404, detail="Not found")
    return est


