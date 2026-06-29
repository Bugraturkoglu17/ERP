# ─────────────────────────────────────────────────────────────────────────────
#  Sismik Mekanik ERP — Custom Exceptions
# ─────────────────────────────────────────────────────────────────────────────

from enum import Enum

class ErrorCode(str, Enum):
    WA_AUTH_ERROR = "WA_AUTH_ERROR"
    WA_RATE_LIMIT = "WA_RATE_LIMIT"
    WA_INVALID_TEMPLATE = "WA_INVALID_TEMPLATE"
    STORAGE_UPLOAD_FAIL = "STORAGE_UPLOAD_FAIL"
    STORAGE_PRESIGNED_FAIL = "STORAGE_PRESIGNED_FAIL"
    DB_DEADLOCK = "DB_DEADLOCK"
    DB_TIMEOUT = "DB_TIMEOUT"
    TENANT_FORBIDDEN = "TENANT_FORBIDDEN"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    RATE_LIMITED = "RATE_LIMITED"
    GENERIC_ERROR = "GENERIC_ERROR"
    NOT_FOUND = "NOT_FOUND"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    CONFLICT_ERROR = "CONFLICT_ERROR"


class AppException(Exception):
    """Tüm özel exception'ların temel sınıfı."""

    status_code: int = 400
    detail: str = "Bir hata oluştu."
    error_code: ErrorCode = ErrorCode.GENERIC_ERROR

    def __init__(
        self, 
        detail: str | None = None, 
        status_code: int | None = None,
        error_code: ErrorCode | None = None
    ) -> None:
        self.detail = detail or self.detail
        self.status_code = status_code or self.status_code
        self.error_code = error_code or self.error_code
        super().__init__(self.detail)


class NotFoundError(AppException):
    status_code = 404
    detail = "Kayıt bulunamadı."
    error_code = ErrorCode.NOT_FOUND


class ForbiddenError(AppException):
    status_code = 403
    detail = "Bu işlem için yetkiniz yok."
    error_code = ErrorCode.TENANT_FORBIDDEN


class UnauthorizedError(AppException):
    status_code = 401
    detail = "Kimlik doğrulama gerekli."
    error_code = ErrorCode.AUTH_REQUIRED


class ValidationError(AppException):
    status_code = 422
    detail = "Doğrulama hatası."
    error_code = ErrorCode.VALIDATION_ERROR


class ConflictError(AppException):
    status_code = 409
    detail = "Kayıt zaten mevcut."
    error_code = ErrorCode.CONFLICT_ERROR

