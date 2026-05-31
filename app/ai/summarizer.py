import structlog
from openai import AsyncOpenAI

from app.config import settings
from app.models.models import Lead

logger = structlog.get_logger()
client = AsyncOpenAI(
    api_key=settings.openai_api_key,
    base_url=settings.openai_base_url,
)


async def summarize_lead(lead: Lead) -> str:
    """
    Generate a 1-2 sentence summary of a lead's current status
    and recommended next action based on its activity log.
    """
    if not lead.notes:
        return "No activity recorded yet."

    notes_text = "\n".join(f"[{n.created_at.strftime('%Y-%m-%d')}] {n.note}" for n in lead.notes)

    car_context = ""
    if lead.car:
        car_context = (
            f"Car: {lead.car.year} {lead.car.make} {lead.car.model}, "
            f"asking ${lead.car.asking_price}\n"
        )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=150,
        messages=[
            {
                "role": "user",
                "content": (
                    "Summarize this sales lead in 1-2 sentences. "
                    "Include current status and recommended next action.\n\n"
                    f"{car_context}"
                    f"Activity log:\n{notes_text}"
                ),
            }
        ],
    )

    summary = response.choices[0].message.content
    usage = response.usage
    logger.info(
        "ai_summarization_complete",
        lead_id=lead.id,
        input_tokens=usage.prompt_tokens,
    )
    return summary
