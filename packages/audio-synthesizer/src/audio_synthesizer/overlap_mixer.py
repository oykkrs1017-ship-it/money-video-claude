"""
音声オーバーラップ合成:
interrupt_at が設定されたセグメントで前の話者の音声に被せる
"""
from pathlib import Path
from pydub import AudioSegment as PydubSegment
from shared.logger import get_logger
from audio_synthesizer.models import AudioSegment, AudioManifest

logger = get_logger(__name__)


def mix_with_overlap(
    segments: list[AudioSegment],
    audio_dir: Path,
) -> tuple[PydubSegment, list[AudioSegment]]:
    """
    Mix audio segments with overlap based on interrupt_at timing.
    Returns (mixed_audio, updated_segments_with_start_ms).
    """
    if not segments:
        return PydubSegment.silent(duration=1000), []

    timeline = PydubSegment.silent(duration=0)
    updated: list[AudioSegment] = []
    cursor_ms = 0

    for i, seg in enumerate(segments):
        wav_path = Path(seg.file_path)
        if not wav_path.exists():
            logger.warning("audio_file_missing", path=str(wav_path))
            continue

        audio = PydubSegment.from_wav(str(wav_path))
        duration = len(audio)

        # Check if previous segment had interrupt_at
        # If so, overlap this segment starting at (prev_start + interrupt_at)
        if i > 0 and updated:
            prev = updated[-1]
            # Retrieve interrupt_at from original segment data
            # We store it in metadata via segment index lookup
            interrupt_at = getattr(seg, "_interrupt_at", None)
            if interrupt_at is not None and interrupt_at > 0:
                overlap_start = prev.start_ms + interrupt_at
                # Extend timeline if needed
                needed = overlap_start + duration
                if needed > len(timeline):
                    timeline = timeline + PydubSegment.silent(duration=needed - len(timeline))
                timeline = timeline.overlay(audio, position=overlap_start)
                cursor_ms = max(cursor_ms, overlap_start + duration)
                updated.append(seg.model_copy(update={
                    "start_ms": overlap_start,
                    "duration_ms": duration,
                }))
                continue

        # Normal sequential placement
        needed = cursor_ms + duration
        if needed > len(timeline):
            timeline = timeline + PydubSegment.silent(duration=needed - len(timeline))
        timeline = timeline.overlay(audio, position=cursor_ms)
        updated.append(seg.model_copy(update={
            "start_ms": cursor_ms,
            "duration_ms": duration,
        }))
        cursor_ms += duration
        # Small gap between segments
        cursor_ms += 200

    return timeline, updated


def export_mixed(mixed: PydubSegment, output_path: Path) -> int:
    """Export mixed audio to WAV. Returns duration in ms."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    mixed.export(str(output_path), format="wav")
    duration = len(mixed)
    logger.info("mixed_audio_exported", path=str(output_path), duration_ms=duration)
    return duration
