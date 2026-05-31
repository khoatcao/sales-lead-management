import json

import structlog
from openai import AsyncOpenAI
from opentelemetry import trace
from pydantic import BaseModel

from app.config import settings
from app.models.models import Car, NoteTypeEnum, SentimentEnum

logger = structlog.get_logger()
client = AsyncOpenAI(
    api_key=settings.openai_api_key,
    base_url=settings.openai_base_url,
)
tracer = trace.get_tracer("sales-lead-management")


class EnrichmentResult(BaseModel):
    type: NoteTypeEnum
    sentiment: SentimentEnum
    next_action: str


async def enrich_note(note_text: str, car: Car | None) -> EnrichmentResult:
    with tracer.start_as_current_span("ai.enrich_note") as span:
        span.set_attribute("ai.model", "gpt-4o-mini")
        span.set_attribute("ai.operation", "enrich_note")
        return await _enrich_note(note_text, car, span)


async def _enrich_note(note_text: str, car: Car | None, span) -> EnrichmentResult:
    """
    Classify a salesperson's note and recommend a next action.
    Uses OpenAI function calling to guarantee structured JSON output.
    """
    car_context = ""
    if car:
        car_context = (
            f"\nCar context: {car.year} {car.make} {car.model}, "
            f"asking ${car.asking_price}, condition: {car.condition}, "
            f"urgency: {car.urgency}"
        )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "enrich_note",
                    "description": "Classify a sales activity note and suggest next action",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "type": {
                                "type": "string",
                                "enum": ["phone_call", "email", "meeting", "other"],
                                "description": "The type of interaction described in the note",
                            },
                            "sentiment": {
                                "type": "string",
                                "enum": ["positive", "neutral", "negative"],
                                "description": "Seller's sentiment based on the note content",
                            },
                            "next_action": {
                                "type": "string",
                                "description": "Recommended next action for the salesperson (1 sentence)",
                            },
                        },
                        "required": ["type", "sentiment", "next_action"],
                    },
                },
            }
        ],
        tool_choice={"type": "function", "function": {"name": "enrich_note"}},
        messages=[
            {
                "role": "user",
                "content": (
                    f'Salesperson note: "{note_text}"{car_context}\n\n'
                    "Classify this note and recommend the next action."
                ),
            }
        ],
    )

    tool_calls = response.choices[0].message.tool_calls
    assert tool_calls is not None, "OpenAI returned no tool calls"
    tool_input = json.loads(tool_calls[0].function.arguments)  # type: ignore[union-attr]
    span.set_attribute("ai.result.type", tool_input["type"])
    span.set_attribute("ai.result.sentiment", tool_input["sentiment"])
    usage = response.usage
    if usage:
        span.set_attribute("ai.input_tokens", usage.prompt_tokens)
        span.set_attribute("ai.output_tokens", usage.completion_tokens)
        logger.info(
            "ai_enrichment_complete",
            input_tokens=usage.prompt_tokens,
            output_tokens=usage.completion_tokens,
            type=tool_input["type"],
            sentiment=tool_input["sentiment"],
        )
    return EnrichmentResult(**tool_input)
