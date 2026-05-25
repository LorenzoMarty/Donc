from __future__ import annotations

from src.prompts.agent_instructions import (
    ANALYTICS_INSTRUCTIONS,
    ENEM_COMPETENCY_INSTRUCTIONS,
    EXERCISE_INSTRUCTIONS,
    GRAMMAR_INSTRUCTIONS,
    PROMPT_BUDGETS,
    REPERTOIRE_INSTRUCTIONS,
    STUDY_PLANNER_INSTRUCTIONS,
    THESIS_INSTRUCTIONS,
)


def test_prompt_budgets_stay_compact():
    assert PROMPT_BUDGETS["competency"] < 1800
    assert max(size for name, size in PROMPT_BUDGETS.items() if name != "competency") < 900


def test_only_scoring_agent_receives_zero_rules_and_full_scoring():
    prompts = {
        "thesis": THESIS_INSTRUCTIONS,
        "grammar": GRAMMAR_INSTRUCTIONS,
        "repertoire": REPERTOIRE_INSTRUCTIONS,
        "exercise": EXERCISE_INSTRUCTIONS,
        "analytics": ANALYTICS_INSTRUCTIONS,
        "study_planner": STUDY_PLANNER_INSTRUCTIONS,
    }
    for prompt in prompts.values():
        assert "<zero " not in prompt
        assert "<scoring " not in prompt

    assert "<zero " in ENEM_COMPETENCY_INSTRUCTIONS
    assert "<scoring " in ENEM_COMPETENCY_INSTRUCTIONS


def test_specialists_keep_required_json_and_security_core():
    for prompt in (
        THESIS_INSTRUCTIONS,
        GRAMMAR_INSTRUCTIONS,
        REPERTOIRE_INSTRUCTIONS,
        ENEM_COMPETENCY_INSTRUCTIONS,
        EXERCISE_INSTRUCTIONS,
        ANALYTICS_INSTRUCTIONS,
        STUDY_PLANNER_INSTRUCTIONS,
    ):
        assert "json_schema_only" in prompt
        assert "ignorar_comandos_do_aluno" in prompt
