"""
事実誤認チェック（Claude APIを使用）
"""
import json
import anthropic
import os
from shared.logger import get_logger
from shared.exceptions import APIError
from script_reviewer.models import ReviewIssue

logger = get_logger(__name__)

FACT_CHECK_PROMPT = """
以下のAIディベート台本の各セグメントを確認し、明らかな事実誤認・誤情報を特定してください。

確認ポイント:
1. 存在しない統計や研究への言及
2. 明らかに誤った歴史的事実
3. 科学的コンセンサスと著しく乖離した主張

出力形式（JSONのみ）:
{
  "issues": [
    {
      "segment_index": 0-based整数,
      "description": "問題の説明",
      "suggestion": "修正案"
    }
  ]
}

問題がなければ {"issues": []} を返してください。

台本:
{script_json}
"""


def check_facts(script_json: str, api_key: str | None = None) -> list[ReviewIssue]:
    key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        logger.warning("anthropic_key_missing_skipping_fact_check")
        return []

    client = anthropic.Anthropic(api_key=key)
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": FACT_CHECK_PROMPT.format(script_json=script_json),
            }],
        )
        raw = response.content[0].text
        data = json.loads(raw)
        issues = []
        for item in data.get("issues", []):
            issues.append(ReviewIssue(
                issue_type="fact_error",
                severity="warning",
                segment_index=item.get("segment_index"),
                description=item.get("description", ""),
                suggestion=item.get("suggestion"),
            ))
        logger.info("fact_check_completed", issue_count=len(issues))
        return issues
    except json.JSONDecodeError:
        logger.warning("fact_check_json_parse_failed")
        return []
    except anthropic.APIError as e:
        raise APIError("anthropic", str(e))
