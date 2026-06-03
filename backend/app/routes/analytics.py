from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_manager_or_admin
from app.models.models import Lead, LeadStatusEnum, PriorityEnum, RoleEnum, User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager_or_admin),
):
    # Total leads
    total = await db.scalar(select(func.count()).select_from(Lead)) or 0

    # Leads by status
    status_rows = await db.execute(
        select(Lead.status, func.count().label("count")).group_by(Lead.status)
    )
    by_status = {row.status.value: row.count for row in status_rows}

    # Leads by priority
    priority_rows = await db.execute(
        select(Lead.priority, func.count().label("count")).group_by(Lead.priority)
    )
    by_priority = {row.priority.value: row.count for row in priority_rows}

    # Average AI score
    avg_score = await db.scalar(select(func.avg(Lead.ai_score))) or 0

    # Hot leads count
    hot_count = (
        await db.scalar(
            select(func.count()).select_from(Lead).where(Lead.priority == PriorityEnum.hot)
        )
        or 0
    )

    # Conversion rate
    closed_count = by_status.get("closed", 0)
    conversion_rate = round((closed_count / total * 100), 1) if total > 0 else 0

    # Salesperson leaderboard
    sp_rows = await db.execute(
        select(
            User.name,
            func.count(Lead.id).label("total"),
            func.sum(case((Lead.status == LeadStatusEnum.closed, 1), else_=0)).label("closed"),
        )
        .join(Lead, Lead.assigned_to == User.id, isouter=True)
        .where(User.role == RoleEnum.salesperson)
        .group_by(User.id, User.name)
        .order_by(func.count(Lead.id).desc())
    )

    leaderboard = []
    for row in sp_rows:
        total_sp = row.total or 0
        closed_sp = int(row.closed or 0)
        leaderboard.append(
            {
                "name": row.name,
                "total": total_sp,
                "closed": closed_sp,
                "conversion_rate": round((closed_sp / total_sp * 100), 1) if total_sp > 0 else 0,
            }
        )

    return {
        "total_leads": total,
        "hot_leads": hot_count,
        "avg_score": round(float(avg_score), 1),
        "conversion_rate": conversion_rate,
        "by_status": by_status,
        "by_priority": by_priority,
        "leaderboard": leaderboard,
    }
