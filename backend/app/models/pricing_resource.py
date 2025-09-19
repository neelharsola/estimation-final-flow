from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PricingResource(BaseModel):
    id: Optional[str] = Field(default=None, serialization_alias="_id")
    estimation_id: str
    role: str
    days: float
    count: int
    hourly_rate: float = 0.0
    day_rate: float = 0.0
    currency: str = "USD"
    region: str = "default"
    total_cost: float = 0.0
    created_at: datetime
    updated_at: datetime

    class Config:
        extra = "allow"