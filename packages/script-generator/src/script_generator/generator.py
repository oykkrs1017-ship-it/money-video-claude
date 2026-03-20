from shared.logger import get_logger
from shared.exceptions import PipelineError
from script_generator.gemini_client import GeminiScriptClient
from script_generator.validator import validate_script
from script_generator.schema import DebateScript

logger = get_logger(__name__)


class ScriptGenerator:
    def __init__(self, api_key: str | None = None):
        self.client = GeminiScriptClient(api_key=api_key)

    def generate(
        self,
        topic: str,
        description: str = "",
        format_name: str = "スタンダードディベート",
        target_minutes: int = 8,
    ) -> DebateScript:
        logger.info("script_generation_started", topic=topic)
        script = self.client.generate(
            topic=topic,
            description=description,
            format_name=format_name,
            target_minutes=target_minutes,
        )
        warnings = validate_script(script)
        if warnings:
            logger.warning("script_validation_warnings", warnings=warnings)
        logger.info("script_generation_completed", topic=topic, segments=len(script.segments))
        return script
