from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


def generate_uuid() -> str:
    return str(uuid.uuid4())


class AuditLog(BaseModel):
    id: str = Field(default_factory=generate_uuid, alias="_id")
    user_id: str
    action: Literal[
        "CREATE_ESTIMATE",
        "VIEW_ESTIMATE", 
        "DOWNLOAD_EXCEL",
        "LOGIN",
        "LOGOUT",
        "CREATE_USER",
        "UPDATE_USER",
        "DELETE_USER"
    ]
    resource_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        populate_by_name = True
