from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from app.models.estimation import (
    Estimation, EstimationVersion, Feature, EstimationEnvelope,
    EstimationRow, ProjectInfo, EstimationSummary, Estimator,
    Hours, PreviousProjectActual, SourceRef
)
import hashlib


def _safe_str(value: Any) -> str:
    return str(value) if value is not None else ""


def _safe_float(value: Any) -> float:
    try:
        return float(value) if value is not None else 0.0
    except (ValueError, TypeError):
        return 0.0


def _safe_int(value: Any) -> int:
    try:
        return int(value) if value is not None else 0
    except (ValueError, TypeError):
        return 0


def _row_to_feature(row: Dict[str, Any]) -> Feature:
    module = _safe_str(row.get("module"))
    component = _safe_str(row.get("component"))
    feature_name = _safe_str(row.get("feature"))
    title = " - ".join([p for p in [module, component, feature_name] if p]) or feature_name or module or component or "Feature"
    complexity = row.get("complexity")

    hours_total = None
    try:
        if isinstance(row.get("hours"), dict):
            hours_total = float(sum(float(v or 0) for v in row["hours"].values()))
    except Exception:
        hours_total = None
    if hours_total is None:
        try:
            hours_total = float(row.get("total_hours"))
        except Exception:
            hours_total = 0.0

    return Feature(title=title, hours=hours_total, complexity=complexity, priority=None)


def _compute_row_id(row_data: Dict[str, Any]) -> str:
    key_parts = [
        str(row_data.get("platform", "")),
        str(row_data.get("module", "")),
        str(row_data.get("component", "")),
        str(row_data.get("feature", "")),
    ]
    raw = "|".join(p.strip().lower() for p in key_parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()  # stable deterministic id


def _parse_estimation_row(row_data: Dict[str, Any]) -> EstimationRow:
    """Parse a single row from the JSON envelope into EstimationRow model"""
    
    # Parse hours
    hours_data = row_data.get("hours", {})
    hours = Hours(
        ui_design=_safe_float(hours_data.get("ui_design")),
        ui_module=_safe_float(hours_data.get("ui_module")),
        backend_logic=_safe_float(hours_data.get("backend_logic")),
        general=_safe_float(hours_data.get("general")),
        service_api=_safe_float(hours_data.get("service_api")),
        db_structure=_safe_float(hours_data.get("db_structure")),
        db_programming=_safe_float(hours_data.get("db_programming")),
        db_udf=_safe_float(hours_data.get("db_udf"))
    )
    
    # Parse previous project actual
    ppa_data = row_data.get("previous_project_actual")
    previous_project_actual = None
    if ppa_data:
        previous_project_actual = PreviousProjectActual(
            project_name=ppa_data.get("project_name"),
            actual_working_days=_safe_float(ppa_data.get("actual_working_days"))
        )
    
    # Parse source references
    source_refs = []
    for ref_data in row_data.get("source_refs", []):
        source_refs.append(SourceRef(
            doc_id=ref_data.get("doc_id", ""),
            section=ref_data.get("section", ""),
            page=_safe_int(ref_data.get("page"))
        ))
    
    return EstimationRow(
        row_id=row_data.get("row_id") or _compute_row_id(row_data),
        platform=_safe_str(row_data.get("platform")),
        module=_safe_str(row_data.get("module")),
        component=_safe_str(row_data.get("component")),
        feature=_safe_str(row_data.get("feature")),
        make_or_reuse=row_data.get("make_or_reuse", "Make"),
        reuse_source=row_data.get("reuse_source"),
        complexity=row_data.get("complexity", "Average"),
        previous_project_actual=previous_project_actual,
        hours=hours,
        num_components=_safe_int(row_data.get("num_components")),
        source_refs=source_refs,
        assumptions=row_data.get("assumptions", []),
        risks=row_data.get("risks", []),
        dependencies=row_data.get("dependencies", []),
        assumed=row_data.get("assumed", True),
        total_hours=_safe_float(row_data.get("total_hours")),
        contingency_pct=_safe_float(row_data.get("contingency_pct", 0.1)),
        total_hours_with_contingency=_safe_float(row_data.get("total_hours_with_contingency")),
        single_resource_duration_days=_safe_int(row_data.get("single_resource_duration_days")),
        single_resource_duration_months=_safe_float(row_data.get("single_resource_duration_months"))
    )


def parse_estimation_envelope(envelope_data: Dict[str, Any]) -> EstimationEnvelope:
    """Parse the complete JSON envelope into EstimationEnvelope model"""
    
    # Parse project info
    project_data = envelope_data.get("project", {})
    estimator_data = project_data.get("estimator", {})
    
    estimator = Estimator(
        name=estimator_data.get("name", "Unknown"),
        id=_safe_int(estimator_data.get("id", 1))
    )
    
    project = ProjectInfo(
        name=project_data.get("name", "Unknown Project"),
        estimator=estimator,
        hours_per_day=_safe_int(project_data.get("hours_per_day", 8)),
        working_days_per_month=_safe_int(project_data.get("working_days_per_month", 18)),
        contingency_pct=_safe_float(project_data.get("contingency_pct", 0.1))
    )
    
    # Parse rows
    rows = []
    for row_data in envelope_data.get("rows", []):
        try:
            rows.append(_parse_estimation_row(row_data))
        except Exception as e:
            print(f"Warning: Failed to parse row: {e}")
            continue
    
    # Parse summary
    summary_data = envelope_data.get("summary", {})
    summary = EstimationSummary(
        row_count=_safe_int(summary_data.get("row_count", len(rows))),
        total_hours=_safe_float(summary_data.get("total_hours")),
        total_hours_with_contingency=_safe_float(summary_data.get("total_hours_with_contingency")),
        single_resource_duration_days=_safe_int(summary_data.get("single_resource_duration_days")),
        single_resource_duration_months=_safe_float(summary_data.get("single_resource_duration_months")),
        notes=summary_data.get("notes", [])
    )
    
    return EstimationEnvelope(
        schema_version=envelope_data.get("schema_version", "1.0"),
        project=project,
        rows=rows,
        summary=summary
    )


def build_estimation_from_envelope(envelope: Dict[str, Any], creator_id: str) -> Estimation:
    """Build Estimation model from JSON envelope for backward compatibility"""
    project = envelope.get("project") or {}
    title = project.get("name") or "Imported Estimation"
    client = project.get("client") or project.get("name") or "Unknown"

    rows = envelope.get("rows") or []
    features: List[Feature] = []
    for row in rows:
        try:
            features.append(_row_to_feature(row))
        except Exception:
            continue

    now = datetime.utcnow()
    current_version = EstimationVersion(
        version_number=1,
        features=features,
        resources=[],
        created_by=creator_id,
        created_at=now,
        notes=None,
    )

    # Parse the full envelope data
    try:
        envelope_data = parse_estimation_envelope(envelope)
    except Exception:
        envelope_data = None

    est = Estimation(
        id=None,
        title=title,
        client=client,
        description=None,
        status="draft",
        creator_id=creator_id,
        current_version=current_version,
        versions=[],
        review_records=[],
        created_at=now,
        updated_at=now,
        envelope_data=envelope_data
    )
    return est


