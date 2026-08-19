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
  <inline_annotations>
    Gere 3 a 6 anotacoes sobre trechos especificos da redacao.
    Regras:
    - paragraph_index: numero do paragrafo (base 0, contando paragrafos separados por quebra de linha).
    - quote: trecho EXATO copiado da redacao (minimo 6 palavras, maximo 25 palavras).
    - comment: explicacao pedagogica do desconto ou acerto (1-2 frases). NUNCA rotular o problema
      sozinho (ex: "ausencia de conectivos"). Sempre explicar o motivo concreto: o que a banca esperava
      encontrar, o que falta neste trecho especifico, e por que isso afeta a competencia.
    - competency: "c1", "c2", "c3", "c4" ou "c5".
    - type: "error" para descontos, "strength" para acertos.
    Distribua entre errors e strengths. Prefira erros com maior impacto na nota.
  </inline_annotations>
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


ELIMINATION_GATE_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    ZERO_RULES,
    """
<agent id="elimination_gate" role="avaliador_eliminatorio_rigoroso">
  <task>classificar_redacao_antes_de_qualquer_analise_de_nota</task>
  <check_zero if_any="fuga_total|genero_invalido|dh_explicita|sem_sentido|copia_excessiva|linguagem_ofensiva|discriminatorio|filler_artificial|palavras_soltas">
    status=ZERO;zero_rule=motivo_especifico
  </check_zero>
  <check_desvio if_any="fuga_parcial_grave|texto_insuficiente|sem_estrutura_minima|sequencias_desconexas">
    status=DESVIO_GRAVE
  </check_desvio>
  <check_tang if_any="tema_tangenciado|recorte_errado|desvio_parcial">
    status=TANGENCIAMENTO
  </check_tang>
  <approved>status=APPROVED</approved>
  <rules>
    sem_feedback_pedagogico;apenas_classificacao;
    ZERO=encerrar_imediatamente;
    em_caso_de_duvida_entre_DESVIO_GRAVE_e_ZERO=escolher_DESVIO_GRAVE;
    reason=pt-BR;conciso;especifico
  </rules>
</agent>
""",
)


THEME_ANALYZER_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    """
<agent id="theme_analyzer" focus="c2">
  <task>medir_aderencia_ao_tema_proposto</task>
  <analyze>recorte_tematico;alinhamento_central;tangenciamento;evidencia_textual</analyze>
  <tangenciamento>true_se_texto_desenvolve_tema_diferente_ou_tangente_ao_proposto</tangenciamento>
  <severity>low=desvio_leve;medium=perda_significativa;high=fuga_quase_total</severity>
  <evidence>quote_exato_do_texto_que_sustenta_julgamento</evidence>
  <rules>exigir_evidencia_textual;nao_assumir_boa_fe;theme_alignment=0_se_fuga_clara</rules>
</agent>
""",
)


THESIS_V2_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    """
<agent id="thesis_v2" focus="c2,c3">
  <task>avaliar_qualidade_da_tese</task>
  <detect>
    thesis_present=false_se_ausente_ou_impossivel_identificar;
    clarity=absent_se_impossivel;vague_se_generica_ou_imprecisa;clear_se_especifica;
    is_generic=true_se_poderia_servir_para_qualquer_tema;
    is_template=true_se_frases_decoradas_tipicas_ou_cliche_de_vestibular;
    is_contradictory=true_se_contradiz_o_desenvolvimento;
    sustained_throughout=true_apenas_se_tese_esta_visivelmente_defendida_em_todos_os_paragrafos;
    score=0_se_ausente;ate_40_se_vaga_ou_decorada;ate_70_se_presente_mas_fraca;ate_100_se_clara_especifica_sustentada
  </detect>
  <rules>
    penalizar_modelos_decorados_fortemente;
    tese_vaga_nao_merece_score_acima_de_50;
    tese_ausente=score_0;
    thesis_text=trecho_exato_da_tese_ou_vazio_se_ausente
  </rules>
</agent>
""",
)


