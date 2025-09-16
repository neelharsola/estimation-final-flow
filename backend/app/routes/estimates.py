from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.core.security import get_current_user_id, require_role
from app.db.mongo import get_db
from app.models.audit import AuditLog
from app.models.estimate import (
    Estimate,
    EstimateCreate,
    EstimateListItem,
    EstimateResponse,
    PaginatedEstimates,
)
from app.services.audit import log_action
from app.services.estimates import EstimateService
from app.services.excel import ExcelService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/estimates", tags=["estimates"])


@router.post("/", response_model=EstimateResponse)
async def create_estimate(
    estimate_data: EstimateCreate,
    user_id: str = Depends(get_current_user_id),
    _: None = Depends(require_role("Estimator", "Admin"))
) -> EstimateResponse:
    """Create a new estimate from JSON data."""
    try:
        # Create estimate in database
        estimate = await EstimateService.create_estimate(estimate_data, user_id)
        
        # Generate Excel file
        excel_path = await ExcelService.generate_excel(estimate)
        
        # Log action
        await log_action(
            user_id=user_id,
            action="CREATE_ESTIMATE",
            resource_id=estimate.id,
            metadata={"project_name": estimate.project.name}
        )
        
        return EstimateResponse(
            id=estimate.id,
            download_url=f"/api/v1/estimates/{estimate.id}/excel"
        )
        
    except Exception as e:
        logger.error(f"Failed to create estimate: {e}")
        raise HTTPException(status_code=500, detail="Failed to create estimate")


@router.post("/upload", response_model=EstimateResponse)
async def upload_estimate_json(
    json_file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    _: None = Depends(require_role("Estimator", "Admin"))
) -> EstimateResponse:
    """Upload and process estimation JSON file."""
    if not json_file.filename or not json_file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Please upload a valid JSON file")
    
    try:
        # Parse JSON content
        content = await json_file.read()
        estimate_data = EstimateService.parse_json_content(content)
        
        # Create estimate
        estimate = await EstimateService.create_estimate(estimate_data, user_id)
        
        # Generate Excel
        excel_path = await ExcelService.generate_excel(estimate)
        
        # Log action
        await log_action(
            user_id=user_id,
            action="CREATE_ESTIMATE",
            resource_id=estimate.id,
            metadata={
                "source": "json_upload",
                "filename": json_file.filename,
                "project_name": estimate.project.name
            }
        )
        
        return EstimateResponse(
            id=estimate.id,
            download_url=f"/api/v1/estimates/{estimate.id}/excel"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to process uploaded JSON: {e}")
        raise HTTPException(status_code=500, detail="Failed to process JSON file")


@router.get("/{estimate_id}", response_model=Estimate)
async def get_estimate(
    estimate_id: str,
    user_id: str = Depends(get_current_user_id),
    _: None = Depends(require_role("Estimator", "Ops", "Admin"))
) -> Estimate:
    """Get estimate by ID."""
    estimate = await EstimateService.get_estimate(estimate_id)
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    
    # Log view action
    await log_action(
        user_id=user_id,
        action="VIEW_ESTIMATE",
        resource_id=estimate_id
    )
    
    return estimate


@router.get("/{estimate_id}/excel")
async def download_excel(
    estimate_id: str,
    user_id: str = Depends(get_current_user_id),
    _: None = Depends(require_role("Estimator", "Ops", "Admin"))
) -> FileResponse:
    """Download Excel file for estimate."""
    estimate = await EstimateService.get_estimate(estimate_id)
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    
    try:
        # Generate or get existing Excel file
        excel_path = await ExcelService.get_or_generate_excel(estimate)
        
        if not Path(excel_path).exists():
            raise HTTPException(status_code=404, detail="Excel file not found")
        
        # Log download action
        await log_action(
            user_id=user_id,
            action="DOWNLOAD_EXCEL",
            resource_id=estimate_id,
            metadata={"project_name": estimate.project.name}
        )
        
        filename = f"{estimate.project.name}_estimate.xlsx"
        return FileResponse(
            excel_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        
    except Exception as e:
        logger.error(f"Failed to generate Excel for estimate {estimate_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate Excel file")


@router.put("/{estimate_id}", response_model=Estimate)
async def update_estimate(
    estimate_id: str,
    estimate_data: EstimateCreate,
    user_id: str = Depends(get_current_user_id),
    _: None = Depends(require_role("Estimator", "Admin"))
) -> Estimate:
    """Update an existing estimate."""
    existing_estimate = await EstimateService.get_estimate(estimate_id)
    if not existing_estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    
    try:
        # Update estimate in database
        updated_estimate = await EstimateService.update_estimate(
            estimate_id, estimate_data, user_id
        )
        
        # Regenerate Excel file with updated data
        excel_path = await ExcelService.generate_excel(updated_estimate)
        
        # Log action
        await log_action(
            user_id=user_id,
            action="UPDATE_ESTIMATE",
            resource_id=estimate_id,
            metadata={"project_name": updated_estimate.project.name}
        )
        
        return updated_estimate
        
    except Exception as e:
        logger.error(f"Failed to update estimate {estimate_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update estimate")


@router.post("/process-with-template", response_model=EstimateResponse)
async def process_estimate_with_template(
    json_file: UploadFile = File(..., description="Estimate JSON file"),
    template_file: Optional[UploadFile] = File(None, description="Excel template file"),
    user_id: str = Depends(get_current_user_id),
    _: None = Depends(require_role("Estimator", "Admin"))
) -> EstimateResponse:
    """Process estimate JSON with optional custom Excel template."""
    if not json_file.filename or not json_file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Please upload a valid JSON file")
    
    if template_file and not (template_file.filename.endswith('.xlsx') or template_file.filename.endswith('.xlsm')):
        raise HTTPException(status_code=400, detail="Template must be an Excel file (.xlsx or .xlsm)")
    
    try:
        # Parse JSON content
        content = await json_file.read()
        estimate_data = EstimateService.parse_json_content(content)
        
        # Create estimate
        estimate = await EstimateService.create_estimate(estimate_data, user_id)
        
        # Generate Excel with custom template if provided
        if template_file:
            excel_path = await ExcelService.generate_with_custom_template(
                estimate, template_file
            )
        else:
            excel_path = await ExcelService.generate_excel(estimate)
        
        # Log action
        await log_action(
            user_id=user_id,
            action="CREATE_ESTIMATE",
            resource_id=estimate.id,
            metadata={
                "source": "json_with_template",
                "json_filename": json_file.filename,
                "template_filename": template_file.filename if template_file else None,
                "project_name": estimate.project.name
            }
        )
        
        return EstimateResponse(
            id=estimate.id,
            download_url=f"/api/v1/estimates/{estimate.id}/excel"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to process estimate with template: {e}")
        raise HTTPException(status_code=500, detail="Failed to process estimate")


@router.get("/", response_model=PaginatedEstimates)
async def list_estimates(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    platform: Optional[str] = Query(None, description="Filter by platform"),
    module: Optional[str] = Query(None, description="Filter by module"),
    complexity: Optional[str] = Query(None, description="Filter by complexity"),
    user_id: str = Depends(get_current_user_id),
    _: None = Depends(require_role("Estimator", "Ops", "Admin"))
) -> PaginatedEstimates:
    """List estimates with pagination and filters."""
    try:
        return await EstimateService.list_estimates(
            page=page,
            size=size,
            platform=platform,
            module=module,
            complexity=complexity
        )
    except Exception as e:
        logger.error(f"Failed to list estimates: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve estimates")
