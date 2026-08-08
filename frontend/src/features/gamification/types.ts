import type { LucideIcon } from "lucide-react";

export type GameCategoryId =
  | "estrutura"
  | "coesao"
  | "argumentacao"
  | "repertorio"
  | "gramatica"
  | "competencias-enem"
  | "desafios-diarios";

export type GameDifficulty = "Essencial" | "Intermediario" | "Avancado";

export type GameEngine =
  | "quiz"
  | "choice"
  | "sequence"
  | "timed-rush"
  | "classify"
  | "order"
  | "fill-blank"
  | "text-surgery"
  | "essay-collapse"
  | "artificiality"
  | "argument-escalation"
  | "duel"
  | "corrector"
  | "survival";

/** Nota qualitativa de qualidade textual (S é o teto). */
export type Grade = "S" | "A" | "B" | "C" | "Fraco";

/**
 * Hubs de sintoma — a navegação cognitiva principal. São os 7 sintomas reais que o aluno "sente"
 * na própria escrita. Union estável (ids pt-BR) para sincronização futura com backend. O registro
 * completo de cada hub vive em `symptoms.ts` (`HUBS`).
 */
export type SymptomHubId =
  | "texto-robotico"
  | "repete-ideias"
  | "repertorio-nao-encaixa"
  | "nao-aprofunda"
  | "introducao-sem-tese"
  | "perde-na-c3"
  | "conclusao-formula";

/** Foco cognitivo de uma missão — o tipo de trabalho mental que ela treina. */
export type CognitiveFocus =
  | "diagnosis"
  | "refinement"
  | "progression"
  | "reconstruction"
  | "prioritization";

/**
 * Evento cognitivo emitido durante uma sessão. NÃO é acerto/erro: é um sinal de qualidade textual
 * com severidade contínua. Negativos puxam o sinal de fraqueza; positivos puxam a maestria.
 * Cada hub tem ≥1 evento negativo (sintoma presente) e 1 positivo (qualidade demonstrada).
 */
export type CognitiveEvent =
  // texto-robotico
  | "GENERIC_SENTENCE"
  | "ARTIFICIAL_TONE"
  | "NATURAL_FLOW"
  // repete-ideias
  | "LEXICAL_REPETITION"
  | "LEXICAL_VARIETY"
  // repertorio-nao-encaixa
  | "FORCED_REPERTOIRE"
  | "GOOD_REPERTOIRE_LINK"
  // nao-aprofunda
  | "SHALLOW_ARGUMENT"
  | "DEEP_ARGUMENT"
  // introducao-sem-tese
  | "VAGUE_THESIS"
  | "SHARP_THESIS"
  // perde-na-c3
  | "WEAK_PROGRESSION"
  | "GOOD_PROGRESSION"
  // conclusao-formula
  | "FORMULAIC_CONCLUSION"
  | "COMPLETE_INTERVENTION";

/** Registro de um evento cognitivo no histórico do perfil adaptativo. */
export type CognitiveEventRecord = {
  type: CognitiveEvent;
  /** 0..1 — intensidade do sinal. */
  severity: number;
  hub: SymptomHubId;
  /** ISO timestamp. */
  at: string;
};

/**
 * Perfil adaptativo orientado a eventos. Sinais contínuos, não contagem bruta:
 * - `weaknessSignals`: 0..1 por hub (EWMA da severidade negativa recente).
 * - `mastery`: 0..100 por hub (qualidade × consistência dos sinais positivos).
 * - `recentEvents`: janela recente de eventos para narrativa e recomendação.
 */
export type AdaptiveProfile = {
  weaknessSignals: Record<SymptomHubId, number>;
  mastery: Record<SymptomHubId, number>;
  recentEvents: CognitiveEventRecord[];
};

/** Recomendação automática: qual hub treinar a seguir e por quê. */
export type Recommendation = {
  hub: SymptomHubId;
  reason: string;
  missionGameId: string | null;
};

