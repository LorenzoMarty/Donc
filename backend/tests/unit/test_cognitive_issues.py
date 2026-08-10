"""Testes unitarios puros da maquina de estado de CognitiveIssue (sem app/DB)."""

from __future__ import annotations

import pytest

from src.memory.cognitive_issues import (
    ISSUE_CODES,
    apply_cognitive_signal,
)

pytestmark = pytest.mark.unit


def test_negative_signal_creates_issue_as_detected():
    issues = apply_cognitive_signal({}, "WEAK_THESIS", "negative")
    assert issues["WEAK_THESIS"]["state"] == "DETECTED"
    assert issues["WEAK_THESIS"]["negative_count"] == 1


def test_repeated_negative_signal_stays_detected():
    issues = apply_cognitive_signal({}, "WEAK_THESIS", "negative")
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "negative")
    assert issues["WEAK_THESIS"]["state"] == "DETECTED"
    assert issues["WEAK_THESIS"]["negative_count"] == 2


def test_positive_signal_after_detected_moves_to_training():
    issues = apply_cognitive_signal({}, "WEAK_THESIS", "negative")
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive")
    assert issues["WEAK_THESIS"]["state"] == "TRAINING"


def test_positive_signal_after_training_moves_to_improving():
    issues = apply_cognitive_signal({}, "WEAK_THESIS", "negative")
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive")
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive")
    assert issues["WEAK_THESIS"]["state"] == "IMPROVING"
    assert issues["WEAK_THESIS"]["positive_streak"] == 1


def test_three_consecutive_positive_signals_while_improving_masters_issue():
    issues = apply_cognitive_signal({}, "WEAK_THESIS", "negative")
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive")  # DETECTED -> TRAINING
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive")  # TRAINING -> IMPROVING (streak 1)
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive")  # streak 2
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive")  # streak 3 -> MASTERED
    assert issues["WEAK_THESIS"]["state"] == "MASTERED"


def test_negative_signal_while_improving_regresses_to_training():
    issues = apply_cognitive_signal({}, "WEAK_THESIS", "negative")
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive")
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive")  # IMPROVING
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "negative")
    assert issues["WEAK_THESIS"]["state"] == "TRAINING"
    assert issues["WEAK_THESIS"]["positive_streak"] == 0


def test_negative_signal_while_mastered_relapses_to_training():
    issues = apply_cognitive_signal({}, "WEAK_THESIS", "negative")
    for _ in range(4):
        issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive")
    assert issues["WEAK_THESIS"]["state"] == "MASTERED"
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "negative")
    assert issues["WEAK_THESIS"]["state"] == "TRAINING"


def test_unknown_issue_code_rejected():
    with pytest.raises(ValueError):
        apply_cognitive_signal({}, "NOT_A_REAL_ISSUE", "negative")


def test_weight_defaults_to_one_and_preserves_legacy_behavior():
    issues = apply_cognitive_signal({}, "WEAK_THESIS", "negative")
    assert issues["WEAK_THESIS"]["negative_count"] == 1
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "negative", weight=1)
    assert issues["WEAK_THESIS"]["negative_count"] == 2


def test_negative_count_accumulates_by_weight():
    issues = apply_cognitive_signal({}, "WEAK_THESIS", "negative", weight=2)
    assert issues["WEAK_THESIS"]["negative_count"] == 2


def test_heavier_positive_evidence_masters_issue_in_fewer_calls():
    issues = apply_cognitive_signal({}, "WEAK_THESIS", "negative")
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive", weight=2)  # DETECTED -> TRAINING
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive", weight=2)  # TRAINING -> IMPROVING, streak=2
    assert issues["WEAK_THESIS"]["state"] == "IMPROVING"
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive", weight=2)  # streak=4 -> MASTERED
    assert issues["WEAK_THESIS"]["state"] == "MASTERED"


def test_single_heavy_positive_evidence_never_masters_alone_from_improving():
    issues = apply_cognitive_signal({}, "WEAK_THESIS", "negative")
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive", weight=2)  # DETECTED -> TRAINING
    issues = apply_cognitive_signal(issues, "WEAK_THESIS", "positive", weight=2)  # TRAINING -> IMPROVING, streak=2
    assert issues["WEAK_THESIS"]["state"] == "IMPROVING"
    assert issues["WEAK_THESIS"]["positive_streak"] == 2


def test_all_seven_issue_codes_are_stable_identifiers():
    assert ISSUE_CODES == {
        "TEXT_ROBOTIC",
        "REPETITIVE_IDEAS",
        "WEAK_REPERTOIRE",
        "SHALLOW_ARGUMENTATION",
        "WEAK_THESIS",
        "C3_LOW",
        "FORMULAIC_CONCLUSION",
    }
