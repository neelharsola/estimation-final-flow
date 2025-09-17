from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict

from pydantic import BaseModel, Field


class CurrencyRates(BaseModel):
    AED: float | None = None
    INR: float | None = None
    USD: float | None = None
    POUND: float | None = None


class Resource(BaseModel):
    id: Optional[str] = Field(default=None, serialization_alias="_id")
    name: str
    role: str
    notes: Optional[str] = None
    rates: CurrencyRates = Field(default_factory=CurrencyRates)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


