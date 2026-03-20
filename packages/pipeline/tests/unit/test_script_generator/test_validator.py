import pytest
from script_generator.schema import DebateScript, AgentProfile, ScriptSegment, CTAConfig
from script_generator.validator import validate_balance, validate_emotion_arc


def make_script(segments_data: list[dict]) -> DebateScript:
    return DebateScript(
        title="Test",
        topic="Test topic",
        agents=[
            AgentProfile(id="agent_a", name="AXIS", position="賛成"),
            AgentProfile(id="agent_b", name="LYRA", position="反対"),
        ],
        segments=[ScriptSegment(**s) for s in segments_data],
        cliffhanger="Test cliffhanger",
        cta=CTAConfig(text="Test CTA", line_url="https://line.me/test"),
    )


def test_validate_balance_equal():
    script = make_script([
        {"speaker": "agent_a", "text": "A", "emotion": 50},
        {"speaker": "agent_b", "text": "B", "emotion": 50},
        {"speaker": "agent_a", "text": "C", "emotion": 50},
        {"speaker": "agent_b", "text": "D", "emotion": 50},
    ])
    warnings = validate_balance(script)
    assert warnings == []


def test_validate_balance_imbalanced():
    script = make_script([
        {"speaker": "agent_a", "text": "A", "emotion": 50},
        {"speaker": "agent_a", "text": "B", "emotion": 50},
        {"speaker": "agent_a", "text": "C", "emotion": 50},
        {"speaker": "agent_b", "text": "D", "emotion": 50},
    ])
    warnings = validate_balance(script)
    assert len(warnings) > 0


def test_validate_emotion_arc_increasing():
    script = make_script([
        {"speaker": "agent_a", "text": "A", "emotion": 20},
        {"speaker": "agent_b", "text": "B", "emotion": 30},
        {"speaker": "agent_a", "text": "C", "emotion": 70},
        {"speaker": "agent_b", "text": "D", "emotion": 90},
    ])
    warnings = validate_emotion_arc(script)
    assert warnings == []


def test_validate_emotion_arc_flat():
    script = make_script([
        {"speaker": "agent_a", "text": "A", "emotion": 80},
        {"speaker": "agent_b", "text": "B", "emotion": 80},
        {"speaker": "agent_a", "text": "C", "emotion": 30},
        {"speaker": "agent_b", "text": "D", "emotion": 20},
    ])
    warnings = validate_emotion_arc(script)
    assert len(warnings) > 0
