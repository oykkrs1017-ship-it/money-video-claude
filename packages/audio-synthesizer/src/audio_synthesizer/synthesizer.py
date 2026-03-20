"""
AudioSynthesizer: メインクラス
台本JSON → 個別WAV生成 → 後処理 → オーバーラップ合成 → AudioManifest 出力
"""
import json
from pathlib import Path
from shared.logger import get_logger
from shared.exceptions import PipelineError
from audio_synthesizer.voicevox_client import VoicevoxClient
from audio_synthesizer.audio_processor import add_breath_and_fade
from audio_synthesizer.overlap_mixer import mix_with_overlap, export_mixed
from audio_synthesizer.models import AudioManifest, AudioSegment

logger = get_logger(__name__)


class AudioSynthesizer:
    def __init__(self, voicevox_url: str | None = None, audio_dir: Path | str = "./data/audio"):
        self.voicevox_url = voicevox_url
        self.audio_dir = Path(audio_dir)

    def synthesize_script(
        self,
        script_path: Path | str,
        output_subdir: str | None = None,
    ) -> AudioManifest:
        """
        Load a debate script JSON and synthesize all segments.
        Returns AudioManifest with timing info.
        """
        script_path = Path(script_path)
        script = json.loads(script_path.read_text(encoding="utf-8"))

        title = script.get("title", "unknown")
        segments_data = script.get("segments", [])

        if not segments_data:
            raise PipelineError("Script has no segments")

        subdir = output_subdir or script_path.stem
        segment_dir = self.audio_dir / subdir
        segment_dir.mkdir(parents=True, exist_ok=True)

        logger.info("audio_synthesis_started", title=title, segments=len(segments_data))

        raw_segments: list[AudioSegment] = []

        with VoicevoxClient(base_url=self.voicevox_url) as client:
            for idx, seg_data in enumerate(segments_data):
                speaker = seg_data.get("speaker", "agent_a")
                text = seg_data.get("text", "")
                emotion = seg_data.get("emotion", 50)
                interrupt_at = seg_data.get("interrupt_at")

                wav_path = segment_dir / f"seg_{idx:03d}_{speaker}.wav"

                try:
                    duration_ms = client.synthesize(
                        text=text,
                        speaker=speaker,
                        emotion=emotion,
                        output_path=wav_path,
                    )
                except Exception as e:
                    logger.error("segment_synthesis_failed", index=idx, error=str(e))
                    raise PipelineError(f"Segment {idx} synthesis failed: {e}") from e

                # Post-process
                add_breath_and_fade(wav_path, emotion)

                audio_seg = AudioSegment(
                    segment_index=idx,
                    speaker=speaker,
                    file_path=str(wav_path),
                    start_ms=0,  # Will be updated by mixer
                    duration_ms=duration_ms,
                    emotion=emotion,
                )
                # Attach interrupt_at for mixer
                object.__setattr__(audio_seg, "_interrupt_at", interrupt_at)
                raw_segments.append(audio_seg)

                logger.info("segment_synthesized", index=idx, speaker=speaker, emotion=emotion)

        # Mix with overlap
        logger.info("mixing_audio", segments=len(raw_segments))
        mixed_audio, updated_segments = mix_with_overlap(raw_segments, segment_dir)

        mixed_path = self.audio_dir / f"{subdir}_mixed.wav"
        total_duration = export_mixed(mixed_audio, mixed_path)

        manifest = AudioManifest(
            script_title=title,
            total_duration_ms=total_duration,
            segments=updated_segments,
        )

        # Save manifest JSON
        manifest_path = self.audio_dir / f"{subdir}_manifest.json"
        manifest_path.write_text(
            manifest.model_dump_json(indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        logger.info(
            "audio_synthesis_completed",
            title=title,
            total_duration_ms=total_duration,
            manifest=str(manifest_path),
        )

        return manifest
