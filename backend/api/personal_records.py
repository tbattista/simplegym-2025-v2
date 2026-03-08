"""
User Personal Records Management
Handles marking, removing, and querying personal records
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
import logging
from ..models import PersonalRecordsResponse, MarkPersonalRecordRequest, UpdatePersonalRecordRequest
from ..api.dependencies import get_personal_records_service, require_auth

router = APIRouter(prefix="/api/v3/users/me", tags=["Personal Records"])
logger = logging.getLogger(__name__)


@router.get("/personal-records", response_model=PersonalRecordsResponse)
@router.get("/personal-records/", response_model=PersonalRecordsResponse)
async def get_user_personal_records(
    user_id: str = Depends(require_auth),
    pr_service=Depends(get_personal_records_service)
):
    """Get all personal records for authenticated user"""
    try:
        prs = pr_service.get_user_personal_records(user_id)
        return PersonalRecordsResponse(
            records=list(prs.records.values()),
            count=prs.count,
            lastUpdated=prs.lastUpdated
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting personal records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting personal records: {str(e)}")


@router.post("/personal-records")
@router.post("/personal-records/")
async def mark_personal_record(
    request: MarkPersonalRecordRequest,
    user_id: str = Depends(require_auth),
    pr_service=Depends(get_personal_records_service)
):
    """Mark a personal record (creates or replaces existing for same exercise+type)"""
    try:
        if request.pr_type not in ('weight', 'distance', 'duration', 'pace'):
            raise HTTPException(status_code=400, detail="pr_type must be one of: weight, distance, duration, pace")

        result = pr_service.mark_personal_record(user_id, request.model_dump())
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error', 'Failed to mark PR'))

        return {
            "message": f"PR {'replaced' if result['replaced'] else 'marked'} successfully",
            "pr_id": result['pr_id'],
            "replaced": result['replaced']
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking personal record: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error marking personal record: {str(e)}")


@router.put("/personal-records/{pr_id}")
async def update_personal_record(
    pr_id: str,
    request: UpdatePersonalRecordRequest,
    user_id: str = Depends(require_auth),
    pr_service=Depends(get_personal_records_service)
):
    """Update a personal record's value"""
    try:
        success = pr_service.update_personal_record_value(
            user_id, pr_id, request.model_dump(exclude_none=True)
        )
        if not success:
            raise HTTPException(status_code=404, detail="Personal record not found")

        return {
            "message": "Personal record updated",
            "pr_id": pr_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating personal record: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating personal record: {str(e)}")


@router.delete("/personal-records/{pr_id}")
async def remove_personal_record(
    pr_id: str,
    user_id: str = Depends(require_auth),
    pr_service=Depends(get_personal_records_service)
):
    """Remove a personal record"""
    try:
        success = pr_service.remove_personal_record(user_id, pr_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to remove personal record")

        return {
            "message": "Personal record removed",
            "pr_id": pr_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing personal record: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removing personal record: {str(e)}")


@router.post("/personal-records/check")
async def check_personal_records(
    request: Dict[str, List[str]],
    user_id: str = Depends(require_auth),
    pr_service=Depends(get_personal_records_service)
):
    """Bulk check which exercises have personal records"""
    try:
        exercise_names = request.get('exerciseNames', [])
        if not exercise_names:
            raise HTTPException(status_code=400, detail="exerciseNames array is required")

        result = pr_service.bulk_check_personal_records(user_id, exercise_names)
        return {"personalRecords": result}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking personal records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking personal records: {str(e)}")
