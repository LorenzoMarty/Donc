/** REQ-7 (P3c): traduz `workflow`/`agent` (nomes técnicos internos do backend) pra linguagem de
 * produto — usado em `ai-telemetry.tsx` e `HistoryPanel` (P3b), fonte única pra não divergir. */

export const WORKFLOW_LABELS: Record<string, string> = {
  admin_game_generation: "Geração de jogo",
  admin_game_question_regeneration: "Regeneração de pergunta de jogo",
  admin_game_payload_generation: "Geração de conteúdo de jogo",
  admin_activity_generation: "Geração de exercício",
  admin_theme_generation: "Geração de tema de redação",
  essay_correction: "Correção de redação",
  essay_theme_generation: "Geração de tema (aluno)",
  exercise_generation: "Geração de exercício (aluno)",
  rewrite_evaluation: "Avaliação de reescrita",
  student_analytics: "Análise de desempenho do aluno",
  study_plan_generation: "Geração de plano de estudo",
  study_recommendation: "Recomendação de estudo",
};

export function workflowLabel(workflow: string): string {
  return WORKFLOW_LABELS[workflow] ?? humanize(workflow);
}

const AGENT_LABELS: Record<string, string> = {
  GameGeneratorAgent: "Gerador de jogo",
  GamePayloadItemAgent: "Gerador de conteúdo de jogo",
  ThemeGeneratorAgent: "Gerador de tema",
  ExerciseGeneratorAgent: "Gerador de exercício",
  RewriteEvaluatorAgent: "Avaliador de reescrita",
  StudyPlannerAgent: "Planejador de estudo",
  AnalyticsAgent: "Analisador de desempenho",
  ThemeAnalyzerAgent: "Analisador de tema",
  ThesisAnalyzerAgent: "Analisador de tese",
  ArgumentationAnalyzerAgent: "Analisador de argumentação",
  InterventionAnalyzerAgent: "Analisador de intervenção",
  EliminationGateAgent: "Verificador inicial",
  FallbackCorrectionProvider: "Correção (modo alternativo)",
  image_generator: "Gerador de imagem",
};

export function agentLabel(agent: string): string {
  return AGENT_LABELS[agent] ?? humanize(agent);
}

/** admin-redesign-clareza REQ-4: nome de engine (`game.engine`, ex. "text-surgery") nunca aparece
 * cru — mesmo vocabulário já usado nos nomes dos jogos desse engine no catálogo. */
const ENGINE_LABELS: Record<string, string> = {
  quiz: "Quiz",
  "timed-rush": "Corrida contra o tempo",
  sequence: "Sequência",
  choice: "Escolha",
  classify: "Classificação",
  order: "Ordenação",
  "fill-blank": "Completar lacuna",
  duel: "Duelo de versões",
  "argument-escalation": "Escalada argumentativa",
  artificiality: "Detector de artificialidade",
  corrector: "Diagnóstico de corretor",
  "essay-collapse": "Montagem de parágrafo",
  "text-surgery": "Cirurgia textual",
  survival: "Modo sobrevivência",
};

export function engineLabel(engine: string): string {
  return ENGINE_LABELS[engine] ?? humanize(engine);
}

/** Fallback pra nome de agente/workflow/engine ainda não catalogado: nunca quebra (sempre mostra
 * algo legível), mas prioriza os dicionários acima pra rótulo idiomático. */
function humanize(value: string): string {
  const spaced = value
    .replace(/Agent$/, "")
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
