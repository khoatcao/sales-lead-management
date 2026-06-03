# Sales Lead Management Tool

AI-powered sales lead management for automotive dealerships. Salespeople manage incoming car-selling leads, with GenAI enriching notes, scoring leads, and summarising activity history.

Built for the Keyloop Technical Assessment.

**Live Demo:**
- Frontend: https://sales-lead-management-ochre.vercel.app
- Backend API Docs: https://sales-lead-management-do39.onrender.com/docs
- Observability (Grafana Cloud): https://jollyalligator3045.grafana.net

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL (Supabase in production) |
| AI | OpenAI GPT-4o-mini (text + vision) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Observability | OpenTelemetry → Grafana Cloud (Loki + Tempo + Prometheus) |
| CI/CD | GitHub Actions → Render (backend) + Vercel (frontend) |

---

## Project Structure

```
sales-lead-management/
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── routes/   # HTTP handlers (thin)
│   │   ├── services/ # Business logic
│   │   ├── ai/       # Enricher, Scorer, Summarizer
│   │   ├── models/   # SQLAlchemy ORM models
│   │   └── schemas/  # Pydantic request/response schemas
│   ├── tests/
│   ├── alembic/
│   └── docker-compose.yml
├── fe/               # React frontend
│   └── src/
└── .github/workflows/ci.yml
```

---

## Quickstart (Docker)

```bash
# Clone the repo
git clone https://github.com/khoatcao/sales-lead-management.git
cd sales-lead-management/backend

# Copy and configure environment
cp .env.example .env
# Edit .env — fill in OPENAI_API_KEY and SECRET_KEY

# Start everything (app + postgres + full observability stack)
docker-compose up

# In a separate terminal — run migrations and seed data
docker-compose exec app alembic upgrade head
docker-compose exec app python -m app.seed
```

App runs at: http://localhost:8001
API docs at: http://localhost:8001/docs
Grafana at: http://localhost:3000

---

## Manual Setup (without Docker)

### Backend

```bash
cd backend

# Install dependencies
poetry install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, OPENAI_API_KEY, SECRET_KEY

# Run migrations
poetry run alembic upgrade head

# Seed sample data
poetry run python -m app.seed

# Start the server
poetry run uvicorn app.main:app --reload
```

### Frontend

```bash
cd fe

# Install dependencies
npm install

# Start dev server (proxies /api to backend at localhost:8001)
npm run dev
```

Frontend runs at: http://localhost:5173

---

## Demo Credentials

After running the seed script:

| Role | Email | Password |
|---|---|---|
| Manager | alice@dealer.com | password123 |
| Salesperson | bob@dealer.com | password123 |
| Salesperson | carol@dealer.com | password123 |

**RBAC behaviour:**
- **Manager/Admin**: sees all leads, can assign leads to salespeople, full access
- **Salesperson**: sees only leads assigned to them

---

## Running Tests

```bash
cd backend

# Run all unit tests
poetry run pytest tests/test_ai_unit.py -v

# Run with coverage
poetry run pytest tests/test_ai_unit.py --cov=app --cov-report=term-missing
```

Tests cover the three AI service functions (Enricher, Scorer, Summarizer) with a mocked OpenAI client — validating output shape, valid enum values, and directional correctness (positive notes → high score, negative notes → low score).

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and get JWT token |
| GET | `/users/me` | Get current user profile |
| GET | `/users` | List all users (manager/admin only) |
| POST | `/leads` | Create a new lead |
| GET | `/leads` | List leads sorted by AI score |
| GET | `/leads/{id}` | Get lead detail with AI summary |
| PATCH | `/leads/{id}` | Update lead status or assignment |
| POST | `/leads/{id}/notes` | Log a note (triggers AI enrichment) |
| GET | `/leads/{id}/notes` | Get all notes for a lead |
| GET | `/health` | Health check |

---

## AI Collaboration Narrative

### Strategy for Directing the AI

This project uses three focused AI functions, each triggered at a natural point in the lead management workflow:

| Function | Trigger | What it does |
|---|---|---|
| **Enricher** | `POST /leads/{id}/notes` | Classifies note type, sentiment, and next action |
| **Scorer** | `GET /leads` | Scores lead 0–100 and sets priority (hot/warm/cold) |
| **Summarizer** | `GET /leads/{id}` | Generates a 2-line summary of lead status and next step |

Each prompt was designed with a specific, constrained output format:
- **Scorer** uses OpenAI tool calling to guarantee structured JSON output (`score`, `priority`) — no parsing of freeform text
- **Enricher** uses tool calling to return exactly `type`, `sentiment`, `next_action`
- **Summarizer** uses a direct completion with a strict 1-2 sentence instruction

Car photos are included as multimodal `image_url` content in scorer and summariser prompts, allowing GPT-4o-mini to factor in visual car condition.

### Verifying and Refining AI Output

AI output was verified at three levels:

**1. Unit tests (shape + behavioural correctness)**
`tests/test_ai_unit.py` (14 tests) uses a mocked OpenAI client to verify:
- Outputs conform to expected types (score is int 0-100, priority is valid enum)
- Directional correctness: positive notes produce high scores, negative notes produce low scores
- Edge cases: summarizer returns a placeholder without calling the API when no notes exist

**2. Manual testing with realistic data**
The seed script populates 5 realistic leads with varied conditions (urgent BMW in excellent condition, high-mileage Ford with no response) to verify the AI ranks them as expected — hot leads appear first, cold leads last.

**3. Production monitoring**
Every AI call logs `input_tokens`, `output_tokens`, and the AI result fields (`score`, `priority`, `sentiment`) via `structlog`. These are shipped to Grafana Cloud (Loki + Tempo) so anomalous AI behaviour is visible in real time.

### Ensuring Final Code Quality

- All AI-generated code was read and understood before accepting — no blind copy-paste
- AI fields (`ai_score`, `ai_summary`, `priority`, `type`, `sentiment`, `next_action`) are written by the backend only — never accepted from the client — preventing prompt injection via user input
- AI failures are caught, logged as warnings, and never surface as HTTP 500s — the note is saved with `ai_enriched=False` so core CRUD works independently of the AI layer
- CI pipeline (GitHub Actions) enforces Black formatting, isort, Flake8 linting, and all tests must pass before merge

---

## System Design

See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for full architecture, data flow, schema, and observability design.
