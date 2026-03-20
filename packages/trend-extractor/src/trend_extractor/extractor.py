from shared.logger import get_logger
from shared.exceptions import PipelineError
from trend_extractor.google_trends import GoogleTrendsClient
from trend_extractor.news_aggregator import NewsAggregator
from trend_extractor.topic_scorer import (
    score_topics_from_trends,
    score_topics_from_news,
    get_top_candidates,
)
from trend_extractor.models import TopicCandidate

logger = get_logger(__name__)


class TrendExtractor:
    def __init__(self, news_api_key: str | None = None):
        self.trends_client = GoogleTrendsClient()
        self.news_aggregator = NewsAggregator(api_key=news_api_key)

    def extract(self, top_n: int = 5) -> list[TopicCandidate]:
        """Extract and score top debate topics from trends and news."""
        logger.info("trend_extraction_started", top_n=top_n)

        trend_raw = []
        try:
            trend_raw = self.trends_client.get_trending_topics(top_n=30)
        except Exception as e:
            logger.warning("google_trends_skipped", reason=str(e))

        news_raw = []
        try:
            news_raw = self.news_aggregator.get_all_headlines()
        except Exception as e:
            logger.warning("news_api_skipped", reason=str(e))

        if not trend_raw and not news_raw:
            raise PipelineError("Both trend sources returned no data.")

        trend_candidates = score_topics_from_trends(trend_raw)
        news_candidates = score_topics_from_news(news_raw)
        top = get_top_candidates(trend_candidates, news_candidates, top_n=top_n)

        logger.info("trend_extraction_completed", count=len(top))
        return top
