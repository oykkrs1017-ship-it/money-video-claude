"""
VOICEVOX Engine REST API クライアント
http://localhost:50021 で起動している VOICEVOX Engine と通信する
"""
import httpx
import os
from pathlib import Path
from shared.logger import get_logger
from shared.exceptions import APIError
from audio_synthesizer.emotion_mapper import get_voice_params, VoiceParams

logger = get_logger(__name__)


class VoicevoxClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or os.getenv("VOICEVOX_URL", "http://localhost:50021")).rstrip("/")
        self.client = httpx.Client(timeout=60.0)

    def _check_health(self) -> bool:
        try:
            resp = self.client.get(f"{self.base_url}/version")
            return resp.status_code == 200
        except Exception:
            return False

    def synthesize(
        self,
        text: str,
        speaker: str,
        emotion: int,
        output_path: Path,
    ) -> int:
        """
        Synthesize speech and save to output_path.
        Returns duration in milliseconds.
        """
        params = get_voice_params(speaker, emotion)

        # Step 1: audio_query
        try:
            query_resp = self.client.post(
                f"{self.base_url}/audio_query",
                params={"text": text, "speaker": params.style_id},
            )
            query_resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise APIError("voicevox", f"audio_query failed: {e}", e.response.status_code)
        except httpx.ConnectError:
            raise APIError("voicevox", "Cannot connect to VOICEVOX Engine. Is it running?")

        query_data = query_resp.json()

        # Step 2: Apply emotion parameters
        query_data["speedScale"] = params.speed
        query_data["pitchScale"] = params.pitch
        query_data["intonationScale"] = params.intonation

        # Step 3: synthesis
        try:
            synth_resp = self.client.post(
                f"{self.base_url}/synthesis",
                params={"speaker": params.style_id},
                json=query_data,
            )
            synth_resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise APIError("voicevox", f"synthesis failed: {e}", e.response.status_code)

        # Save WAV
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(synth_resp.content)

        # Estimate duration from query data
        duration_ms = self._estimate_duration_ms(query_data)
        logger.info(
            "voicevox_synthesized",
            speaker=speaker,
            emotion=emotion,
            duration_ms=duration_ms,
            path=str(output_path),
        )
        return duration_ms

    def _estimate_duration_ms(self, query_data: dict) -> int:
        """Estimate audio duration from VOICEVOX query data."""
        total = 0.0
        for mora in query_data.get("accent_phrases", []):
            for m in mora.get("moras", []):
                total += m.get("consonant_length", 0.0) + m.get("vowel_length", 0.0)
            if mora.get("pause_mora"):
                total += mora["pause_mora"].get("vowel_length", 0.0)
        speed = query_data.get("speedScale", 1.0)
        return max(int(total / speed * 1000), 100)

    def close(self):
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
