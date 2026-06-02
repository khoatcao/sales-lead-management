import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.summarizer import summarize_lead
from app.dependencies import get_current_user, get_db
from app.models.models import User
from app.schemas.schemas import (
    LeadCreate,
    LeadDetailResponse,
    LeadListItem,
    LeadUpdate,
    PaginatedResponse,
)
from app.services.lead_service import LeadService

logger = structlog.get_logger()
router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("", response_model=LeadDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await LeadService(db).create(data)


@router.get("", response_model=PaginatedResponse[LeadListItem])
async def list_leads(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leads, total = await LeadService(db).list(page, per_page, current_user)
    return PaginatedResponse(total=total, page=page, per_page=per_page, items=leads)


@router.get("/{lead_id}", response_model=LeadDetailResponse)
async def get_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.models import RoleEnum

    lead = await LeadService(db).get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    if (
        current_user.role == RoleEnum.salesperson
        and lead.assigned_to != current_user.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    try:
        lead.ai_summary = await summarize_lead(lead)
    except Exception as exc:
        logger.warning("ai_summarization_failed", lead_id=lead_id, error=str(exc))

    return lead


@router.patch("/{lead_id}", response_model=LeadDetailResponse)
async def update_lead(
    lead_id: int,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await LeadService(db).update(lead_id, data)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead
