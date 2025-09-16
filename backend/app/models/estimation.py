from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional, Dict, Any

from pydantic import BaseModel, Field


class SourceRef(BaseModel):
    doc_id: str
    section: str
    page: int


class Hours(BaseModel):
    ui_design: float = 0
    ui_module: float = 0
    backend_logic: float = 0
    general: float = 0
    service_api: float = 0
    db_structure: float = 0
    db_programming: float = 0
    db_udf: float = 0


class PreviousProjectActual(BaseModel):
    project_name: Optional[str] = None
    actual_working_days: Optional[float] = None


class EstimationRow(BaseModel):
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
    source_refs: List[SourceRef] = []
    assumptions: List[str] = []
    risks: List[str] = []
    dependencies: List[str] = []
    assumed: bool = True
    total_hours: float
    contingency_pct: float = 0.1
    total_hours_with_contingency: float
    single_resource_duration_days: int
    single_resource_duration_months: float


class Estimator(BaseModel):
    name: str
    id: int


class ProjectInfo(BaseModel):
    name: str
    estimator: Estimator
    hours_per_day: int = 8
    working_days_per_month: int = 18
    contingency_pct: float = 0.1


class EstimationSummary(BaseModel):
    row_count: int
    total_hours: float
    total_hours_with_contingency: float
    single_resource_duration_days: int
    single_resource_duration_months: float
    notes: List[str] = []


class EstimationEnvelope(BaseModel):
    schema_version: str = "1.0"
    project: ProjectInfo
    rows: List[EstimationRow]
    summary: EstimationSummary


# Legacy models for backward compatibility
class Feature(BaseModel):
    title: str
    hours: float
    complexity: Optional[str] = None
    priority: Optional[int] = None


class ResourceAllocation(BaseModel):
    role: str
    count: int
    days: int
    allocation_type: Literal["ft", "pt"]


class ReviewRecord(BaseModel):
    reviewer_id: str
    approved: bool
    comment: Optional[str] = None
    created_at: datetime


class EstimationVersion(BaseModel):
    version_number: int
    features: List[Feature]
    resources: List[ResourceAllocation]
    created_by: str
    created_at: datetime
    notes: Optional[str] = None


class Estimation(BaseModel):
    id: Optional[str] = Field(default=None, serialization_alias="_id")
    title: str
    client: str
    description: Optional[str] = None
    status: Literal["draft", "under_review", "ready_for_pricing"]
    creator_id: str
    current_version: EstimationVersion
    versions: List[EstimationVersion]
    review_records: List[ReviewRecord]
    created_at: datetime
    updated_at: datetime
    
    # New fields for detailed estimation data
    envelope_data: Optional[EstimationEnvelope] = None


