from __future__ import annotations
from pydantic import BaseModel, Field


class AudioSegment(BaseModel):
    segment_index: int
    speaker: str
    file_path: str
    start_ms: int
    duration_ms: int
    emotion: int


class AudioManifest(BaseModel):
    script_title: str
    total_duration_ms: int
    segments: list[AudioSegment]