/** Etiquetas de sintoma/habilidade usadas pelo perfil adaptativo e pelos hubs. */
export type SkillTag =
  | "repeticao-lexical"
  | "conectivo-artificial"
  | "tese-vaga"
  | "progressao-fraca"
  | "repertorio-decorativo"
  | "abstracao-excessiva"
  | "ambiguidade"
  | "intervencao-incompleta"
  | "texto-robotico"
  | "argumentacao-rasa"
  | "fuga-tangenciamento"
  | "conclusao-formula"
  | "introducao-sem-tese"
  | "falacia"
  | "crase"
  | "regencia"
  | "concordancia"
  | "pontuacao"
  | "c1"
  | "c2"
  | "c3"
  | "c4"
  | "c5";

/** Dificuldade por item (pergunta/rodada), independente da dificuldade do GameDefinition inteiro. */
export type ItemDifficulty = "facil" | "media" | "dificil";

export type GameQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty?: ItemDifficulty;
};

/** Payload do engine `classify`: arrastar cada item para o balde correto. */
export type ClassifyBucket = {
  id: string;
  label: string;
  hint?: string;
};

export type ClassifyItem = {
  id: string;
  text: string;
  bucketId: string;
  explanation?: string;
  difficulty?: ItemDifficulty;
};

export type ClassifyPayload = {
  instruction: string;
  buckets: ClassifyBucket[];
  items: ClassifyItem[];
};

/** Payload do engine `order`: ordenar frases na sequencia correta. Cada rodada e independente. */
export type OrderRound = {
  id: string;
  instruction: string;
  /** Itens ja na ordem correta; a UI embaralha para o aluno. */
  items: string[];
  explanation: string;
  difficulty?: ItemDifficulty;
};

export type OrderPayload = {
  rounds: OrderRound[];
};

/** Payload do engine `fill-blank`: digitar a resposta que completa a lacuna `___`. */
export type FillBlankRound = {
  id: string;
  /** Texto com `___` marcando a lacuna. */
  prompt: string;
  /** Respostas aceitas (normalizadas: minusculas, sem acento, espacos colapsados). */
  accepted: string[];
  explanation: string;
  difficulty?: ItemDifficulty;
};

export type FillBlankPayload = {
  rounds: FillBlankRound[];
};

/** Engine `duel`: duas versões próximas; escolher a melhor e a dimensão decisiva. */
export type DuelRound = {
  id: string;
  context: string;
  a: string;
  b: string;
  winner: "a" | "b";
  /** Dimensão que decide o duelo (ex.: "progressão", "naturalidade", "profundidade"). */
  dimension: string;
  explanation: string;
  tags?: SkillTag[];
};
export type DuelPayload = { rounds: DuelRound[] };

/** Engine `argument-escalation`: subir a escada da tese, do raso ao sofisticado. */
export type EscalationOption = { text: string; correct: boolean; note: string };
export type EscalationRung = { level: number; instruction: string; options: EscalationOption[] };
export type EscalationLadder = { id: string; theme: string; rungs: EscalationRung[]; tags?: SkillTag[] };
export type EscalationPayload = { ladders: EscalationLadder[] };

/** Engine `artificiality`: detectar trecho autêntico × artificial e o tipo de defeito. */
export type ArtificialityFlawOption = { id: string; label: string; correct: boolean; note: string };
export type ArtificialityRound = {
  id: string;
  passage: string;
  verdict: "humano" | "artificial";
  /** Quando `artificial`, opções para marcar o defeito dominante. */
  flaw?: { options: ArtificialityFlawOption[] };
  explanation: string;
  tags?: SkillTag[];
};
export type ArtificialityPayload = { rounds: ArtificialityRound[] };

/** Engine `corrector`: marcar os problemas realmente presentes no parágrafo. */
export type CorrectorCandidate = {
  id: string;
  label: string;
  competency: "C1" | "C2" | "C3" | "C4" | "C5";
  present: boolean;
  note: string;
};
export type CorrectorCase = { id: string; paragraph: string; candidates: CorrectorCandidate[]; tags?: SkillTag[] };
export type CorrectorPayload = { cases: CorrectorCase[] };

