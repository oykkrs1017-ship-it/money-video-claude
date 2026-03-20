import time
from pytrends.request import TrendReq
from shared.logger import get_logger
from shared.exceptions import APIError

logger = get_logger(__name__)


class GoogleTrendsClient:
    def __init__(self):
        self.pytrends = TrendReq(hl="ja-JP", tz=540)

    def get_trending_topics(self, top_n: int = 20) -> list[dict]:
        """Fetch daily trending searches from Japan."""
        try:
            df = self.pytrends.trending_searches(pn="japan")
            topics = []
            for idx, row in df.head(top_n).iterrows():
                topics.append({
                    "title": row[0],
                    "rank": idx + 1,
                    "source": "google_trends",
                })
            logger.info("google_trends_fetched", count=len(topics))
            return topics
        except Exception as e:
            logger.warning("google_trends_error", error=str(e))
            raise APIError("google_trends", str(e))

    def get_related_queries(self, keyword: str) -> list[str]:
        """Get related queries for a keyword."""
        try:
            self.pytrends.build_payload([keyword], geo="JP", timeframe="now 7-d")
            time.sleep(1)
            related = self.pytrends.related_queries()
            if keyword in related and related[keyword]["top"] is not None:
                return related[keyword]["top"]["query"].tolist()[:5]
            return []
        except Exception as e:
            logger.warning("related_queries_error", keyword=keyword, error=str(e))
            return []
