# System Design Document
## Sales Lead Management Tool — Keyloop Technical Assessment

---

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│          cURL / Postman / OpenAPI Spec (mocked frontend)        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────▼───────────────────────────────────────┐
│                      FASTAPI APPLICATION                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ /leads      │  │ /leads/{id}  │  │ /leads/{id}/notes    │   │
│  │ router      │  │ router       │  │ router               │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                │                      │               │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌──────────▼───────────┐   │
│  │LeadService  │  │LeadService   │  │   NoteService        │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘   │
└─────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                      │
┌─────────▼────────────────▼─────────────────────▼───────────────┐
│                      AI SERVICE LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │   Scorer     │  │  Summarizer  │  │     Enricher       │    │
│  │ (on GET list)│  │(on GET detail│  │  (on POST note)    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────┘    │
└─────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                      │
          └────────────────▼──────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│                    ANTHROPIC CLAUDE API                         │
│                    (claude-sonnet-4-6)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      DATABASE LAYER                             │
│                 PostgreSQL + SQLAlchemy ORM                     │
│                                                                 │
│  users  leads  cars  car_features  car_photos  lead_notes       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Descriptions

### REST API Layer (FastAPI)
Handles all HTTP requests. Input validated automatically via Pydantic schemas. Auto-generates interactive OpenAPI docs at `/docs`. Async by default for non-blocking I/O.

### LeadService (`app/services/lead_service.py`)
Core business logic for leads — create, list (sorted by AI score), fetch detail (with AI summary), assign to salesperson.

### NoteService (`app/services/note_service.py`)
Handles persisting `lead_notes`. Calls the AI Enricher before saving so every note is stored with `type`, `sentiment`, and `next_action` already populated.

### AI Service Layer (`app/ai/`)
Three focused functions, each wrapping a Claude API call:

| Function | Trigger | Input | Output |
|---|---|---|---|
| **Enricher** | `POST /leads/{id}/notes` | note text + car details | type, sentiment, next_action |
| **Scorer** | `GET /leads` | all notes for a lead | ai_score (0–100), priority |
| **Summarizer** | `GET /leads/{id}` | all notes for a lead | ai_summary (2-line text) |

### SQLAlchemy ORM + Alembic (`app/models/`, `alembic/`)
Type-safe database access via SQLAlchemy models. Alembic handles versioned migrations — every schema change has a migration file.

### PostgreSQL
Persistent relational database storing all six tables.

---

## 3. Data Flow

### POST /leads/{id}/notes — Activity Logging
```
1. Salesperson sends: { "note": "Called John, interested but price too high" }
2. NoteService fetches car details for context (make, model, asking_price)
3. AI Enricher calls Claude API:
   prompt = note + car details → returns { type, sentiment, next_action }
4. NoteService saves to lead_notes with all AI fields populated
5. LeadService re-scores the lead (ai_score, priority updated on leads)
6. API returns enriched note to caller
```

### GET /leads — Lead Inbox
```
1. LeadService fetches all leads with their latest note and car summary
2. AI Scorer evaluates each lead's note history → ai_score + priority
3. Leads sorted by ai_score descending (hottest first)
4. Returns paginated list
```

### GET /leads/{id} — Lead Detail
```
1. LeadService fetches lead + car + car_features + car_photos + all notes
2. AI Summarizer generates 2-line summary from full note history
3. Returns complete lead object with ai_summary injected
```

---

## 4. Technology Choices

| Technology | Role | Justification |
|---|---|---|
| **Python 3.12** | Language | Clean syntax, huge AI/ML ecosystem, fast iteration |
| **FastAPI** | HTTP framework | Async, auto OpenAPI docs, Pydantic built-in |
| **PostgreSQL** | Database | Production-grade relational DB, strong JSON support |
| **SQLAlchemy** | ORM | Industry standard, flexible query building |
| **Alembic** | Migrations | Versioned schema migrations tied to SQLAlchemy models |
| **Pydantic v2** | Validation | Built into FastAPI, strict type validation at API boundary |
| **Anthropic Python SDK** | GenAI | Official Claude client, structured output via tool_use |
| **structlog** | Logging | Structured JSON logs, easy filtering in production |
| **Pytest + httpx** | Testing | Async-compatible HTTP testing for FastAPI |
| **python-jose + passlib** | Auth | JWT tokens + bcrypt password hashing |
| **Docker + Compose** | Local environment | Reproducible dev setup with PostgreSQL in one command |
| **GitHub Actions** | CI/CD | Lint → Test → Build on every push/PR |

---

## 5. Database Schema

```
users
├── id (PK)
├── name
├── email (unique)
├── password_hash
├── role (salesperson / manager / admin)
└── created_at

leads
├── id (PK)
├── seller_name
├── seller_email
├── seller_phone
├── status (new / contacted / negotiating / closed / lost)
├── priority (hot / warm / cold)          ← AI written
├── assigned_to (FK → users)
├── ai_score (0–100)                      ← AI written
├── ai_summary (text)                     ← AI written
└── created_at

cars
├── id (PK)
├── lead_id (FK → leads, unique)
├── make, model, year, mileage
├── condition (excellent / good / fair / poor)
├── asking_price
├── urgency (urgent / flexible / no_rush)
└── notes

car_features
├── id (PK)
├── car_id (FK → cars)
└── feature

car_photos
├── id (PK)
├── car_id (FK → cars)
├── url, label, sort_order

lead_notes
├── id (PK)
├── lead_id (FK → leads)
├── author_id (FK → users)
├── note (raw text)
├── type (phone_call / email / meeting / other)   ← AI written
├── sentiment (positive / neutral / negative)      ← AI written
├── next_action (text)                             ← AI written
├── ai_enriched (boolean)
└── created_at
```

---

## 6. Observability Strategy

The application uses the **OpenTelemetry (OTel)** standard as the single instrumentation layer, feeding into a full Grafana observability stack.

### Architecture

```
FastAPI App (OTel SDK)
        │
        │ OTLP/gRPC
        ▼
OTel Collector  ──── traces  ──► Tempo
                ──── metrics ──► Prometheus
                ──── logs    ──► Loki
                                   │
                              Grafana Dashboard
                         (single pane: traces + metrics + logs)
```

### Traces (OpenTelemetry → Tempo → Grafana)

Every request is automatically traced end-to-end:

```
POST /leads/5/notes                     [450ms total]
  ├── route handler                     [5ms]
  ├── NoteService.create                [440ms]
  │     ├── SQL SELECT leads+car        [8ms]   ← SQLAlchemy auto-instrumented
  │     ├── ai.enrich_note              [890ms] ← manual span
  │     │     └── Claude API call       [880ms]
  │     │           ai.model: claude-sonnet-4-6
  │     │           ai.input_tokens: 187
  │     │           ai.output_tokens: 64
  │     └── SQL INSERT lead_notes       [5ms]   ← SQLAlchemy auto-instrumented
```

**Libraries:** `opentelemetry-instrumentation-fastapi`, `opentelemetry-instrumentation-sqlalchemy`

### Metrics (OTel → Prometheus → Grafana)

Key metrics collected:
| Metric | Description |
|---|---|
| `http_server_duration_ms` | Request latency per endpoint (p50/p95/p99) |
| `http_server_request_count` | Request count by status code |
| `ai_call_duration_ms` | Claude API call latency per operation |
| `ai_tokens_used` | Input/output token usage per AI call |

### Logs (structlog → Loki → Grafana)

Structured JSON logs with trace correlation:
```json
{
  "timestamp": "2026-05-30T10:00:00Z",
  "level": "info",
  "event": "ai_enrichment_complete",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "lead_id": 5,
  "input_tokens": 187,
  "output_tokens": 64,
  "type": "phone_call",
  "sentiment": "negative"
}
```

`trace_id` links every log line back to its trace in Tempo — click a log in Loki, jump directly to the full trace in Tempo.

### Graceful AI Degradation
If the Claude API call fails, the note is saved with `ai_enriched: false`. The failure is logged as a warning and the trace span is marked with error status. Core CRUD works independently of the AI layer.

### Health Check
`GET /health` — returns service status and environment.

### Local Observability Stack
```bash
docker-compose up  # starts app + postgres + otel-collector + prometheus + loki + tempo + grafana

# Grafana dashboard:  http://localhost:3000
# Prometheus:         http://localhost:9090
# API docs:           http://localhost:8000/docs
```

---

## 7. CI/CD Pipeline (GitHub Actions)

```
Push / PR to main
       │
       ▼
┌─────────────┐
│    Lint     │  ruff + mypy type check
└──────┬──────┘
       ▼
┌─────────────┐
│    Test     │  pytest with real PostgreSQL service container
└──────┬──────┘
       ▼
┌─────────────┐
│    Build    │  docker build — verifies image builds cleanly
└─────────────┘
```

---

## 8. GenAI Usage in Design Phase

Claude Code (claude-sonnet-4-6) was used as the primary AI collaborator throughout this assessment:

- **Schema design**: Discussed and validated the 6-table relational schema — the decision to separate `cars` from `leads` and use `car_features` as a child table rather than a comma-separated string.
- **AI integration points**: Identified the three natural GenAI touchpoints (Enricher, Scorer, Summarizer) and mapped them to the three core PDF requirements.
- **Architecture decisions**: Validated making AI failures non-fatal so CRUD works independently of the AI layer.
- **Tech stack selection**: Evaluated Python/FastAPI vs Node.js/Express — chose FastAPI for async support, auto OpenAPI docs, and Pydantic's tight integration.
- **Prompt engineering**: Designed structured prompts using Claude's `tool_use` feature to guarantee JSON output format.

All AI output was reviewed, challenged, and refined. Final architectural decisions were made by the engineer.
