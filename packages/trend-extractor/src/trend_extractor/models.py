from pydantic import BaseModel, Field


class TopicCandidate(BaseModel):
    title: str
    description: str
    category: str
    score: float = Field(ge=0.0, le=1.0)
    source: str
    keywords: list[str] = Field(default_factory=list)
