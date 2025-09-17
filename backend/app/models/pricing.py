from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PricingRate(BaseModel):
    id: Optional[str] = Field(default=None, serialization_alias="_id")
    role: str
    region: str
    day_rate: float
    currency: str = "USD"
    version: int
    effective_from: datetime


class PricingCalcRequest(BaseModel):
    estimation_id: str


class PricingBreakdownItem(BaseModel):
    role: str
    region: str
    days: float
    rate: float
    currency: str
    cost: float


class PricingCalcResponse(BaseModel):
    items: list[PricingBreakdownItem]
    total: float
    currency: str


class ProjectSummary(BaseModel):
    id: str = Field(serialization_alias="_id")
    title: str
    client: str
    created_at: datetime
    updated_at: datetime


class ProjectResourcePricing(BaseModel):
    role: str
    day_rate: float
    currency: str = "USD"
    region: str = "default"


