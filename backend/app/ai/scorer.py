import json

import structlog
from openai import AsyncOpenAI

from app.config import settings
from app.models.models import Lead, PriorityEnum

logger = structlog.get_logger()
client = AsyncOpenAI(
    api_key=settings.openai_api_key,
    base_url=settings.openai_base_url,
)


async def score_lead(lead: Lead) -> tuple[int, PriorityEnum]:
    """
    Score a lead 0-100 based on car details and activity history.
    Scores on car details alone if no notes yet.
    """
    if lead.notes:
        notes_text = (
            "Activity notes:\n"
            + "\n".join(f"- [{n.sentiment or 'unknown sentiment'}] {n.note}" for n in lead.notes)
            + "\n\n"
        )
    else:
        notes_text = "No activity notes yet — score based on car details only.\n\n"

    car_context = ""
    if lead.car:
        car_context = (
            f"Car: {lead.car.year} {lead.car.make} {lead.car.model}, "
            f"asking ${lead.car.asking_price}, "
            f"condition: {lead.car.condition}, "
            f"urgency: {lead.car.urgency}\n\n"
        )

    # Build multimodal content — text first, then photo images if available
    text_content = f"{car_context}{notes_text}Score this lead based on conversion likelihood. If car photos are provided, assess the actual visual condition and factor it into your score."

    content: list = [{"type": "text", "text": text_content}]

    if lead.car and lead.car.photos:
        for photo in lead.car.photos:
            content.append({
                "type": "image_url",
                "image_url": {"url": photo.url, "detail": "low"},
            })

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "score_lead",
                    "description": "Score a sales lead based on its activity history",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "score": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 100,
                                "description": "Lead score 0-100 (100 = highest conversion likelihood)",
                            },
                            "priority": {
                                "type": "string",
                                "enum": ["hot", "warm", "cold"],
                                "description": "Priority tier based on score",
                            },
                        },
                        "required": ["score", "priority"],
                    },
                },
            }
        ],
        tool_choice={"type": "function", "function": {"name": "score_lead"}},
        messages=[{"role": "user", "content": content}],
    )

    tool_calls = response.choices[0].message.tool_calls
    assert tool_calls is not None, "OpenAI returned no tool calls"
    tool_input = json.loads(tool_calls[0].function.arguments)  # type: ignore[union-attr]
    usage = response.usage
    logger.info(
        "ai_scoring_complete",
        lead_id=lead.id,
        score=tool_input["score"],
        priority=tool_input["priority"],
        input_tokens=usage.prompt_tokens if usage else None,
    )
    return tool_input["score"], PriorityEnum(tool_input["priority"])
