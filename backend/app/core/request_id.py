"""
Request-ID middleware.

Phase 2 stabilization (M-004): every inbound HTTP request is tagged with a
correlation id propagated through logs and returned as `X-Request-ID` on the
response. Honours an incoming client-supplied `X-Request-ID` when present
(e.g. from nginx or a frontend tracer) so a single trace spans edges.
"""
import logging
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_REQUEST_ID_HEADER = "X-Request-ID"
_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


def current_request_id() -> str:
    """Return the request id for the current async context (or '-' when unset)."""
    return _request_id_ctx.get()


class RequestIdFilter(logging.Filter):
    """Injects %(request_id)s into every LogRecord."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id_ctx.get()
        return True


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get(_REQUEST_ID_HEADER)
        rid = incoming if incoming else uuid.uuid4().hex
        token = _request_id_ctx.set(rid)
        try:
            response: Response = await call_next(request)
        finally:
            _request_id_ctx.reset(token)
        response.headers[_REQUEST_ID_HEADER] = rid
        return response


def install_request_id_logging(root_logger: logging.Logger) -> None:
    """
    Attach the request-id filter to the root logger's handlers and rewrite
    formatters so `[rid=<id>]` is embedded in every line.
    """
    fmt = "%(asctime)s [%(levelname)s] [rid=%(request_id)s] %(name)s: %(message)s"
    formatter = logging.Formatter(fmt=fmt, datefmt="%Y-%m-%dT%H:%M:%S")
    rid_filter = RequestIdFilter()
    for handler in root_logger.handlers:
        handler.addFilter(rid_filter)
        handler.setFormatter(formatter)
    root_logger.addFilter(rid_filter)