/** Engine `essay-collapse`: reconstruir uma redação degradada. */
export type CollapseConnector = {
  slotId: string;
  before: string;
  after: string;
  options: { text: string; correct: boolean; note: string }[];
};
export type CollapseRound = {
  id: string;
  brief: string;
  /** Parágrafos/frases embaralhados; `correctIndex` é a posição correta. */
  fragments: { id: string; text: string; correctIndex: number }[];
  connectors?: CollapseConnector[];
  explanation: string;
  tags?: SkillTag[];
};
export type EssayCollapsePayload = { rounds: CollapseRound[] };

/** Engine `text-surgery`: restaurar um texto degradado, slot a slot. */
export type SurgeryChoiceOption = { text: string; grade: Grade; note: string };
export type SurgerySegment =
  | string
  | {
      slotId: string;
      mode: "choice" | "rewrite";
      /** Para `choice`: opções com grade embutida. */
      options?: SurgeryChoiceOption[];
      /** Para `rewrite`: texto-base degradado e critério avaliado pela IA. */
      base?: string;
      criteria?: string;
      tags?: SkillTag[];
    };
export type SurgeryCase = { id: string; brief: string; segments: SurgerySegment[] };
export type TextSurgeryPayload = { cases: SurgeryCase[] };

/** Engine `survival`: sequência longa agregando questões de vários jogos. */
export type SurvivalPayload = { poolGameIds?: string[] };

export type GameDefinition = {
  id: string;
  name: string;
  category: GameCategoryId;
  description: string;
  difficulty: GameDifficulty;
  xpReward: number;
  estimatedTime: string;
  thumbnail: string;
  progress: number;
  unlocked: boolean;
  engine: GameEngine;
  skill: string;
  /** Usado por `quiz`, `choice` e `timed-rush`. */
  questions?: GameQuestion[];
  /** Usado por `classify`. */
  classify?: ClassifyPayload;
  /** Usado por `order`. */
  order?: OrderPayload;
  /** Usado por `fill-blank`. */
  fillBlank?: FillBlankPayload;
  /** Usado por `duel`. */
  duel?: DuelPayload;
  /** Usado por `argument-escalation`. */
  escalation?: EscalationPayload;
  /** Usado por `artificiality`. */
  artificiality?: ArtificialityPayload;
  /** Usado por `corrector`. */
  corrector?: CorrectorPayload;
  /** Usado por `essay-collapse`. */
  essayCollapse?: EssayCollapsePayload;
  /** Usado por `text-surgery`. */
  textSurgery?: TextSurgeryPayload;
  /** Usado por `survival`. */
  survival?: SurvivalPayload;
  /** Tags de sintoma agregadas do jogo (para hubs/adaptativo quando o item não traz tags). */
  tags?: SkillTag[];
  /** Hubs de sintoma que esta missão treina (navegação cognitiva). Garantido por `enrichGame`. */
  hubs?: SymptomHubId[];
  /** Skills/tags trabalhadas pela missão. Garantido por `enrichGame` (agrega de `tags`). */
  skills?: SkillTag[];
  /** Tipo de trabalho cognitivo que a missão exercita. */
  cognitiveFocus?: CognitiveFocus[];
  /** Eventos cognitivos que a missão pode emitir. Garantido por `enrichGame` (deriva dos hubs). */
  possibleEvents?: CognitiveEvent[];
};

export type GameCategory = {
  id: GameCategoryId;
  name: string;
  slug: GameCategoryId;
  description: string;
  icon: LucideIcon;
  progress: number;
  secondaryColor: string;
  gameCount: number;
  masteryLevel: string;
};

export type GameAttempt = {
  id: string;
  gameId: string;
  category: GameCategoryId;
  score: number;
  total: number;
  accuracy: number;
  xpEarned: number;
  playedAt: string;
  durationSeconds: number;
};

export type GameProgress = {
  gameId: string;
  plays: number;
  bestScore: number;
  bestAccuracy: number;
  progress: number;
  completedToday: boolean;
  lastPlayedAt?: string;
};

export type StreakState = {
  current: number;
  best: number;
  lastActiveDate?: string;
};

export type GameCompletion = {
  attempt: GameAttempt;
};
