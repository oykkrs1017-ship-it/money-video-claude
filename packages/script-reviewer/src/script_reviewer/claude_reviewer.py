"""
Claude API を使用した総合的な台本品質レビュー
"""
import json
import anthropic
import os
from shared.logger import get_logger
from shared.exceptions import APIError
from script_reviewer.models import ReviewIssue

logger = get_logger(__name__)

REVIEW_PROMPT = """
以下のYouTube AIディベート台本を品質レビューしてください。

評価基準:
1. **視聴維持率**: 冒頭30秒で視聴者を引きつけるフックがあるか
2. **感情の弧**: emotion値が序盤→終盤で自然に上昇しているか
3. **会話の自然さ**: 相互作用が自然か、ただの交互朗読になっていないか
4. **クリフハンガーの強度**: 視聴者が続きを見たくなる未解決感があるか
5. **CTA明瞭さ**: LINE誘導の呼びかけが自然で押しつけがましくないか

出力形式（JSONのみ）:
{
  "quality_score": 0-100,
  "issues": [
    {
      "segment_index": null | 整数,
      "description": "問題の説明",
      "suggestion": "改善案"
    }
  ],
  "overall_feedback": "全体評価コメント"
}

台本:
{script_json}
"""


def review_quality(script_json: str, api_key: str | None = None) -> tuple[int, list[ReviewIssue]]:
    """Returns (quality_score, issues)."""
    key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        logger.warning("anthropic_key_missing_skipping_quality_review")
        return 70, []

    client = anthropic.Anthropic(api_key=key)
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": REVIEW_PROMPT.format(script_json=script_json),
            }],
        )
        raw = response.content[0].text
        data = json.loads(raw)
        score = data.get("quality_score", 70)
        issues = []
        for item in data.get("issues", []):
            issues.append(ReviewIssue(
                issue_type="quality",
                severity="warning",
                segment_index=item.get("segment_index"),
                description=item.get("description", ""),
                suggestion=item.get("suggestion"),
            ))
        logger.info(
            "quality_review_completed",
            score=score,
            issue_count=len(issues),
            feedback=data.get("overall_feedback", ""),
        )
        return score, issues
    except json.JSONDecodeError:
        logger.warning("quality_review_json_parse_failed")
        return 70, []
    except anthropic.APIError as e:
        raise APIError("anthropic", str(e))
