import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "")

    # Pipeline
    MAX_REVIEW_LOOPS: int = int(os.getenv("MAX_REVIEW_LOOPS", "3"))
    OUTPUT_DIR: Path = Path(os.getenv("OUTPUT_DIR", "./data"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # VOICEVOX
    VOICEVOX_URL: str = os.getenv("VOICEVOX_URL", "http://localhost:50021")

    # YouTube
    YOUTUBE_CLIENT_ID: str = os.getenv("YOUTUBE_CLIENT_ID", "")
    YOUTUBE_CLIENT_SECRET: str = os.getenv("YOUTUBE_CLIENT_SECRET", "")
    YOUTUBE_REFRESH_TOKEN: str = os.getenv("YOUTUBE_REFRESH_TOKEN", "")

    # LINE
    LINE_OA_URL: str = os.getenv("LINE_OA_URL", "https://line.me/R/ti/p/@example")

    @classmethod
    def validate(cls) -> list[str]:
        """Return list of missing required config keys."""
        missing = []
        if not cls.GEMINI_API_KEY:
            missing.append("GEMINI_API_KEY")
        if not cls.ANTHROPIC_API_KEY:
            missing.append("ANTHROPIC_API_KEY")
        return missing
