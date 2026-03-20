"""
感情値(0-100) → VOICEVOX パラメータ変換
configs/characters.yaml の定義に基づく
"""
from __future__ import annotations
from dataclasses import dataclass


@dataclass
class VoiceParams:
    style_id: int
    speed: float
    pitch: float
    intonation: float


# キャラクターごとの感情マッピング
_EMOTION_MAP: dict[str, dict[str, VoiceParams]] = {
    "agent_a": {  # AXIS
        "calm":    VoiceParams(style_id=3,  speed=0.90, pitch=-0.05, intonation=1.0),
        "normal":  VoiceParams(style_id=3,  speed=1.00, pitch=0.00,  intonation=1.0),
        "heated":  VoiceParams(style_id=2,  speed=1.10, pitch=0.05,  intonation=1.2),
        "intense": VoiceParams(style_id=2,  speed=1.20, pitch=0.10,  intonation=1.4),
    },
    "agent_b": {  # LYRA
        "calm":    VoiceParams(style_id=8,  speed=0.90, pitch=-0.03, intonation=1.0),
        "normal":  VoiceParams(style_id=8,  speed=1.00, pitch=0.00,  intonation=1.0),
        "heated":  VoiceParams(style_id=10, speed=1.08, pitch=0.05,  intonation=1.2),
        "intense": VoiceParams(style_id=10, speed=1.18, pitch=0.08,  intonation=1.5),
    },
}


def _emotion_to_level(emotion: int) -> str:
    if emotion <= 20:
        return "calm"
    elif emotion <= 50:
        return "normal"
    elif emotion <= 75:
        return "heated"
    else:
        return "intense"


def get_voice_params(speaker: str, emotion: int) -> VoiceParams:
    """Return VOICEVOX parameters for a given speaker and emotion value."""
    level = _emotion_to_level(emotion)
    speaker_map = _EMOTION_MAP.get(speaker, _EMOTION_MAP["agent_a"])
    return speaker_map[level]
