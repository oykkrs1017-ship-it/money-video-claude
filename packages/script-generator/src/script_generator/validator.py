from script_generator.schema import DebateScript
from shared.logger import get_logger

logger = get_logger(__name__)


def validate_balance(script: DebateScript) -> list[str]:
    """Check that both agents have roughly equal speaking time."""
    warnings = []
    counts = {a.id: 0 for a in script.agents}
    for seg in script.segments:
        if seg.speaker in counts:
            counts[seg.speaker] += 1
    total = sum(counts.values())
    if total == 0:
        return ["No segments found"]
    for agent_id, count in counts.items():
        ratio = count / total
        if ratio < 0.3:
            warnings.append(f"Agent {agent_id} speaks in only {ratio:.0%} of segments")
    return warnings


def validate_emotion_arc(script: DebateScript) -> list[str]:
    """Check that emotion escalates over time."""
    warnings = []
    emotions = [s.emotion for s in script.segments]
    if len(emotions) < 4:
        return warnings
    first_quarter_avg = sum(emotions[: len(emotions) // 4]) / (len(emotions) // 4)
    last_quarter_avg = sum(emotions[-(len(emotions) // 4) :]) / (len(emotions) // 4)
    if last_quarter_avg <= first_quarter_avg:
        warnings.append(
            f"Emotion arc is flat or decreasing (start avg={first_quarter_avg:.1f}, end avg={last_quarter_avg:.1f})"
        )
    return warnings


def validate_script(script: DebateScript) -> list[str]:
    """Run all validations and return list of warning messages."""
    warnings = []
    warnings.extend(validate_balance(script))
    warnings.extend(validate_emotion_arc(script))
    if not script.cliffhanger:
        warnings.append("Cliffhanger is empty")
    if len(script.segments) < 8:
        warnings.append(f"Too few segments: {len(script.segments)} (min 8 recommended)")
    logger.info("validation_completed", warning_count=len(warnings))
    return warnings
