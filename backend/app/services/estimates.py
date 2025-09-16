from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import List, Optional

from bson import ObjectId

from app.db.mongo import get_db
from app.models.estimate import (
    Estimate,
    EstimateCreate,
    EstimateListItem,
    EstimateSummary,
    PaginatedEstimates,
)

logger = logging.getLogger(__name__)


class EstimateService:
    """Service layer for estimate operations."""
    
    @staticmethod
    async def create_estimate(estimate_data: EstimateCreate, user_id: str) -> Estimate:
        """Create a new estimate."""
        db = get_db()
        
        # Calculate summary if not provided
        if not estimate_data.summary:
            estimate_data.summary = EstimateService._calculate_summary(estimate_data.rows)
        
        # Create estimate object
        estimate = Estimate(
            id=str(uuid.uuid4()),
            schema_version=estimate_data.schema_version,
            project=estimate_data.project,
            rows=estimate_data.rows,
            summary=estimate_data.summary,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Save to database
        doc = estimate.model_dump(by_alias=True, exclude_none=True)
        await db.estimates.insert_one(doc)
        
        logger.info(f"Created estimate {estimate.id} for user {user_id}")
        return estimate
    
    @staticmethod
    async def get_estimate(estimate_id: str) -> Optional[Estimate]:
        """Get estimate by ID."""
        db = get_db()
        
        try:
            doc = await db.estimates.find_one({"_id": estimate_id})
            if not doc:
                return None
            
            return Estimate.model_validate(doc)
            
        except Exception as e:
            logger.error(f"Failed to get estimate {estimate_id}: {e}")
            return None
    
    @staticmethod
    async def list_estimates(
        page: int = 1,
        size: int = 10,
        platform: Optional[str] = None,
        module: Optional[str] = None,
        complexity: Optional[str] = None
    ) -> PaginatedEstimates:
        """List estimates with pagination and filters."""
        db = get_db()
        
        # Build filter query
        query = {}
        if platform:
            query["rows.platform"] = platform
        if module:
            query["rows.module"] = {"$regex": module, "$options": "i"}
        if complexity:
            query["rows.complexity"] = complexity
        
        # Get total count
        total = await db.estimates.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * size
        cursor = db.estimates.find(
            query,
            {
                "_id": 1,
                "project.name": 1,
                "project.estimator.name": 1,
                "summary.total_hours": 1,
                "created_at": 1
            }
        ).sort("created_at", -1).skip(skip).limit(size)
        
        items = []
        async for doc in cursor:
            items.append(EstimateListItem(
                id=doc["_id"],
                project_name=doc["project"]["name"],
                estimator_name=doc["project"]["estimator"]["name"],
                total_hours=doc["summary"]["total_hours"],
                created_at=doc["created_at"]
            ))
        
        pages = (total + size - 1) // size
        
        return PaginatedEstimates(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
    
    @staticmethod
    def parse_json_content(content: bytes) -> EstimateCreate:
        """Parse JSON content into EstimateCreate model."""
        try:
            data = json.loads(content.decode('utf-8'))
            return EstimateCreate.model_validate(data)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {e}")
        except Exception as e:
            raise ValueError(f"Invalid estimate data structure: {e}")
    
    @staticmethod
    async def update_estimate(estimate_id: str, estimate_data: EstimateCreate, user_id: str) -> Estimate:
        """Update an existing estimate."""
        db = get_db()
        
        # Calculate summary if not provided
        if not estimate_data.summary:
            estimate_data.summary = EstimateService._calculate_summary(estimate_data.rows)
        
        # Update estimate object
        updated_estimate = Estimate(
            id=estimate_id,
            schema_version=estimate_data.schema_version,
            project=estimate_data.project,
            rows=estimate_data.rows,
            summary=estimate_data.summary,
            updated_at=datetime.utcnow()
        )
        
        # Update in database
        doc = updated_estimate.model_dump(by_alias=True, exclude_none=True)
        result = await db.estimates.update_one(
            {"_id": estimate_id},
            {"$set": doc}
        )
        
        if result.modified_count == 0:
            raise ValueError(f"Failed to update estimate {estimate_id}")
        
        # Get and return updated estimate
        updated_doc = await db.estimates.find_one({"_id": estimate_id})
        
        logger.info(f"Updated estimate {estimate_id} by user {user_id}")
        return Estimate.model_validate(updated_doc)
    
    @staticmethod
    def _calculate_summary(rows: List) -> EstimateSummary:
        """Calculate summary statistics from estimate rows."""
        total_hours = sum(row.total_hours for row in rows)
        total_hours_with_contingency = sum(row.total_hours_with_contingency for row in rows)
        
        # Calculate duration assuming single resource
        duration_days = max(row.single_resource_duration_days for row in rows) if rows else 0
        duration_months = max(row.single_resource_duration_months for row in rows) if rows else 0
        
        return EstimateSummary(
            row_count=len(rows),
            total_hours=total_hours,
            total_hours_with_contingency=total_hours_with_contingency,
            single_resource_duration_days=duration_days,
            single_resource_duration_months=duration_months
        )
