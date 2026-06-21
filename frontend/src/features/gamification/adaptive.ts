import { HUBS, HUB_IDS, gameTags } from "@/features/gamification/symptoms";
import type {
  AdaptiveProfile,
  CognitiveEvent,
  CognitiveEventRecord,
  GameDefinition,
  Grade,
  Recommendation,
  SkillTag,
  SymptomHubId,
} from "@/features/gamification/types";

/**
 * Núcleo cognitivo orientado a eventos (client-side). Fonte de verdade do treino adaptativo.
 *
 * Princípio: NÃO somamos pontos (`profile.x += 5`). Cada decisão vira um evento cognitivo com
 * severidade contínua; o perfil é uma média móvel exponencial (EWMA) desses sinais. Maestria é
 * qualidade × consistência, não porcentagem de acerto. attempts/errors só existem como compat.
 */

/** Conjunto de eventos negativos (sintoma presente), derivado do registro de hubs. */
const NEGATIVE_EVENTS = new Set<CognitiveEvent>(HUB_IDS.flatMap((id) => HUBS[id].negativeEvents));

export function isNegativeEvent(type: CognitiveEvent): boolean {
  return NEGATIVE_EVENTS.has(type);
}

/** Mapa tag → hub (primeiro hub que reivindica a tag vence). */
const TAG_TO_HUB: Partial<Record<SkillTag, SymptomHubId>> = (() => {
  const map: Partial<Record<SkillTag, SymptomHubId>> = {};
  for (const id of HUB_IDS) {
    for (const tag of HUBS[id].tags) {
      if (!map[tag]) map[tag] = id;
    }
  }
  return map;
})();

export function emptyAdaptiveProfile(): AdaptiveProfile {
  const zero = () => Object.fromEntries(HUB_IDS.map((id) => [id, 0])) as Record<SymptomHubId, number>;
  return { weaknessSignals: zero(), mastery: zero(), recentEvents: [] };
}

const EWMA_ALPHA = 0.3; // peso do sinal mais recente
const MAX_EVENTS = 40;

/**
 * Aplica um evento ao perfil. Pura: retorna novo perfil.
 * - evento negativo: empurra `weaknessSignals[hub]` para cima (alvo = severity) e maestria p/ baixo.
 * - evento positivo: empurra `weaknessSignals[hub]` para baixo e maestria para cima.
 */
export function applyEvent(profile: AdaptiveProfile, event: CognitiveEventRecord): AdaptiveProfile {
  const hub = event.hub;
  const negative = isNegativeEvent(event.type);
  const prevWeak = profile.weaknessSignals[hub] ?? 0;
  const prevMastery = profile.mastery[hub] ?? 0;

  const weakTarget = negative ? event.severity : 0;
  const nextWeak = round2(prevWeak + EWMA_ALPHA * (weakTarget - prevWeak));

  const masteryTarget = negative ? Math.max(0, 60 - event.severity * 60) : 60 + event.severity * 40;
  const nextMastery = Math.round(prevMastery + EWMA_ALPHA * (masteryTarget - prevMastery));

  return {
    weaknessSignals: { ...profile.weaknessSignals, [hub]: clamp01(nextWeak) },
    mastery: { ...profile.mastery, [hub]: clamp(nextMastery, 0, 100) },
    recentEvents: [event, ...profile.recentEvents].slice(0, MAX_EVENTS),
  };
}

/** Maestria contínua (0..100) de um hub. */
export function masteryForHub(profile: AdaptiveProfile, hub: SymptomHubId): number {
  return profile.mastery[hub] ?? 0;
}

/** Hub com maior sinal de fraqueza recente; null se não há sinal relevante. */
export function dominantWeakness(profile: AdaptiveProfile): SymptomHubId | null {
  let best: SymptomHubId | null = null;
  let bestVal = 0.05; // limiar mínimo para considerar relevante
  for (const hub of HUB_IDS) {
    const val = profile.weaknessSignals[hub] ?? 0;
    if (val > bestVal) {
      best = hub;
      bestVal = val;
    }
  }
  return best;
}

/**
 * Recomendação automática: lê os sinais, escolhe o hub dominante e a missão correspondente.
 * Sem dados, recomenda um diagnóstico inicial (`texto-robotico`).
 */
export function recommendHub(profile: AdaptiveProfile, games: GameDefinition[]): Recommendation {
  const hub = dominantWeakness(profile) ?? "texto-robotico";
  const mission = missionForHub(hub, games);
  const reason = dominantWeakness(profile)
    ? HUBS[hub].weaknessNarrative
    : "Comece por um diagnóstico: descubra que sintoma mais trava sua redação hoje.";
  return { hub, reason, missionGameId: mission?.id ?? null };
}

/** Missão (jogo) profunda associada a um hub: prioriza `hubs` explícito, depois os engines do hub. */
export function missionForHub(hub: SymptomHubId, games: GameDefinition[]): GameDefinition | undefined {
  const explicit = games.find((g) => g.hubs?.includes(hub));
  if (explicit) return explicit;
  for (const engine of HUBS[hub].missionEngines) {
    const byEngine = games.find((g) => g.engine === engine);
    if (byEngine) return byEngine;
  }
  return undefined;
}

/** Hubs derivados de um conjunto de tags (para `enrichGame`). */
export function deriveHubsFromTags(tags: SkillTag[]): SymptomHubId[] {
  const set = new Set<SymptomHubId>();
  for (const tag of tags) {
    const hub = TAG_TO_HUB[tag];
    if (hub) set.add(hub);
  }
  return [...set];
}

