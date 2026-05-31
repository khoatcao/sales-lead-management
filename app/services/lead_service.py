import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Car, CarFeature, CarPhoto, Lead, LeadNote
from app.schemas.schemas import LeadCreate, LeadUpdate

logger = structlog.get_logger()


class LeadService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: LeadCreate) -> Lead:
        lead = Lead(
            seller_name=data.seller_name,
            seller_email=data.seller_email,
            seller_phone=data.seller_phone,
        )
        self.db.add(lead)
        await self.db.flush()  # get lead.id without committing

        car = Car(
            lead_id=lead.id,
            make=data.car.make,
            model=data.car.model,
            year=data.car.year,
            mileage=data.car.mileage,
            condition=data.car.condition,
            asking_price=data.car.asking_price,
            urgency=data.car.urgency,
            notes=data.car.notes,
        )
        self.db.add(car)
        await self.db.flush()

        for feature in data.car.features:
            self.db.add(CarFeature(car_id=car.id, feature=feature))

        for i, photo in enumerate(data.car.photos):
            self.db.add(
                CarPhoto(
                    car_id=car.id,
                    url=photo.url,
                    label=photo.label,
                    sort_order=i,
                )
            )

        await self.db.commit()

        # Score new lead based on car details — non-fatal
        created = await self.get_by_id(lead.id)
        try:
            from app.ai.scorer import score_lead

            score, priority = await score_lead(created)
            await self.update_ai_fields(lead.id, ai_score=score, priority=priority)
            created = await self.get_by_id(lead.id)
        except Exception as exc:
            logger.warning("lead_initial_scoring_failed", lead_id=lead.id, error=str(exc))

        return created

    async def list(self, page: int = 1, per_page: int = 20) -> tuple[list[Lead], int]:
        offset = (page - 1) * per_page

        total = await self.db.scalar(select(func.count()).select_from(Lead))

        result = await self.db.execute(
            select(Lead)
            .options(
                selectinload(Lead.car).selectinload(Car.features),
                selectinload(Lead.car).selectinload(Car.photos),
            )
            .order_by(Lead.ai_score.desc().nullslast(), Lead.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        leads = list(result.scalars().all())
        return leads, total or 0

    async def get_by_id(self, lead_id: int) -> Lead | None:
        result = await self.db.execute(
            select(Lead)
            .options(
                selectinload(Lead.car).selectinload(Car.features),
                selectinload(Lead.car).selectinload(Car.photos),
                selectinload(Lead.notes).selectinload(LeadNote.author),
                selectinload(Lead.salesperson),
            )
            .where(Lead.id == lead_id)
        )
        return result.scalar_one_or_none()

    async def update(self, lead_id: int, data: LeadUpdate) -> Lead | None:
        lead = await self.get_by_id(lead_id)
        if not lead:
            return None

        for field, value in data.model_dump(exclude_none=True).items():
            setattr(lead, field, value)

        await self.db.commit()
        return await self.get_by_id(lead_id)

    async def update_ai_fields(
        self,
        lead_id: int,
        ai_score: int | None = None,
        ai_summary: str | None = None,
        priority=None,
    ) -> None:
        result = await self.db.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if not lead:
            return

        if ai_score is not None:
            lead.ai_score = ai_score
        if ai_summary is not None:
            lead.ai_summary = ai_summary
        if priority is not None:
            lead.priority = priority

        await self.db.commit()
        logger.info("lead_ai_fields_updated", lead_id=lead_id, ai_score=ai_score)
