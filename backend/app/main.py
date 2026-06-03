import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine
from app.middleware.telemetry import setup_telemetry
from app.routes import analytics, leads, notes, users

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("app_starting", environment=settings.environment)
    yield
    await engine.dispose()
    logger.info("app_stopped")


app = FastAPI(
    title="Sales Lead Management API",
    description="AI-powered sales lead management for automotive dealerships",
    version="1.0.0",
    lifespan=lifespan,
)

if settings.environment == "development":
    cors_origins = ["*"]
else:
    cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Must be called at module level AFTER app and middleware are set up
# so that FastAPIInstrumentor wraps the full middleware stack
setup_telemetry(app, engine)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    import structlog
    from opentelemetry import trace as otel_trace

    # Bind per-request context so every log line in this request gets request_id
    span = otel_trace.get_current_span()
    trace_id = format(span.get_span_context().trace_id, "032x") if span else ""
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=trace_id)

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000)
    logger.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(users.router)
app.include_router(leads.router)
app.include_router(notes.router)
app.include_router(analytics.router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "environment": settings.environment}
