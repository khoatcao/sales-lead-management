import logging

from opentelemetry import metrics, trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.semconv.resource import ResourceAttributes

from app.config import settings

logger = logging.getLogger(__name__)


def setup_telemetry(app, engine) -> None:
    if settings.environment == "test":
        return

    resource = Resource.create(
        {
            ResourceAttributes.SERVICE_NAME: "sales-lead-management",
            ResourceAttributes.SERVICE_VERSION: "1.0.0",
            ResourceAttributes.DEPLOYMENT_ENVIRONMENT: settings.environment,
        }
    )

    # ── Traces → Tempo ────────────────────────────────────────────
    otlp_span_exporter = OTLPSpanExporter(
        endpoint=settings.otel_endpoint,
        insecure=True,
    )
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(otlp_span_exporter))
    trace.set_tracer_provider(tracer_provider)

    # ── Metrics → Prometheus (via OTel Collector) ─────────────────
    otlp_metric_exporter = OTLPMetricExporter(
        endpoint=settings.otel_endpoint,
        insecure=True,
    )
    metric_reader = PeriodicExportingMetricReader(
        otlp_metric_exporter,
        export_interval_millis=15000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # ── Logs → Loki (via OTel Collector) ─────────────────────────
    otlp_log_exporter = OTLPLogExporter(
        endpoint=settings.otel_endpoint,
        insecure=True,
    )
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(otlp_log_exporter))
    set_logger_provider(logger_provider)

    # Configure structured JSON logging (structlog → stdlib → OTel bridge)
    from app.middleware.logging_config import configure_logging

    configure_logging()

    # Bridge stdlib root logger → OTel logs → Loki
    from opentelemetry.sdk._logs import LoggingHandler

    otel_handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
    logging.getLogger().addHandler(otel_handler)

    # Auto-instrument FastAPI — every HTTP request gets a trace + metrics
    FastAPIInstrumentor.instrument_app(app)

    # Auto-instrument SQLAlchemy — every DB query becomes a child span
    SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)

    logging.getLogger(__name__).info(
        "OpenTelemetry tracing + metrics + logging initialised → %s", settings.otel_endpoint
    )


def get_tracer() -> trace.Tracer:
    """Return the app tracer for creating manual spans (e.g. AI calls)."""
    return trace.get_tracer("sales-lead-management")
