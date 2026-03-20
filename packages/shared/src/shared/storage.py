import json
from pathlib import Path
from typing import Any
from shared.logger import get_logger

logger = get_logger(__name__)


class Storage:
    """Simple file-based storage abstraction."""

    def __init__(self, base_dir: str | Path = "./data"):
        self.base_dir = Path(base_dir)
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        for subdir in ["scripts", "audio", "renders", "thumbnails"]:
            (self.base_dir / subdir).mkdir(parents=True, exist_ok=True)

    def save_json(self, data: dict[str, Any], subdir: str, filename: str) -> Path:
        path = self.base_dir / subdir / filename
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("saved_json", path=str(path))
        return path

    def load_json(self, subdir: str, filename: str) -> dict[str, Any]:
        path = self.base_dir / subdir / filename
        return json.loads(path.read_text(encoding="utf-8"))

    def get_path(self, subdir: str, filename: str) -> Path:
        return self.base_dir / subdir / filename
