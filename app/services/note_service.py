import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Lead, LeadNote

logger = structlog.get_logger()


class NoteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, lead_id: int, note_text: str, author_id: int) -> LeadNote:
        # Load car for AI context
        result = await self.db.execute(
            select(Lead).options(selectinload(Lead.car)).where(Lead.id == lead_id)
        )
        lead = result.scalar_one_or_none()
        if not lead:
            raise ValueError(f"Lead {lead_id} not found")

        note = LeadNote(
            lead_id=lead_id,
            author_id=author_id,
            note=note_text,
            ai_enriched=False,
        )

        # Enrich with AI — non-fatal if it fails
        try:
            from app.ai.enricher import enrich_note

            enrichment = await enrich_note(note_text, lead.car)
            note.type = enrichment.type
            note.sentiment = enrichment.sentiment
            note.next_action = enrichment.next_action
            note.ai_enriched = True
            logger.info("note_ai_enriched", lead_id=lead_id)
        except Exception as exc:
            logger.warning("note_ai_enrichment_failed", lead_id=lead_id, error=str(exc))

        self.db.add(note)
        await self.db.commit()

        # Re-score lead after new note — non-fatal
        await self._refresh_lead_score(lead)

        # Return note with author loaded
        note_result = await self.db.execute(
            select(LeadNote).options(selectinload(LeadNote.author)).where(LeadNote.id == note.id)
        )
        return note_result.scalar_one()

    async def _refresh_lead_score(self, lead: Lead) -> None:
        try:
            from app.ai.scorer import score_lead
            from app.services.lead_service import LeadService

            # Reload lead with notes for scoring
            result = await self.db.execute(
                select(Lead)
                .options(selectinload(Lead.notes), selectinload(Lead.car))
                .where(Lead.id == lead.id)
            )
            fresh_lead = result.scalar_one()
            score, priority = await score_lead(fresh_lead)
            await LeadService(self.db).update_ai_fields(lead.id, ai_score=score, priority=priority)
        except Exception as exc:
            logger.warning("lead_scoring_failed", lead_id=lead.id, error=str(exc))
