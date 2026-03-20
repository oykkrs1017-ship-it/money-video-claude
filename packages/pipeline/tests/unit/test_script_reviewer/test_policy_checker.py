import pytest
from script_reviewer.policy_checker import check_policy


def test_no_issues():
    segments = [
        {"text": "AIは私たちの生活を大きく変えるでしょう。"},
        {"text": "しかし、人間の創造性はAIには真似できません。"},
    ]
    issues = check_policy(segments)
    assert issues == []


def test_hard_block_detected():
    segments = [
        {"text": "自殺の方法について詳しく説明します。"},
    ]
    issues = check_policy(segments)
    errors = [i for i in issues if i.severity == "error"]
    assert len(errors) > 0


def test_soft_warn_detected():
    segments = [
        {"text": "この方法で絶対に儲かる投資戦略を紹介します。"},
    ]
    issues = check_policy(segments)
    warnings = [i for i in issues if i.severity == "warning"]
    assert len(warnings) > 0
