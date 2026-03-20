"""
自己修正ループ: 最大MAX_LOOPS回、レビュー結果をGeminiにフィードバックして台本を再生成
"""
import json
import os
import google.generativeai as genai
from shared.logger import get_logger
from shared.exceptions import MaxRetriesExceededError, APIError
from script_reviewer.models import ReviewIssue

logger = get_logger(__name__)

MAX_LOOPS = int(os.getenv("MAX_REVIEW_LOOPS", "3"))

CORRECTION_PROMPT = """
前回生成した台本に以下の問題が見つかりました。修正してください。

## 指摘事項
{issues_text}

## 元の台本
{original_script_json}

修正後のJSON台本のみを出力してください（マークダウン不要）。
"""


def apply_corrections(
    original_script_json: str,
    issues: list[ReviewIssue],
    api_key: str | None = None,
) -> str:
    """Ask Gemini to fix the script based on reviewer issues. Returns corrected JSON string."""
    key = api_key or os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise APIError("gemini", "GEMINI_API_KEY is not set")

    genai.configure(api_key=key)
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        generation_config=genai.GenerationConfig(
            temperature=0.7,
            response_mime_type="application/json",
        ),
    )

    issues_text = "\n".join(
        f"- [{i.severity.upper()}] セグメント{i.segment_index}: {i.description}"
        f"{' → ' + i.suggestion if i.suggestion else ''}"
        for i in issues
    )

    prompt = CORRECTION_PROMPT.format(
        issues_text=issues_text,
        original_script_json=original_script_json,
    )

    try:
        response = model.generate_content(prompt)
        corrected = response.text
        json.loads(corrected)  # Validate JSON
        logger.info("correction_applied", issue_count=len(issues))
        return corrected
    except json.JSONDecodeError as e:
        raise APIError("gemini", f"Correction returned invalid JSON: {e}")
    except Exception as e:
        raise APIError("gemini", str(e))
