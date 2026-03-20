import pytest
from audio_synthesizer.models import AudioSegment, AudioManifest


def test_audio_segment_creation():
    seg = AudioSegment(
        segment_index=0,
        speaker="agent_a",
        file_path="/tmp/test.wav",
        start_ms=0,
        duration_ms=3000,
        emotion=50,
    )
    assert seg.segment_index == 0
    assert seg.duration_ms == 3000


def test_audio_manifest_creation():
    segments = [
        AudioSegment(
            segment_index=i,
            speaker="agent_a",
            file_path=f"/tmp/seg_{i}.wav",
            start_ms=i * 3000,
            duration_ms=3000,
            emotion=50,
        )
        for i in range(3)
    ]
    manifest = AudioManifest(
        script_title="Test Debate",
        total_duration_ms=9200,
        segments=segments,
    )
    assert manifest.script_title == "Test Debate"
    assert len(manifest.segments) == 3
    assert manifest.total_duration_ms == 9200


def test_audio_manifest_json_serialization():
    manifest = AudioManifest(
        script_title="テスト",
        total_duration_ms=5000,
        segments=[],
    )
    json_str = manifest.model_dump_json()
    assert "テスト" in json_str
    assert "5000" in json_str
