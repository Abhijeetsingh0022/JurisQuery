"""
Global exception handlers for JurisQuery Backend.
"""

from fastapi import HTTPException, status


class JurisQueryException(HTTPException):
    """Base exception for JurisQuery."""

    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str = "An unexpected error occurred",
    ):
        super().__init__(status_code=status_code, detail=detail)


class NotFoundError(JurisQueryException):
    """Resource not found exception."""

    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found",
        )


class UnauthorizedError(JurisQueryException):
    """Unauthorized access exception."""

    def __init__(self, detail: str = "Invalid or expired token"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        )


class ForbiddenError(JurisQueryException):
    """Forbidden access exception."""

    def __init__(self, detail: str = "You don't have permission to access this resource"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


class BadRequestError(JurisQueryException):
    """Bad request exception."""

    def __init__(self, detail: str = "Invalid request"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


class RateLimitError(JurisQueryException):
    """Rate limit exceeded exception."""

    def __init__(self, detail: str = "Rate limit exceeded. Please try again later"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
        )


class ProcessingError(JurisQueryException):
    """Document processing exception."""

    def __init__(self, detail: str = "Failed to process document"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
        )
