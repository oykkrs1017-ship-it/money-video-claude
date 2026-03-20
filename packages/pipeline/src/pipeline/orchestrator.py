"""
メインパイプラインオーケストレーター
テーマ抽出 → 台本生成 → レビュー → (音声合成) → (動画生成) → (アップロード)
"""
import json
from pathlib import Path
from datetime import datetime
from shared.logger import get_logger
from shared.exceptions import PipelineError, MaxRetriesExceededError, PolicyViolationError
from shared.storage import Storage
from pipeline.config import Config

logger = get_logger(__name__)


class Pipeline:
    def __init__(self, config: Config | None = None):
        self.config = config or Config()
        self.storage = Storage(base_dir=self.config.OUTPUT_DIR)

    def run_script_pipeline(
        self,
        topic: str | None = None,
        description: str = "",
        auto_topic: bool = False,
        top_n: int = 1,
    ) -> dict:
        """
        Phase 1: テーマ抽出 → 台本生成 → レビュー
        Returns dict with script path and review result.
        """
        logger.info("pipeline_started", auto_topic=auto_topic, topic=topic)

        # Step 1: Topic selection
        if auto_topic:
            selected_topic, selected_description = self._extract_topic(top_n=top_n)
        elif topic:
            selected_topic = topic
            selected_description = description
        else:
            raise PipelineError("Either topic or auto_topic=True must be provided")

        logger.info("topic_selected", topic=selected_topic)

        # Step 2: Script generation
        script = self._generate_script(selected_topic, selected_description)
        script_json = script.model_dump_json(indent=2, ensure_ascii=False)

        # Inject LINE URL
        script_dict = json.loads(script_json)
        script_dict["cta"]["line_url"] = self.config.LINE_OA_URL
        script_json = json.dumps(script_dict, ensure_ascii=False, indent=2)

        # Step 3: Script review
        review_result = self._review_script(script_json)

        final_json = review_result.corrected_script_json or script_json

        # Save to storage
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_topic = selected_topic[:30].replace(" ", "_").replace("/", "-")
        filename = f"{timestamp}_{safe_topic}.json"
        saved_path = self.storage.save_json(
            json.loads(final_json),
            subdir="scripts",
            filename=filename,
        )

        logger.info(
            "pipeline_script_completed",
            topic=selected_topic,
            path=str(saved_path),
            review_loops=review_result.review_count,
            passed=review_result.passed,
        )

        return {
            "topic": selected_topic,
            "script_path": str(saved_path),
            "review_passed": review_result.passed,
            "review_loops": review_result.review_count,
            "issue_count": len(review_result.issues),
        }

    def _extract_topic(self, top_n: int = 5) -> tuple[str, str]:
        """Extract trending topic using TrendExtractor."""
        from trend_extractor import TrendExtractor
        extractor = TrendExtractor(news_api_key=self.config.NEWS_API_KEY)
        candidates = extractor.extract(top_n=top_n)
        if not candidates:
            raise PipelineError("No topic candidates found")
        best = candidates[0]
        return best.title, best.description

    def _generate_script(self, topic: str, description: str):
        """Generate debate script using ScriptGenerator."""
        from script_generator import ScriptGenerator
        generator = ScriptGenerator(api_key=self.config.GEMINI_API_KEY)
        return generator.generate(topic=topic, description=description)

    def _review_script(self, script_json: str):
        """Review and self-correct script using ScriptReviewer."""
        from script_reviewer import ScriptReviewer
        reviewer = ScriptReviewer(
            anthropic_api_key=self.config.ANTHROPIC_API_KEY,
            gemini_api_key=self.config.GEMINI_API_KEY,
        )
        try:
            return reviewer.review(script_json)
        except (MaxRetriesExceededError, PolicyViolationError) as e:
            logger.error("review_failed", error=str(e))
            raise PipelineError(f"Script review failed: {e}") from e

    def run_audio_pipeline(
        self,
        script_path: str,
    ) -> dict:
        """
        Phase 2: 台本JSON → 音声合成 → AudioManifest
        """
        from pathlib import Path
        from audio_synthesizer import AudioSynthesizer

        logger.info("audio_pipeline_started", script_path=script_path)

        synthesizer = AudioSynthesizer(
            voicevox_url=self.config.VOICEVOX_URL,
            audio_dir=self.config.OUTPUT_DIR / "audio",
        )

        manifest = synthesizer.synthesize_script(script_path=Path(script_path))

        logger.info(
            "audio_pipeline_completed",
            title=manifest.script_title,
            total_duration_ms=manifest.total_duration_ms,
            segments=len(manifest.segments),
        )

        return {
            "script_title": manifest.script_title,
            "total_duration_ms": manifest.total_duration_ms,
            "segment_count": len(manifest.segments),
            "audio_dir": str(self.config.OUTPUT_DIR / "audio"),
        }

    def run_full_pipeline(
        self,
        topic: str | None = None,
        auto_topic: bool = False,
    ) -> dict:
        """
        Phase 1 + Phase 2: テーマ抽出 → 台本生成 → レビュー → 音声合成
        """
        # Phase 1
        script_result = self.run_script_pipeline(
            topic=topic,
            auto_topic=auto_topic,
        )

        # Phase 2
        audio_result = self.run_audio_pipeline(
            script_path=script_result["script_path"],
        )

        return {**script_result, **audio_result}
