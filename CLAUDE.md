# CLAUDE.md — Sales Lead Management Tool

## Project Overview
A Python/FastAPI backend for a Sales Lead Management Tool built for the Keyloop Technical Assessment. Salespeople manage incoming car-selling leads from the dealership website. GenAI (Claude API) enriches notes, scores leads, and summarizes activity history.

## Tech Stack
- **Language**: Python 3.12
- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy + Alembic (migrations)
- **AI**: Anthropic Python SDK (`claude-sonnet-4-6`)
- **Validation**: Pydantic v2 (built into FastAPI)
- **Testing**: Pytest + httpx
- **Auth**: python-jose (JWT) + passlib (bcrypt)
- **Logging**: structlog
- **Container**: Docker + docker-compose

## Project Structure

```
sales-lead-management/
├── app/
│   ├── routes/               # FastAPI routers (thin — no business logic)
│   │   ├── leads.py
│   │   ├── notes.py
│   │   └── users.py
│   ├── services/             # Business logic
│   │   ├── lead_service.py
│   │   ├── note_service.py
│   │   └── user_service.py
│   ├── ai/                   # AI service layer
│   │   ├── enricher.py       # Enriches notes: type / sentiment / next_action
│   │   ├── scorer.py         # Scores lead 0-100, sets priority
│   │   └── summarizer.py     # Generates 2-line lead summary
│   ├── models/               # SQLAlchemy ORM models
│   │   └── models.py
│   ├── schemas/              # Pydantic request/response schemas
│   │   └── schemas.py
│   ├── middleware/           # Request logging, error handling
│   ├── database.py           # Async DB session setup
│   └── main.py               # FastAPI app entry point
├── alembic/                  # DB migration files
│   └── versions/
├── tests/                    # Pytest tests
├── .github/
│   └── workflows/
│       └── ci.yml            # GitHub Actions: lint → test → build
├── .env.example
├── .gitignore
├── CLAUDE.md
├── SYSTEM_DESIGN.md
├── README.md
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## Common Commands

```bash
# Install dependencies
poetry install

# Run database migrations
poetry run alembic upgrade head

# Seed database with sample data
poetry run python -m app.seed

# Start development server (hot reload)
poetry run uvicorn app.main:app --reload

# Run all tests
poetry run pytest

# Run tests with coverage
poetry run pytest --cov=app --cov-report=term-missing

# Type check
poetry run mypy app/

# Lint
poetry run ruff check app/

# Interactive API docs (after server starts)
# http://localhost:8000/docs

# Add a new dependency
poetry add <package>

# Add a dev dependency
poetry add --group dev <package>
```

## Docker

```bash
# Start app + PostgreSQL together
docker-compose up

# Run migrations inside container
docker-compose exec app alembic upgrade head

# Rebuild after dependency changes
docker-compose up --build
```

## Environment Variables

```bash
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/sales_leads
ANTHROPIC_API_KEY=your_key_here
PORT=8000
SECRET_KEY=your_jwt_secret
ENVIRONMENT=development
```

Copy `.env.example` to `.env` and fill in values before running.

## Key Architectural Decisions

### AI is non-fatal
If the Claude API call fails, the note is still saved with `ai_enriched=False`. Core CRUD works independently of the AI layer. Never raise HTTP 500 from AI failures — log as warning and continue.

### AI fields are backend-only
`ai_score`, `ai_summary`, `priority` on `leads` and `type`, `sentiment`, `next_action` on `lead_notes` are never accepted from the client. Computed by the AI layer and written internally only.

### Async throughout
All route handlers and service methods use `async def`. Uses `asyncpg` driver for non-blocking PostgreSQL connections.

### Validation at the boundary
All request bodies validated by Pydantic schemas in `app/schemas/`. Never access raw request data beyond the router.

## Database
Six tables: `users`, `leads`, `cars`, `car_features`, `car_photos`, `lead_notes`.
See `app/models/models.py` for SQLAlchemy models.
Run `alembic upgrade head` after schema changes.
Generate a new migration: `alembic revision --autogenerate -m "description"`

## Testing Strategy
- **Unit tests**: AI service functions with mocked Anthropic client
- **Integration tests**: API endpoints using `httpx.AsyncClient` with a real test PostgreSQL database
- CI blocks on test failure — all tests must pass before merge
