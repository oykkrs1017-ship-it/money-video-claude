import httpx
import os
from shared.logger import get_logger
from shared.exceptions import APIError

logger = get_logger(__name__)

NEWS_API_URL = "https://newsapi.org/v2/top-headlines"
DEBATE_CATEGORIES = ["business", "technology", "science", "health"]


class NewsAggregator:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("NEWS_API_KEY", "")

    def fetch_headlines(self, category: str, country: str = "jp", page_size: int = 10) -> list[dict]:
        """Fetch top headlines for a category."""
        if not self.api_key:
            logger.warning("news_api_key_missing", category=category)
            return []
        try:
            resp = httpx.get(
                NEWS_API_URL,
                params={
                    "apiKey": self.api_key,
                    "country": country,
                    "category": category,
                    "pageSize": page_size,
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            articles = resp.json().get("articles", [])
            logger.info("news_fetched", category=category, count=len(articles))
            return articles
        except httpx.HTTPStatusError as e:
            raise APIError("news_api", str(e), e.response.status_code)
        except Exception as e:
            logger.warning("news_api_error", error=str(e))
            return []

    def get_all_headlines(self) -> list[dict]:
        """Fetch headlines across all debate-relevant categories."""
        all_articles = []
        for cat in DEBATE_CATEGORIES:
            all_articles.extend(self.fetch_headlines(cat))
        return all_articles
