import pytest
from audio_synthesizer.emotion_mapper import get_voice_params, _emotion_to_level


def test_emotion_level_calm():
    assert _emotion_to_level(0) == "calm"
    assert _emotion_to_level(20) == "calm"


def test_emotion_level_normal():
    assert _emotion_to_level(21) == "normal"
    assert _emotion_to_level(50) == "normal"


def test_emotion_level_heated():
    assert _emotion_to_level(51) == "heated"
    assert _emotion_to_level(75) == "heated"


def test_emotion_level_intense():
    assert _emotion_to_level(76) == "intense"
    assert _emotion_to_level(100) == "intense"


def test_agent_a_calm_params():
    params = get_voice_params("agent_a", 10)
    assert params.style_id == 3
    assert params.speed == 0.90
    assert params.pitch == -0.05


def test_agent_a_intense_params():
    params = get_voice_params("agent_a", 90)
    assert params.style_id == 2
    assert params.speed == 1.20


def test_agent_b_normal_params():
    params = get_voice_params("agent_b", 35)
    assert params.style_id == 8
    assert params.speed == 1.00


def test_agent_b_heated_params():
    params = get_voice_params("agent_b", 60)
    assert params.style_id == 10
    assert params.speed == 1.08


def test_unknown_speaker_falls_back_to_agent_a():
    params = get_voice_params("unknown_speaker", 50)
    # Should fall back to agent_a mapping
    assert params.style_id in [3, 2]  # agent_a style IDs
