"""
Unit tests for AI functions: enricher, scorer, summarizer.
OpenAI client is mocked — no real API calls are made.
"""

from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

import app.ai.enricher as enricher_module
import app.ai.scorer as scorer_module
import app.ai.summarizer as summarizer_module
from app.ai.enricher import EnrichmentResult, enrich_note
from app.ai.scorer import score_lead
from app.ai.summarizer import summarize_lead
from app.models.models import (
    ConditionEnum,
    NoteTypeEnum,
    PriorityEnum,
    SentimentEnum,
    UrgencyEnum,
)

# ---------------------------------------------------------------------------
# Helpers — build fake ORM objects without a database
# ---------------------------------------------------------------------------


def make_car(**kwargs):
    defaults = dict(
        id=1,
        lead_id=1,
        make="BMW",
        model="3 Series",
        year=2020,
        mileage=35000,
        condition=ConditionEnum.good,
        asking_price=Decimal("18500.00"),
        urgency=UrgencyEnum.urgent,
        notes=None,
        features=[],
        photos=[],
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def make_note(**kwargs):
    defaults = dict(
        id=1,
        lead_id=1,
        author_id=1,
        note="Called customer, very interested",
        type=NoteTypeEnum.phone_call,
        sentiment=SentimentEnum.positive,
        next_action="Send price quote",
        ai_enriched=True,
        created_at=datetime(2026, 5, 31, 9, 0, 0),
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def make_lead(**kwargs):
    defaults = dict(
        id=1,
        seller_name="John Smith",
        seller_email="john@example.com",
        seller_phone="+44 7700 900123",
        car=make_car(),
        notes=[],
        ai_score=None,
        ai_summary=None,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


# ---------------------------------------------------------------------------
# Fake OpenAI response builders
# ---------------------------------------------------------------------------


def make_tool_response(arguments: dict) -> SimpleNamespace:
    """Fake chat.completions.create() response for function calling."""
    import json

    tool_call = SimpleNamespace(function=SimpleNamespace(arguments=json.dumps(arguments)))
    message = SimpleNamespace(tool_calls=[tool_call], content=None)
    choice = SimpleNamespace(message=message)
    usage = SimpleNamespace(prompt_tokens=50, completion_tokens=20)
    return SimpleNamespace(choices=[choice], usage=usage)


def make_text_response(text: str) -> SimpleNamespace:
    """Fake chat.completions.create() response for plain text."""
    message = SimpleNamespace(content=text)
    choice = SimpleNamespace(message=message)
    usage = SimpleNamespace(prompt_tokens=60, completion_tokens=40)
    return SimpleNamespace(choices=[choice], usage=usage)


# ---------------------------------------------------------------------------
# Enricher tests
# ---------------------------------------------------------------------------


class TestEnricher:

    @pytest.mark.asyncio
    async def test_phone_call_classified_correctly(self):
        """Note about a call is classified as phone_call with correct fields."""
        fake = make_tool_response(
            {
                "type": "phone_call",
                "sentiment": "positive",
                "next_action": "Send price quote to customer",
            }
        )
        with patch.object(
            enricher_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            result = await enrich_note("Called customer, very interested", make_car())

        assert result.type == NoteTypeEnum.phone_call
        assert result.sentiment == SentimentEnum.positive
        assert result.next_action == "Send price quote to customer"

    @pytest.mark.asyncio
    async def test_email_classified_correctly(self):
        """Note about an email is classified as email type."""
        fake = make_tool_response(
            {
                "type": "email",
                "sentiment": "neutral",
                "next_action": "Follow up with a phone call",
            }
        )
        with patch.object(
            enricher_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            result = await enrich_note("Sent email with our offer details", make_car())

        assert result.type == NoteTypeEnum.email
        assert result.sentiment == SentimentEnum.neutral

    @pytest.mark.asyncio
    async def test_negative_sentiment_classified_correctly(self):
        """Note with negative outcome is classified as negative sentiment."""
        fake = make_tool_response(
            {
                "type": "phone_call",
                "sentiment": "negative",
                "next_action": "Give customer time and follow up next week",
            }
        )
        with patch.object(
            enricher_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            result = await enrich_note("Customer said they are not interested anymore", make_car())

        assert result.sentiment == SentimentEnum.negative

    @pytest.mark.asyncio
    async def test_works_without_car_context(self):
        """Enricher works when no car context is provided."""
        fake = make_tool_response(
            {
                "type": "meeting",
                "sentiment": "positive",
                "next_action": "Prepare purchase agreement",
            }
        )
        with patch.object(
            enricher_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            result = await enrich_note("Met customer in person, deal agreed", car=None)

        assert result.type == NoteTypeEnum.meeting

    @pytest.mark.asyncio
    async def test_returns_enrichment_result_instance(self):
        """Return value is always an EnrichmentResult instance."""
        fake = make_tool_response(
            {
                "type": "other",
                "sentiment": "neutral",
                "next_action": "Check back later",
            }
        )
        with patch.object(
            enricher_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            result = await enrich_note("Left a voicemail", make_car())

        assert isinstance(result, EnrichmentResult)


# ---------------------------------------------------------------------------
# Scorer tests
# ---------------------------------------------------------------------------


class TestScorer:

    @pytest.mark.asyncio
    async def test_no_notes_scores_from_car_details(self):
        """Lead with no notes is still scored (based on car details)."""
        fake = make_tool_response({"score": 65, "priority": "warm"})
        with patch.object(
            scorer_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            score, priority = await score_lead(make_lead(notes=[]))

        assert score == 65
        assert priority == PriorityEnum.warm

    @pytest.mark.asyncio
    async def test_positive_notes_score_high(self):
        """Lead with positive activity notes scores higher."""
        fake = make_tool_response({"score": 88, "priority": "hot"})
        with patch.object(
            scorer_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            lead = make_lead(
                notes=[
                    make_note(
                        note="Customer is eager to sell quickly", sentiment=SentimentEnum.positive
                    ),
                    make_note(
                        note="Price agreed, ready to proceed", sentiment=SentimentEnum.positive
                    ),
                ]
            )
            score, priority = await score_lead(lead)

        assert score == 88
        assert priority == PriorityEnum.hot

    @pytest.mark.asyncio
    async def test_negative_notes_score_low(self):
        """Lead with negative notes receives a low score."""
        fake = make_tool_response({"score": 20, "priority": "cold"})
        with patch.object(
            scorer_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            lead = make_lead(
                notes=[
                    make_note(
                        note="Customer not responding to calls", sentiment=SentimentEnum.negative
                    ),
                ]
            )
            score, priority = await score_lead(lead)

        assert score == 20
        assert priority == PriorityEnum.cold

    @pytest.mark.asyncio
    async def test_score_in_valid_range(self):
        """Score is always between 0 and 100."""
        fake = make_tool_response({"score": 75, "priority": "warm"})
        with patch.object(
            scorer_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            score, _ = await score_lead(make_lead())

        assert 0 <= score <= 100

    @pytest.mark.asyncio
    async def test_priority_is_valid_enum(self):
        """Returned priority is always a valid PriorityEnum value."""
        fake = make_tool_response({"score": 50, "priority": "warm"})
        with patch.object(
            scorer_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            _, priority = await score_lead(make_lead())

        assert priority in list(PriorityEnum)


# ---------------------------------------------------------------------------
# Summarizer tests
# ---------------------------------------------------------------------------


class TestSummarizer:

    @pytest.mark.asyncio
    async def test_no_notes_returns_placeholder_without_api_call(self):
        """Lead with no notes returns placeholder and does NOT call OpenAI."""
        with patch.object(
            summarizer_module.client.chat.completions, "create", AsyncMock()
        ) as mock_create:
            result = await summarize_lead(make_lead(notes=[]))

        assert result == "No activity recorded yet."
        mock_create.assert_not_called()

    @pytest.mark.asyncio
    async def test_with_notes_returns_ai_summary(self):
        """Lead with notes calls OpenAI and returns the summary string."""
        expected = "Customer is interested in the BMW. Next step: send a formal offer."
        fake = make_text_response(expected)
        with patch.object(
            summarizer_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            result = await summarize_lead(make_lead(notes=[make_note()]))

        assert result == expected

    @pytest.mark.asyncio
    async def test_returns_non_empty_string(self):
        """Summarizer always returns a non-empty string."""
        fake = make_text_response("Some summary text.")
        with patch.object(
            summarizer_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ):
            result = await summarize_lead(make_lead(notes=[make_note()]))

        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_prompt_includes_car_details(self):
        """Car make and price are included in the prompt sent to OpenAI."""
        fake = make_text_response("Summary with car details.")
        with patch.object(
            summarizer_module.client.chat.completions, "create", AsyncMock(return_value=fake)
        ) as mock_create:
            await summarize_lead(make_lead(notes=[make_note()]))

        prompt = mock_create.call_args.kwargs["messages"][0]["content"]
        assert "BMW" in prompt
        assert "18500" in prompt
