from typing import List
from fastapi import APIRouter, Depends
from app.db.mongo import get_db
from app.models.audit import AuditLog
from app.core.security import get_current_user_id

router = APIRouter()

@router.get("/audit", response_model=List[AuditLog])
async def get_audit_logs(limit: int = 100, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    logs = []
    async for doc in db.audit_logs.find().sort("timestamp", -1).limit(limit):
        logs.append(AuditLog.model_validate(doc))
    return logs
