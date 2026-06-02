import logging

from opentelemetry import metrics, trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.semconv.resource import ResourceAttributes
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

from app.config import settings

logger = logging.getLogger(__name__)


def _build_exporters(auth_header: str, endpoint: str):
    """Return (span_exporter, metric_exporter, log_exporter) for gRPC or HTTP."""
    if auth_header:
        # Grafana Cloud — OTLP HTTP with Basic auth
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
        from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter

        headers = {"Authorization": auth_header}
        span_exporter = OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces", headers=headers)
        metric_exporter = OTLPMetricExporter(endpoint=f"{endpoint}/v1/metrics", headers=headers)
        log_exporter = OTLPLogExporter(endpoint=f"{endpoint}/v1/logs", headers=headers)
    else:
        # Local OTel Collector — gRPC insecure
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
        from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

        span_exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
        metric_exporter = OTLPMetricExporter(endpoint=endpoint, insecure=True)
        log_exporter = OTLPLogExporter(endpoint=endpoint, insecure=True)

    return span_exporter, metric_exporter, log_exporter


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

    span_exporter, metric_exporter, log_exporter = _build_exporters(
        settings.otel_auth_header, settings.otel_endpoint
    )

    # ── Traces ────────────────────────────────────────────────────
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
    trace.set_tracer_provider(tracer_provider)

    # ── Metrics ───────────────────────────────────────────────────
    metric_reader = PeriodicExportingMetricReader(metric_exporter, export_interval_millis=15000)
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # ── Logs ──────────────────────────────────────────────────────
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
    set_logger_provider(logger_provider)

    from app.middleware.logging_config import configure_logging

    configure_logging()

    from opentelemetry.sdk._logs import LoggingHandler

    otel_handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
    logging.getLogger().addHandler(otel_handler)

    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)

    destination = "Grafana Cloud" if settings.otel_auth_header else settings.otel_endpoint
    logging.getLogger(__name__).info(
        "OpenTelemetry tracing + metrics + logging initialised → %s", destination
    )


def get_tracer() -> trace.Tracer:
    """Return the app tracer for creating manual spans (e.g. AI calls)."""
    return trace.get_tracer("sales-lead-management")
