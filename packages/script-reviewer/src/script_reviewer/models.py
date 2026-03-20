from __future__ import annotations
from pydantic import BaseModel, Field


class ReviewIssue(BaseModel):
    issue_type: str   # "fact_error" | "policy_violation" | "quality"
    severity: str     # "error" | "warning"
    segment_index: int | None = None
    description: str
    suggestion: str | None = None


class ReviewResult(BaseModel):
    passed: bool
    issues: list[ReviewIssue] = Field(default_factory=list)
    corrected_script_json: str | None = None  # JSON string of corrected script
    review_count: int = 0
