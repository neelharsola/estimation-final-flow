from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


def generate_uuid() -> str:
    return str(uuid.uuid4())


class SourceRef(BaseModel):
    doc_id: str
    section: str
    page: int


class Hours(BaseModel):
    ui_design: float = 0.0
    ui_module: float = 0.0
    backend_logic: float = 0.0
    general: float = 0.0
    service_api: float = 0.0
    db_structure: float = 0.0
    db_programming: float = 0.0
    db_udf: float = 0.0


class PreviousProjectActual(BaseModel):
    project_name: Optional[str] = None
    actual_working_days: Optional[float] = None


class EstimateRow(BaseModel):
    platform: str
    module: str
    component: str
    feature: str
    make_or_reuse: Literal["Make", "Reuse"]
    reuse_source: Optional[str] = None
    complexity: Literal["Simple", "Average", "Complex"]
    previous_project_actual: Optional[PreviousProjectActual] = None
    hours: Hours
    num_components: int
    source_refs: List[SourceRef] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    assumed: bool = True
    total_hours: float
    contingency_pct: float = 0.1
    total_hours_with_contingency: float
    single_resource_duration_days: float
    single_resource_duration_months: float


class Estimator(BaseModel):
    id: str
    name: str


class EstimateProject(BaseModel):
    name: str
    estimator: Estimator
    hours_per_day: int = 8
    working_days_per_month: int = 18
    contingency_pct: float = 0.1


class EstimateSummary(BaseModel):
    row_count: int
    total_hours: float
    total_hours_with_contingency: float
    single_resource_duration_days: float
    single_resource_duration_months: float
    notes: List[str] = Field(default_factory=list)


class Estimate(BaseModel):
    id: str = Field(default_factory=generate_uuid, alias="_id")
    schema_version: str = "1.0"
    project: EstimateProject
    rows: List[EstimateRow]
    summary: EstimateSummary
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class EstimateCreate(BaseModel):
    schema_version: str = "1.0"
    project: EstimateProject
    rows: List[EstimateRow]
    summary: Optional[EstimateSummary] = None


class EstimateResponse(BaseModel):
    id: str
    download_url: str


class EstimateListItem(BaseModel):
    id: str
    project_name: str
    estimator_name: str
    total_hours: float
    created_at: datetime


class PaginatedEstimates(BaseModel):
    items: List[EstimateListItem]
    total: int
    page: int
    size: int
    pages: int
