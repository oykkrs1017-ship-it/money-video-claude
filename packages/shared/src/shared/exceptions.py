class PipelineError(Exception):
    """Base exception for pipeline errors."""
    pass


class ValidationError(PipelineError):
    """Raised when data validation fails."""
    pass


class APIError(PipelineError):
    """Raised when an external API call fails."""
    def __init__(self, service: str, message: str, status_code: int | None = None):
        self.service = service
        self.status_code = status_code
        super().__init__(f"[{service}] {message} (status={status_code})")


class MaxRetriesExceededError(PipelineError):
    """Raised when the self-correction loop exceeds max retries."""
    pass


class PolicyViolationError(PipelineError):
    """Raised when script review detects a policy violation."""
    pass
