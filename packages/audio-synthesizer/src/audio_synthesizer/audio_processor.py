"""
音声後処理: ブレス音挿入・微小ノイズ付加・フェード
"""
import random
from pathlib import Path
from pydub import AudioSegment as PydubSegment
from shared.logger import get_logger

logger = get_logger(__name__)

# ブレス音（無音＋微小ノイズで代替）
BREATH_DURATION_MS = 150
NOISE_AMPLITUDE = 50  # 0-32767


def _generate_breath(duration_ms: int = BREATH_DURATION_MS) -> PydubSegment:
    """Generate a simple breath-like audio segment."""
    silence = PydubSegment.silent(duration=duration_ms)
    # Add slight noise to simulate breath
    samples = silence.get_array_of_samples()
    noisy = bytearray()
    for s in samples:
        noisy += (s + random.randint(-NOISE_AMPLITUDE, NOISE_AMPLITUDE)).to_bytes(
            2, byteorder="little", signed=True
        )
    return silence._spawn(noisy)


def add_breath_and_fade(wav_path: Path, emotion: int) -> Path:
    """
    Add breath intro and fade-in/out to a WAV file.
    Higher emotion = shorter breath, more aggressive fade.
    Returns the path to the processed file (overwrites in place).
    """
    audio = PydubSegment.from_wav(str(wav_path))

    # Breath before speech (shorter for high emotion)
    breath_ms = max(50, BREATH_DURATION_MS - emotion)
    breath = _generate_breath(breath_ms)

    # Fade in/out
    fade_ms = max(20, 80 - emotion // 2)
    audio = audio.fade_in(fade_ms).fade_out(fade_ms)

    processed = breath + audio
    processed.export(str(wav_path), format="wav")
    logger.debug("audio_processed", path=str(wav_path), emotion=emotion, breath_ms=breath_ms)
    return wav_path
