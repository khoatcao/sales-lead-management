"""
Structured JSON logging configuration.

Every log line is emitted as:
{
  "timestamp": "2026-05-30T10:00:00Z",
  "level": "INFO",
  "service": "sales-lead-management",
  "request_id": "<trace_id>",   # injected by request middleware
  "user_id": 42,                # injected after auth
  "message": "...",
  ... any extra fields passed to logger.info(...)
}
"""

import logging

import structlog


def _add_service(logger, method, event_dict: dict) -> dict:
    event_dict.setdefault("service", "sales-lead-management")
    return event_dict


def _uppercase_level(logger, method, event_dict: dict) -> dict:
    if "level" in event_dict:
        event_dict["level"] = event_dict["level"].upper()
    return event_dict


# Processors shared between structlog and the stdlib foreign-log chain
_shared_processors = [
    structlog.contextvars.merge_contextvars,
    structlog.stdlib.add_log_level,
    _uppercase_level,
    structlog.processors.TimeStamper(fmt="iso", key="timestamp"),
    _add_service,
    structlog.processors.EventRenamer("message"),
]


def configure_logging() -> None:
    """
    Wire up structlog to emit JSON to stdout.
    Also configures the stdlib root logger with the same formatter
    so that third-party libraries (sqlalchemy, uvicorn, etc.) emit
    the same JSON shape and get picked up by the OTel log bridge.
    """
    structlog.configure(
        processors=_shared_processors
        + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.JSONRenderer(),
        ],
        foreign_pre_chain=_shared_processors,
    )

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)

    # Suppress noisy third-party loggers
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
