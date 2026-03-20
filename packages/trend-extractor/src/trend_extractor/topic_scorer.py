import re
from shared.logger import get_logger
from trend_extractor.models import TopicCandidate

logger = get_logger(__name__)

# キーワードで議論性をスコアリング
DEBATE_KEYWORDS = [
    "AI", "人工知能", "テクノロジー", "雇用", "経済", "環境", "格差",
    "規制", "倫理", "医療", "教育", "未来", "リスク", "投資", "社会",
    "変化", "影響", "問題", "解決", "革命", "破壊", "創造",
]

NEGATIVE_KEYWORDS = [
    "死亡", "事故", "犯罪", "暴力", "差別", "ハラスメント",
]


def _debate_score(text: str) -> float:
    """Score how debate-worthy a topic is (0.0-1.0)."""
    text_lower = text.lower()
    positive_hits = sum(1 for kw in DEBATE_KEYWORDS if kw in text)
    negative_hits = sum(1 for kw in NEGATIVE_KEYWORDS if kw in text)
    base = min(positive_hits / 5.0, 1.0)
    penalty = negative_hits * 0.3
    return max(0.0, min(1.0, base - penalty))


def score_topics_from_trends(raw_trends: list[dict]) -> list[TopicCandidate]:
    candidates = []
    for item in raw_trends:
        title = item.get("title", "")
        score = _debate_score(title)
        if score < 0.1:
            continue
        candidates.append(TopicCandidate(
            title=title,
            description=f"Googleトレンド上位（順位 {item.get('rank', '?')}）",
            category="general",
            score=score,
            source="google_trends",
            keywords=item.get("related", []),
        ))
    return candidates


def score_topics_from_news(articles: list[dict]) -> list[TopicCandidate]:
    candidates = []
    for article in articles:
        title = article.get("title") or ""
        description = article.get("description") or ""
        combined = f"{title} {description}"
        score = _debate_score(combined)
        if score < 0.15:
            continue
        candidates.append(TopicCandidate(
            title=title,
            description=description[:200],
            category=article.get("source", {}).get("name", "news"),
            score=score,
            source="news_api",
            keywords=[],
        ))
    return candidates


def get_top_candidates(
    trend_candidates: list[TopicCandidate],
    news_candidates: list[TopicCandidate],
    top_n: int = 5,
) -> list[TopicCandidate]:
    all_candidates = trend_candidates + news_candidates
    unique = {c.title: c for c in all_candidates}.values()
    sorted_candidates = sorted(unique, key=lambda c: c.score, reverse=True)
    top = list(sorted_candidates)[:top_n]
    logger.info("top_candidates_selected", count=len(top), titles=[c.title for c in top])
    return top
