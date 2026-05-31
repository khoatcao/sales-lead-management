# Sales Lead Management Tool

AI-powered backend for managing car-selling leads at automotive dealerships. Built for the Keyloop Technical Assessment.

## Tech Stack
- **Python 3.12** + **FastAPI** — async REST API
- **PostgreSQL** + **SQLAlchemy** + **Alembic** — database + migrations
- **Anthropic Claude API** — AI enrichment, scoring, and summarization
- **Poetry** — dependency management
- **Docker** — containerized local development

## Getting Started

### Prerequisites
- Python 3.12+
- Poetry
- PostgreSQL (or Docker)

### 1. Install dependencies
```bash
poetry install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and fill in ANTHROPIC_API_KEY and SECRET_KEY
```

### 3. Start PostgreSQL
```bash
# Using Docker (recommended)
docker-compose up db -d

# Or use a local PostgreSQL instance
```

### 4. Run migrations
```bash
poetry run alembic upgrade head
```

### 5. Start the server
```bash
poetry run uvicorn app.main:app --reload
```

API docs available at: http://localhost:8000/docs

---

## Running Tests
```bash
poetry run pytest
poetry run pytest --cov=app --cov-report=term-missing
```

## Linting & Type Checking
```bash
poetry run ruff check app/
poetry run mypy app/
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and get JWT token |
| GET | `/users/me` | Get current user |
| POST | `/leads` | Create a new lead |
| GET | `/leads` | List all leads (sorted by AI score) |
| GET | `/leads/{id}` | Get lead detail with AI summary |
| PATCH | `/leads/{id}` | Update lead status or assignment |
| POST | `/leads/{id}/notes` | Log a note (triggers AI enrichment) |
| GET | `/leads/{id}/notes` | Get all notes for a lead |
| GET | `/health` | Health check |

---

## AI Collaboration Narrative

This project was built using **Claude Code (claude-sonnet-4-6)** as the primary AI collaborator.

### Strategy
- Used Claude to design and validate the 6-table relational schema
- Identified the three natural GenAI touchpoints: Enricher (on note creation), Scorer (on lead listing), and Summarizer (on lead detail fetch)
- Validated architectural decisions — notably making AI failures non-fatal so core CRUD works independently

### Verification Process
- All AI-generated code was read and understood before accepting
- Schema design was challenged and refined (e.g. adding `source` and `updated_at` fields after discussion)
- AI integration uses Claude's `tool_use` feature to guarantee structured JSON output rather than freeform text
- Reviewed every relationship and cascade rule in the ORM models

### Key Decisions
- AI fields (`ai_score`, `ai_summary`, `priority`, `type`, `sentiment`, `next_action`) are written by the backend only — never accepted from the client
- AI errors are logged as warnings and never surface as HTTP 500s — the note is saved with `ai_enriched=False`
