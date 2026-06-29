import time
import uuid
import logging
import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("api.access")

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate correlation_id and request_id
        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
        request_id = str(uuid.uuid4())
        
        # Store in request state for access in exception handlers or routes
        request.state.correlation_id = correlation_id
        request.state.request_id = request_id
        
        start_time = time.perf_counter()
        
        try:
            response = await call_next(request)
            process_time_ms = (time.perf_counter() - start_time) * 1000
            
            # X-Correlation-ID header in response
            response.headers["X-Correlation-ID"] = correlation_id
            
            log_data = {
                "request_id": request_id,
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "duration_ms": round(process_time_ms, 2),
                "status_code": response.status_code,
                # tenant_id & user_id normally extracted from auth middleware / dependencies
                "tenant_id": getattr(request.state, "tenant_id", None),
                "user_id": getattr(request.state, "user_id", None)
            }
            logger.info(json.dumps(log_data))
            return response
            
        except Exception as e:
            process_time_ms = (time.perf_counter() - start_time) * 1000
            error_code = getattr(e, "error_code", "GENERIC_ERROR")
            if hasattr(error_code, "value"):
                error_code = error_code.value
                
            log_data = {
                "request_id": request_id,
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "duration_ms": round(process_time_ms, 2),
                "status_code": getattr(e, "status_code", 500),
                "error_code": error_code,
                "tenant_id": getattr(request.state, "tenant_id", None),
                "user_id": getattr(request.state, "user_id", None),
                "error_detail": str(e)
            }
            logger.error(json.dumps(log_data))
            raise e
