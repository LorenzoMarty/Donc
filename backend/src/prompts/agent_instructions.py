from __future__ import annotations

from src.prompts.core import BASE_RULES, FEEDBACK_RULES, SKILL_MAP, join_prompt_sections
from src.prompts.scoring_rules import SCORING_METHOD, SCORING_RULES
from src.prompts.zero_rules import ZERO_RULES


AGENT_GUARDRAILS = BASE_RULES
ENEM_ZERO_RULES = ZERO_RULES
ENEM_CORRECTION_RUBRIC = SCORING_RULES
ENEM_CORRECTION_METHOD = SCORING_METHOD

CORRECTION_GUARDRAILS = join_prompt_sections(
    BASE_RULES,
    ZERO_RULES,
    SCORING_RULES,
    SCORING_METHOD,
    FEEDBACK_RULES,
)


THESIS_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    """
<agent id="thesis" focus="c2,c3">
  <analyze>tese;recorte;posicionamento;eixos;coerencia_intro_desenvolvimento</analyze>
  <risk>tese_generica;fuga_parcial;contradicao;promessa_nao_cumprida</risk>
  <fix>tese_clara;2_eixos;causa_consequencia;recorte_tematico</fix>
</agent>
""",
)


GRAMMAR_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    """
<agent id="grammar" focus="c1,c4">
  <analyze>ortografia;pontuacao;concordancia;regencia;formalidade;coesao;conectivos</analyze>
  <severity>freq+impacto_compreensao</severity>
  <risk>oralidade;periodo_confuso;repeticao_lexical;conectivo_sem_funcao;frase_soltas</risk>
  <fix>revisar_norma;simplificar_periodos;variar_conectivos;retomada_referencial</fix>
</agent>
""",
)


REPERTOIRE_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    """
<agent id="repertoire" focus="c2,c3">
  <analyze>repertorio_legitimo;pertinencia;produtividade;ponte_com_tese</analyze>
  <risk>citacao_decorada;dado_solto;filosofo_sem_funcao;conexao_fraca</risk>
  <fix>ligar_repertorio_a_causa/consequencia;explicar_impacto_social</fix>
</agent>
""",
)


ENEM_COMPETENCY_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    ZERO_RULES,
    SCORING_RULES,
    SCORING_METHOD,
    """
<agent id="competency">
  <score>c1..c5;0..200;preferir_niveis_oficiais</score>
  <justify>criterio+evidencia_textual+impacto</justify>
  <stability>nao_compensar_competencias;manter_coerencia_c2_c3_c4_c5</stability>
  <weak>listar_chaves_abaixo_160</weak>
</agent>
""",
)


ESSAY_CONSOLIDATION_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    FEEDBACK_RULES,
    """
<agent id="consolidation">
  <rules>total=sum(c1..c5);corrigir_so_inconsistencia_com_evidencia</rules>
  <rank>c3;c4;c5;c1_recorrente</rank>
  <out>strengths_concretos;errors=impacto;suggestions=acao;feedback=foco</out>
</agent>
""",
)


EXERCISE_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    SKILL_MAP,
    """
<agent id="exercise">
  <task>quiz_enem_personalizado</task>
  <quality>situacao_real;1_habilidade_por_questao;alternativas_plausiveis;explicacao_curta</quality>
  <avoid>pergunta_generica;pegadinha_sem_pedagogia;feedback_longo</avoid>
</agent>
""",
)


ANALYTICS_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    SKILL_MAP,
    """
<agent id="analytics">
  <task>diagnostico_evolucao</task>
  <find>padroes_recorrentes;competencias_limitantes;proximo_foco</find>
  <rank>maior_impacto_na_nota;recorrencia;facilidade_de_treino</rank>
</agent>
""",
)


STUDY_PLANNER_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    SKILL_MAP,
    """
<agent id="study_planner">
  <task>recomendacao/plano</task>
  <plan>curto;progressivo;verificavel;integrar_tese_argumento_coesao_repertorio_intervencao</plan>
  <rank>competencias_fracas;padroes_recorrentes;tempo_disponivel</rank>
</agent>
""",
)


PROMPT_BUDGETS = {
    "thesis": len(THESIS_INSTRUCTIONS),
    "grammar": len(GRAMMAR_INSTRUCTIONS),
    "repertoire": len(REPERTOIRE_INSTRUCTIONS),
    "competency": len(ENEM_COMPETENCY_INSTRUCTIONS),
    "consolidation": len(ESSAY_CONSOLIDATION_INSTRUCTIONS),
    "exercise": len(EXERCISE_INSTRUCTIONS),
    "analytics": len(ANALYTICS_INSTRUCTIONS),
    "study_planner": len(STUDY_PLANNER_INSTRUCTIONS),
}
