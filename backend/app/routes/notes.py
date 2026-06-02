from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.models import User
from app.schemas.schemas import LeadNoteCreate, LeadNoteResponse
from app.services.lead_service import LeadService
from app.services.note_service import NoteService

router = APIRouter(prefix="/leads/{lead_id}/notes", tags=["notes"])


@router.post("", response_model=LeadNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    lead_id: int,
    data: LeadNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await LeadService(db).get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return await NoteService(db).create(lead_id, data.note, current_user.id)


@router.get("", response_model=list[LeadNoteResponse])
async def list_notes(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await LeadService(db).get_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead.notes
