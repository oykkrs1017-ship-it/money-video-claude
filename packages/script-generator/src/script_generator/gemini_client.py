import json
import os
import google.generativeai as genai
from shared.logger import get_logger
from shared.exceptions import APIError, ValidationError
from script_generator.schema import DebateScript
from script_generator.prompt_templates import DEBATE_SYSTEM_PROMPT, DEBATE_USER_PROMPT

logger = get_logger(__name__)


class GeminiScriptClient:
    def __init__(self, api_key: str | None = None):
        key = api_key or os.getenv("GEMINI_API_KEY", "")
        if not key:
            raise ValueError("GEMINI_API_KEY is not set")
        genai.configure(api_key=key)
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=DEBATE_SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                temperature=0.85,
                response_mime_type="application/json",
            ),
        )

    def generate(
        self,
        topic: str,
        description: str,
        format_name: str = "スタンダードディベート",
        target_minutes: int = 8,
    ) -> DebateScript:
        prompt = DEBATE_USER_PROMPT.format(
            topic=topic,
            description=description,
            format_name=format_name,
            target_minutes=target_minutes,
        )
        logger.info("gemini_generate_started", topic=topic)
        try:
            response = self.model.generate_content(prompt)
            raw_json = response.text
            logger.info("gemini_generate_completed", topic=topic, chars=len(raw_json))
        except Exception as e:
            raise APIError("gemini", str(e))

        try:
            data = json.loads(raw_json)
            script = DebateScript.model_validate(data)
            return script
        except json.JSONDecodeError as e:
            raise ValidationError(f"Gemini returned invalid JSON: {e}")
        except Exception as e:
            raise ValidationError(f"Script schema validation failed: {e}")
