"""
YouTube コミュニティガイドライン準拠チェック（ローカルルールベース）
"""
import re
from script_reviewer.models import ReviewIssue

# 即座にNGとなるキーワードパターン
HARD_BLOCK_PATTERNS = [
    r"自殺|自傷|自害",
    r"テロ|爆弾の作り方",
    r"児童ポルノ|未成年.{0,5}性",
    r"ヘイトスピーチ|民族.{0,5}劣等",
]

# 警告が必要なパターン
SOFT_WARN_PATTERNS = [
    r"絶対に儲かる|確実に稼げる",
    r"医師に相談せず.*治る",
    r"投資必勝法|株で確実",
]


def check_policy(segments: list[dict]) -> list[ReviewIssue]:
    issues = []
    for idx, seg in enumerate(segments):
        text = seg.get("text", "")
        for pattern in HARD_BLOCK_PATTERNS:
            if re.search(pattern, text):
                issues.append(ReviewIssue(
                    issue_type="policy_violation",
                    severity="error",
                    segment_index=idx,
                    description=f"ハードブロックパターン検出: {pattern}",
                    suggestion="該当箇所を削除または表現を変更してください",
                ))
        for pattern in SOFT_WARN_PATTERNS:
            if re.search(pattern, text):
                issues.append(ReviewIssue(
                    issue_type="policy_violation",
                    severity="warning",
                    segment_index=idx,
                    description=f"要注意パターン検出: {pattern}",
                    suggestion="表現を柔らかくすることを推奨します",
                ))
    return issues
