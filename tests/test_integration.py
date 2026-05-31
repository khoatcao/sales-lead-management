"""
Integration tests for all API endpoints.
Uses a real test database and real HTTP requests via httpx.AsyncClient.
AI calls (OpenAI) are mocked so no API key is needed.
"""

import os
from unittest.mock import AsyncMock, patch

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.database import Base
from app.dependencies import get_db
from app.main import app

# ---------------------------------------------------------------------------
# Test database setup
# ---------------------------------------------------------------------------


TEST_DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://cao.khoa@localhost:5432/sales_leads",
).replace("/sales_leads", "/sales_leads_test")

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(
    test_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables once before tests, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    """HTTP client for making requests to the app."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c


@pytest_asyncio.fixture
async def registered_user(client):
    """Register and return a test user."""
    response = await client.post(
        "/auth/register",
        json={
            "name": "Test User",
            "email": "testuser@example.com",
            "password": "password123",
            "role": "salesperson",
        },
    )
    return response.json()


@pytest_asyncio.fixture
async def auth_token(client, registered_user):
    """Return a valid JWT token for the test user."""
    response = await client.post(
        "/auth/login",
        json={
            "email": "testuser@example.com",
            "password": "password123",
        },
    )
    return response.json()["access_token"]


@pytest_asyncio.fixture
def auth_headers(auth_token):
    """Return Authorization headers."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest_asyncio.fixture
async def sample_lead(client, auth_headers):
    """Create and return a sample lead."""
    with patch("app.ai.scorer.score_lead", new_callable=AsyncMock) as mock_score:
        from app.models.models import PriorityEnum

        mock_score.return_value = (75, PriorityEnum.warm)
        response = await client.post(
            "/leads",
            json={
                "seller_name": "Jane Doe",
                "seller_email": "jane.doe@example.com",
                "seller_phone": "+44 7700 999001",
                "car": {
                    "make": "BMW",
                    "model": "3 Series",
                    "year": 2021,
                    "mileage": 28000,
                    "condition": "good",
                    "asking_price": 22000,
                    "urgency": "urgent",
                    "features": ["Leather Seats", "Sunroof"],
                    "photos": [],
                },
            },
            headers=auth_headers,
        )
    return response.json()


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------


class TestAuth:

    async def test_register_success(self, client):
        response = await client.post(
            "/auth/register",
            json={
                "name": "Alice Smith",
                "email": "alice.smith@example.com",
                "password": "password123",
                "role": "salesperson",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "alice.smith@example.com"
        assert data["name"] == "Alice Smith"
        assert data["role"] == "salesperson"
        assert "id" in data
        assert "password" not in data

    async def test_register_duplicate_email_returns_409(self, client):
        payload = {
            "name": "Duplicate User",
            "email": "duplicate@example.com",
            "password": "password123",
            "role": "salesperson",
        }
        await client.post("/auth/register", json=payload)
        response = await client.post("/auth/register", json=payload)
        assert response.status_code == 409

    async def test_login_success_returns_token(self, client, registered_user):
        response = await client.post(
            "/auth/login",
            json={
                "email": "testuser@example.com",
                "password": "password123",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password_returns_401(self, client, registered_user):
        response = await client.post(
            "/auth/login",
            json={
                "email": "testuser@example.com",
                "password": "wrongpassword",
            },
        )
        assert response.status_code == 401

    async def test_login_unknown_email_returns_401(self, client):
        response = await client.post(
            "/auth/login",
            json={
                "email": "nobody@example.com",
                "password": "password123",
            },
        )
        assert response.status_code == 401

    async def test_get_me_returns_current_user(self, client, auth_headers, registered_user):
        response = await client.get("/users/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["email"] == "testuser@example.com"

    async def test_get_me_without_token_returns_403(self, client):
        response = await client.get("/users/me")
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Lead tests
# ---------------------------------------------------------------------------


class TestLeads:

    async def test_create_lead_success(self, client, auth_headers):
        with patch("app.ai.scorer.score_lead", new_callable=AsyncMock) as mock_score:
            from app.models.models import PriorityEnum

            mock_score.return_value = (80, PriorityEnum.hot)
            response = await client.post(
                "/leads",
                json={
                    "seller_name": "John Smith",
                    "seller_email": "john.smith.new@example.com",
                    "seller_phone": "+44 7700 100001",
                    "car": {
                        "make": "Toyota",
                        "model": "Camry",
                        "year": 2020,
                        "mileage": 45000,
                        "condition": "good",
                        "asking_price": 16500,
                        "urgency": "flexible",
                        "features": ["Bluetooth"],
                        "photos": [],
                    },
                },
                headers=auth_headers,
            )

        assert response.status_code == 201
        data = response.json()
        assert data["seller_name"] == "John Smith"
        assert data["seller_email"] == "john.smith.new@example.com"
        assert data["car"]["make"] == "Toyota"
        assert "id" in data

    async def test_create_lead_without_token_returns_403(self, client):
        response = await client.post(
            "/leads",
            json={
                "seller_name": "Test",
                "seller_email": "test@example.com",
                "car": {
                    "make": "BMW",
                    "model": "X5",
                    "year": 2020,
                    "mileage": 10000,
                    "condition": "good",
                    "asking_price": 30000,
                    "urgency": "urgent",
                },
            },
        )
        assert response.status_code == 403

    async def test_create_lead_invalid_body_returns_422(self, client, auth_headers):
        response = await client.post("/leads", json={"bad": "data"}, headers=auth_headers)
        assert response.status_code == 422

    async def test_list_leads_returns_paginated_response(self, client, auth_headers, sample_lead):
        response = await client.get("/leads", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert "page" in data
        assert "per_page" in data
        assert isinstance(data["items"], list)

    async def test_list_leads_without_token_returns_403(self, client):
        response = await client.get("/leads")
        assert response.status_code == 403

    async def test_get_lead_by_id_success(self, client, auth_headers, sample_lead):
        lead_id = sample_lead["id"]
        with patch("app.routes.leads.summarize_lead", new_callable=AsyncMock) as mock_summarize:
            mock_summarize.return_value = "Test summary for this lead."
            response = await client.get(f"/leads/{lead_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == lead_id
        assert data["seller_name"] == "Jane Doe"
        assert "notes" in data
        assert "car" in data

    async def test_get_lead_not_found_returns_404(self, client, auth_headers):
        with patch("app.routes.leads.summarize_lead", new_callable=AsyncMock) as mock_summarize:
            mock_summarize.return_value = "No activity recorded yet."
            response = await client.get("/leads/99999", headers=auth_headers)
        assert response.status_code == 404

    async def test_update_lead_status(self, client, auth_headers, sample_lead):
        lead_id = sample_lead["id"]
        response = await client.patch(
            f"/leads/{lead_id}",
            json={"status": "contacted"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "contacted"

    async def test_update_lead_not_found_returns_404(self, client, auth_headers):
        response = await client.patch(
            "/leads/99999",
            json={"status": "contacted"},
            headers=auth_headers,
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Notes tests
# ---------------------------------------------------------------------------


class TestNotes:

    async def test_create_note_success(self, client, auth_headers, sample_lead):
        lead_id = sample_lead["id"]
        with (
            patch("app.ai.enricher.enrich_note", new_callable=AsyncMock) as mock_enrich,
            patch("app.ai.scorer.score_lead", new_callable=AsyncMock) as mock_score,
        ):
            from app.ai.enricher import EnrichmentResult
            from app.models.models import NoteTypeEnum, PriorityEnum, SentimentEnum

            mock_enrich.return_value = EnrichmentResult(
                type=NoteTypeEnum.phone_call,
                sentiment=SentimentEnum.positive,
                next_action="Send price quote",
            )
            mock_score.return_value = (85, PriorityEnum.hot)

            response = await client.post(
                f"/leads/{lead_id}/notes",
                json={"note": "Called customer, very interested in selling quickly"},
                headers=auth_headers,
            )

        assert response.status_code == 201
        data = response.json()
        assert data["note"] == "Called customer, very interested in selling quickly"
        assert data["ai_enriched"] is True
        assert data["type"] == "phone_call"
        assert data["sentiment"] == "positive"
        assert data["next_action"] == "Send price quote"

    async def test_create_note_persisted_to_db(self, client, auth_headers, sample_lead):
        """Note must be saved — verify by fetching notes list."""
        lead_id = sample_lead["id"]
        note_text = "Sent follow-up email with updated valuation"

        with (
            patch("app.ai.enricher.enrich_note", new_callable=AsyncMock) as mock_enrich,
            patch("app.ai.scorer.score_lead", new_callable=AsyncMock) as mock_score,
        ):
            from app.ai.enricher import EnrichmentResult
            from app.models.models import NoteTypeEnum, PriorityEnum, SentimentEnum

            mock_enrich.return_value = EnrichmentResult(
                type=NoteTypeEnum.email,
                sentiment=SentimentEnum.neutral,
                next_action="Wait for response",
            )
            mock_score.return_value = (60, PriorityEnum.warm)
            await client.post(
                f"/leads/{lead_id}/notes",
                json={"note": note_text},
                headers=auth_headers,
            )

        response = await client.get(f"/leads/{lead_id}/notes", headers=auth_headers)
        assert response.status_code == 200
        notes = response.json()
        assert any(n["note"] == note_text for n in notes)

    async def test_create_note_lead_not_found_returns_404(self, client, auth_headers):
        response = await client.post(
            "/leads/99999/notes",
            json={"note": "This lead does not exist"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    async def test_create_note_without_token_returns_403(self, client, sample_lead):
        lead_id = sample_lead["id"]
        response = await client.post(
            f"/leads/{lead_id}/notes",
            json={"note": "Unauthorized note"},
        )
        assert response.status_code == 403

    async def test_list_notes_returns_chronological_order(self, client, auth_headers, sample_lead):
        lead_id = sample_lead["id"]
        response = await client.get(f"/leads/{lead_id}/notes", headers=auth_headers)
        assert response.status_code == 200
        notes = response.json()
        if len(notes) > 1:
            dates = [n["created_at"] for n in notes]
            assert dates == sorted(dates)