/** Eventos possíveis (negativos + positivos) de um conjunto de hubs (para `enrichGame`). */
export function possibleEventsForHubs(hubs: SymptomHubId[]): CognitiveEvent[] {
  const set = new Set<CognitiveEvent>();
  for (const id of hubs) {
    HUBS[id].negativeEvents.forEach((e) => set.add(e));
    HUBS[id].positiveEvents.forEach((e) => set.add(e));
  }
  return [...set];
}

/** Severidade e polaridade a partir de uma nota qualitativa S/A/B/C. */
export function gradeToSeverity(grade: Grade): { negative: boolean; severity: number } {
  switch (grade) {
    case "S":
      return { negative: false, severity: 0.9 };
    case "A":
      return { negative: false, severity: 0.6 };
    case "B":
      return { negative: true, severity: 0.3 };
    case "C":
      return { negative: true, severity: 0.6 };
    default: // "Fraco"
      return { negative: true, severity: 0.9 };
  }
}

/** Decisão de uma missão traduzida em sinais cognitivos. */
export type CognitiveDecision = { tags?: SkillTag[]; grade?: Grade; correct?: boolean };

function hubsForDecision(game: GameDefinition, decision: CognitiveDecision): SymptomHubId[] {
  const fromTags = decision.tags ? deriveHubsFromTags(decision.tags) : [];
  if (fromTags.length) return fromTags;
  if (game.hubs?.length) return game.hubs;
  return deriveHubsFromTags(gameTags(game)).slice(0, 1);
}

/**
 * Contrato cognitivo: traduz uma decisão de missão em eventos por hub.
 * Severidade vem do `grade` (qualidade) quando houver; senão do `correct` (compat binária).
 */
export function eventsForOutcome(
  game: GameDefinition,
  decision: CognitiveDecision,
  at: string,
): CognitiveEventRecord[] {
  const hubs = hubsForDecision(game, decision);
  if (!hubs.length) return [];

  let negative: boolean;
  let severity: number;
  if (decision.grade) {
    ({ negative, severity } = gradeToSeverity(decision.grade));
  } else {
    negative = !decision.correct;
    severity = negative ? 0.7 : 0.4;
  }

  return hubs.map((hub) => {
    const def = HUBS[hub];
    const type = negative ? def.negativeEvents[0] : def.positiveEvents[0];
    return { type, severity, hub, at };
  });
}

/**
 * Ponte legada: traduz `{tag, correct}` (usado por drills) em eventos cognitivos binários.
 * Mantida para os engines rasos que ainda chamam `recordSkillOutcomes`.
 */
export function tagOutcomeToEvents(
  outcomes: { tag: SkillTag; correct: boolean }[],
  at: string,
): CognitiveEventRecord[] {
  const events: CognitiveEventRecord[] = [];
  for (const { tag, correct } of outcomes) {
    const hub = TAG_TO_HUB[tag];
    if (!hub) continue;
    const def = HUBS[hub];
    events.push(
      correct
        ? { type: def.positiveEvents[0], severity: 0.4, hub, at }
        : { type: def.negativeEvents[0], severity: 0.7, hub, at },
    );
  }
  return events;
}

/**
 * Selects games for a training session targeting a hub.
 *
 * Adapts to the student's mastery level: lower mastery → easier games first; higher → harder.
 * Randomizes within each difficulty tier so the plan varies between sessions.
 * Returns games ordered easy→hard for within-session progression.
 */
export function selectGamesForHub(
  hubId: SymptomHubId,
  games: GameDefinition[],
  profile: AdaptiveProfile,
  count = 4,
): GameDefinition[] {
  const hub = HUBS[hubId];
  if (!hub) return [];

  const wanted = new Set(hub.tags);
  const hubGames = games.filter((g) => gameTags(g).some((t) => wanted.has(t)));
  if (!hubGames.length) return [];

  const mastery = masteryForHub(profile, hubId);
  const preferred = mastery >= 65 ? "Avancado" : mastery >= 30 ? "Intermediario" : "Essencial";

  const deepEngines = new Set(hub.missionEngines);
  const relevanceScore = (g: GameDefinition) => (deepEngines.has(g.engine) ? 2 : 0) + (g.xpReward > 60 ? 1 : 0);

  const byDiff: Record<string, GameDefinition[]> = { Essencial: [], Intermediario: [], Avancado: [] };
  for (const g of hubGames) {
    (byDiff[g.difficulty] ?? (byDiff[g.difficulty] = [])).push(g);
  }

  // Sort each tier by relevance, then shuffle tail for variety (keep best match at front)
  for (const pool of Object.values(byDiff)) {
    pool.sort((a, b) => relevanceScore(b) - relevanceScore(a));
    for (let i = pool.length - 1; i > 1; i--) {
      const j = 1 + Math.floor(Math.random() * i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }

  const tierOrder =
    preferred === "Essencial"
      ? ["Essencial", "Intermediario", "Avancado"]
      : preferred === "Avancado"
        ? ["Avancado", "Intermediario", "Essencial"]
        : ["Intermediario", "Essencial", "Avancado"];

  const selected: GameDefinition[] = [];
  const used = new Set<string>();
  for (const tier of tierOrder) {
    for (const game of byDiff[tier] ?? []) {
      if (selected.length >= count) break;
      if (!used.has(game.id)) {
        selected.push(game);
        used.add(game.id);
      }
    }
    if (selected.length >= count) break;
  }

  // Order for session: easier → harder (gradual difficulty progression)
  const diffOrder: Record<string, number> = { Essencial: 0, Intermediario: 1, Avancado: 2 };
  return selected.sort((a, b) => (diffOrder[a.difficulty] ?? 0) - (diffOrder[b.difficulty] ?? 0));
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
function clamp01(n: number): number {
  return clamp(n, 0, 1);
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
