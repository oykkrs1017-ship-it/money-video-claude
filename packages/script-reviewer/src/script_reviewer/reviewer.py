import json
from shared.logger import get_logger
from shared.exceptions import MaxRetriesExceededError, PolicyViolationError
from script_reviewer.models import ReviewResult, ReviewIssue
from script_reviewer.policy_checker import check_policy
from script_reviewer.fact_checker import check_facts
from script_reviewer.claude_reviewer import review_quality
from script_reviewer.feedback_loop import apply_corrections, MAX_LOOPS

logger = get_logger(__name__)

QUALITY_PASS_THRESHOLD = 70


class ScriptReviewer:
    def __init__(self, anthropic_api_key: str | None = None, gemini_api_key: str | None = None):
        self.anthropic_key = anthropic_api_key
        self.gemini_key = gemini_api_key

    def review(self, script_json: str) -> ReviewResult:
        """
        Run full review pipeline with self-correction loop.
        Returns ReviewResult with passed=True and corrected_script_json if successful.
        """
        current_json = script_json
        all_issues: list[ReviewIssue] = []

        for loop_num in range(1, MAX_LOOPS + 1):
            logger.info("review_loop_started", loop=loop_num, max=MAX_LOOPS)

            try:
                script_data = json.loads(current_json)
            except json.JSONDecodeError as e:
                return ReviewResult(passed=False, issues=[
                    ReviewIssue(
                        issue_type="quality",
                        severity="error",
                        description=f"Invalid JSON: {e}",
                    )
                ], review_count=loop_num)

            # 1. Policy check (local, fast)
            policy_issues = check_policy(script_data.get("segments", []))
            hard_errors = [i for i in policy_issues if i.severity == "error"]
            if hard_errors:
                logger.error("policy_hard_block", issues=[i.description for i in hard_errors])
                raise PolicyViolationError(
                    f"Script contains hard-blocked content: {hard_errors[0].description}"
                )

            # 2. Fact check (Claude API)
            fact_issues = check_facts(current_json, api_key=self.anthropic_key)

            # 3. Quality review (Claude API)
            quality_score, quality_issues = review_quality(current_json, api_key=self.anthropic_key)

            loop_issues = policy_issues + fact_issues + quality_issues
            all_issues = loop_issues

            error_issues = [i for i in loop_issues if i.severity == "error"]
            needs_correction = error_issues or quality_score < QUALITY_PASS_THRESHOLD

            if not needs_correction:
                logger.info("review_passed", loop=loop_num, quality_score=quality_score)
                return ReviewResult(
                    passed=True,
                    issues=loop_issues,
                    corrected_script_json=current_json,
                    review_count=loop_num,
                )

            # Apply corrections if more loops remain
            if loop_num < MAX_LOOPS:
                correction_issues = error_issues or [i for i in loop_issues if i.severity == "warning"]
                logger.info("applying_corrections", issue_count=len(correction_issues), loop=loop_num)
                current_json = apply_corrections(
                    current_json,
                    correction_issues,
                    api_key=self.gemini_key,
                )
            else:
                logger.warning("max_loops_reached", loop=loop_num, quality_score=quality_score)
                raise MaxRetriesExceededError(
                    f"Script did not pass review after {MAX_LOOPS} attempts. "
                    f"Last quality score: {quality_score}"
                )

        # Unreachable, but for type safety
        return ReviewResult(passed=False, issues=all_issues, review_count=MAX_LOOPS)
