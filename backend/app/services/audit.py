from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.db.mongo import get_db
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


async def log_action(
    user_id: str,
    action: str,
    resource_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> None:
    """Log user action to audit trail."""
    try:
        db = get_db()
        
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_id=resource_id,
            metadata=metadata or {},
            timestamp=datetime.utcnow()
        )
        
        await db.audit_logs.insert_one(audit_log.model_dump(by_alias=True))
        logger.debug(f"Logged action {action} for user {user_id}")
        
    except Exception as e:
        # Don't fail the main operation if audit logging fails
        logger.error(f"Failed to log audit action: {e}")
