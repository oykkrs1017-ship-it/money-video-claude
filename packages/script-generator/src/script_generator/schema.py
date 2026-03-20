"""
台本JSONスキーマ定義 - Python と TypeScript の Single Source of Truth
"""
from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field


class AgentProfile(BaseModel):
    id: str
    name: str
    position: str


class ScriptSegment(BaseModel):
    speaker: str
    text: str
    emotion: int = Field(ge=0, le=100)
    interrupt_at: int | None = None
    data_visual: dict[str, Any] | None = None


class CTAConfig(BaseModel):
    text: str
    line_url: str


class DebateScript(BaseModel):
    title: str
    topic: str
    agents: list[AgentProfile] = Field(min_length=2, max_length=2)
    segments: list[ScriptSegment] = Field(min_length=4)
    cliffhanger: str
    cta: CTAConfig
    metadata: dict[str, Any] = Field(default_factory=dict)
