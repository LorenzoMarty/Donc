from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


DifficultyLevel = Literal["easy", "medium", "hard"]


class ThesisAnalysis(BaseModel):
    thesis_present: bool
    thesis: str
    clarity_score: int = Field(ge=0, le=100)
    argument_strength: int = Field(ge=0, le=100)
    issues: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)


class GrammarAnalysis(BaseModel):
    grammar_score: int = Field(ge=0, le=100)
    cohesion_score: int = Field(ge=0, le=100)
    formality_score: int = Field(ge=0, le=100)
    repeated_terms: list[str] = Field(default_factory=list)
    mistakes: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class RepertoireAnalysis(BaseModel):
    repertoire_score: int = Field(ge=0, le=100)
    repertories_found: list[str] = Field(default_factory=list)
    weak_connections: list[str] = Field(default_factory=list)
    suggested_repertories: list[str] = Field(default_factory=list)
    sociocultural_links: list[str] = Field(default_factory=list)


class ENEMCompetencyAnalysis(BaseModel):
    c1: int = Field(ge=0, le=200, description="Competencia I: dominio da modalidade escrita formal.")
    c2: int = Field(ge=0, le=200, description="Competencia II: compreensao do tema e genero dissertativo-argumentativo.")
    c3: int = Field(ge=0, le=200, description="Competencia III: organizacao de argumentos em defesa de ponto de vista.")
    c4: int = Field(ge=0, le=200, description="Competencia IV: mecanismos linguisticos de coesao e argumentacao.")
    c5: int = Field(ge=0, le=200, description="Competencia V: proposta de intervencao completa e respeitosa aos direitos humanos.")
    justifications: dict[str, str] = Field(default_factory=dict, description="Justificativas curtas por chave c1, c2, c3, c4 e c5.")
    pedagogical_feedback: list[str] = Field(default_factory=list, description="Orientacoes praticas para elevar as competencias mais fracas.")
    weak_competencies: list[str] = Field(default_factory=list, description="Competencias abaixo de 160, usando chaves c1, c2, c3, c4 e c5.")


class InlineAnnotation(BaseModel):
    paragraph_index: int = Field(ge=0, description="Indice do paragrafo (base 0).")
    quote: str = Field(min_length=4, description="Trecho exato do texto do aluno.")
    comment: str = Field(min_length=10, description="Explicacao pedagogica do desconto ou acerto.")
    competency: str = Field(description="Competencia relacionada: c1, c2, c3, c4 ou c5.")
    type: Literal["error", "strength"] = Field(description="Tipo: erro ou ponto positivo.")


class EssayCorrectionResult(BaseModel):
    total_score: int = Field(ge=0, le=1000, description="Soma exata das cinco competencias.")
    competency_1: int = Field(ge=0, le=200, description="Nota da Competencia I.")
    competency_2: int = Field(ge=0, le=200, description="Nota da Competencia II.")
    competency_3: int = Field(ge=0, le=200, description="Nota da Competencia III.")
    competency_4: int = Field(ge=0, le=200, description="Nota da Competencia IV.")
    competency_5: int = Field(ge=0, le=200, description="Nota da Competencia V.")
    strengths: list[str] = Field(min_length=1, description="Acertos concretos ligados a competencias.")
    errors: list[str] = Field(min_length=1, description="Problemas que derrubam nota, com criterio ENEM claro.")
    suggestions: list[str] = Field(min_length=1, description="Acoes de reescrita ou treino conectadas aos erros.")
    feedback: str = Field(min_length=20, description="Sintese pedagogica objetiva com proximo foco de melhoria.")
    recurrent_patterns: list[str] = Field(default_factory=list, description="Padroes recorrentes para memoria e plano de estudos.")
    inline_annotations: list[InlineAnnotation] = Field(default_factory=list, description="Anotacoes inline sobre trechos especificos da redacao.")


class GeneratedQuizQuestion(BaseModel):
    statement: str = Field(min_length=20, max_length=900)
    options: list[str] = Field(min_length=5, max_length=5)
    correct_answer: Literal["A", "B", "C", "D", "E"]
    explanation: str = Field(min_length=20)
    skill: str = Field(min_length=3)
    difficulty: DifficultyLevel


class ExerciseGenerationResult(BaseModel):
    focus: str
    difficulty: DifficultyLevel
    questions: list[GeneratedQuizQuestion] = Field(min_length=1)
    adaptation_reason: str


class AnalyticsResult(BaseModel):
    summary: str
    estimated_level: str
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    recurrent_patterns: list[str] = Field(default_factory=list)
    next_focuses: list[str] = Field(default_factory=list)


class RecommendationResult(BaseModel):
    lessons: list[str] = Field(default_factory=list)
    games: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    difficulty: DifficultyLevel
    rationale: str


class StudyPlanDay(BaseModel):
    day: int = Field(ge=1)
    focus: str
    activities: list[str] = Field(min_length=1)
    minutes: int = Field(ge=10, le=180)
    expected_outcome: str


class StudyPlanResult(BaseModel):
    horizon_days: int = Field(ge=1, le=30)
    weekly_goal: str
    days: list[StudyPlanDay] = Field(min_length=1)
    review_strategy: str