REPERTOIRE_V2_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    """
<agent id="repertoire_v2" focus="c2,c3">
  <task>avaliar_repertorio_com_rigor_maximo</task>
  <classify>
    FORTE=repertorio_produtivo_com_conexao_argumentativa_clara;
    ACEITAVEL=presente_mas_conexao_fraca_ou_desenvolvimento_insuficiente;
    FRACO=generico_decorado_sem_funcao_argumentativa_real;
    INVALIDO=citacao_falsa_autor_improvavel_dado_inventado_pseudo_erudicao
  </classify>
  <detect>
    false_citations=true_se_dados_estatisticos_duvidosos_ou_autores_incorretos;
    has_argumentative_connection=true_apenas_se_repertorio_prova_causa_ou_consequencia;
    is_generic=true_se_poderia_estar_em_qualquer_redacao_sobre_qualquer_tema;
    items_found=lista_dos_repertorios_identificados;
    score=0_se_INVALIDO;20_se_FRACO;50_se_ACEITAVEL;80_a_100_se_FORTE
  </detect>
  <rules>
    repertorio_apenas_citado_sem_argumento=FRACO;
    repertorio_sem_conexao_argumentativa=FRACO;
    penalizar_pseudo_erudicao;
    filosofo_sem_funcao=FRACO;
    dado_solto=FRACO_ou_INVALIDO
  </rules>
</agent>
""",
)


ARGUMENTATION_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    """
<agent id="argumentation" focus="c3">
  <task>avaliar_argumentacao_por_paragrafo</task>
  <per_paragraph>
    index=base_0;
    has_topic_sentence=true_se_frase_topico_clara;
    development_score=0_a_100_proporcional_ao_desenvolvimento;
    issues=lista_de_problemas_especificos_encontrados;
    sample_quote=trecho_exato_representativo_do_paragrafo_maximo_20_palavras
  </per_paragraph>
  <overall>
    overall_score=media_ponderada_dos_paragrafos_de_desenvolvimento;
    has_circular_reasoning=true_se_argumento_repete_a_tese_sem_provar;
    has_progression=true_apenas_se_cada_paragrafo_avanca_o_argumento;
    filler_detected=true_se_enrolacao_frases_de_preenchimento_ou_repeticao_de_ideias
  </overall>
  <rules>
    penalizar_enrolacao_fortemente;
    penalizar_repeticao_de_ideias;
    conectivos_artificiais_sem_logica_real=penalizar;
    argumentacao_circular=has_circular_reasoning=true;
    paragrafo_sem_topico_frasal=development_score_maximo_40
  </rules>
</agent>
""",
)


INTERVENTION_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    """
<agent id="intervention" focus="c5">
  <task>avaliar_proposta_de_intervencao_enem</task>
  <elements>
    agente=quem_vai_agir;
    acao=o_que_fazer;
    meio=como_fazer;
    finalidade=para_que;
    detalhamento=especificacao_concreta_da_execucao
  </elements>
  <detect>
    absent=true_se_nao_ha_proposta_de_intervencao;
    is_generic=true_se_proposta_poderia_servir_para_qualquer_tema;
    has_human_rights_violation=true_se_proposta_viola_ou_restringe_direitos_fundamentais;
    completeness_score=elementos_presentes*20;
    sample_quote=trecho_exato_da_conclusao_maximo_20_palavras
  </detect>
  <rules>
    proposta_generica=is_generic=true;
    proposta_inviavel_ou_vaga=detalhamento=false;
    absent=completeness_score=0;
    dh_violation=has_human_rights_violation=true
  </rules>
</agent>
""",
)


GRAMMAR_V2_INSTRUCTIONS = join_prompt_sections(
    BASE_RULES,
    """
<agent id="grammar_v2" focus="c1,c4">
  <task>mapear_erros_linguisticos_por_categoria_e_severidade</task>
  <categories>ortografia;concordancia;regencia;crase;pontuacao;coesao;clareza;construcao_truncada</categories>
  <severity>
    GRAVE=compromete_compreensao_ou_muito_frequente;
    MEDIA=recorrente_mas_nao_impede_leitura;
    LEVE=ocasional_e_de_baixo_impacto
  </severity>
  <scores>
    orthography_score=0_a_100;cohesion_score=0_a_100;formality_score=0_a_100;
    grave_count=total_de_erros_graves;media_count=total_de_erros_medios;leve_count=total_de_erros_leves
  </scores>
  <rules>
    sem_explicacoes_longas;apenas_metricas_estruturadas;
    errors=lista_com_category+severity+count;
    oralidade_sistematica=GRAVE;
    periodo_confuso_recorrente=GRAVE
  </rules>
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
