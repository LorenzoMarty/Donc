import type {
  AdaptiveProfile,
  CognitiveEvent,
  CognitiveEventRecord,
  GameDefinition,
  GameEngine,
  Recommendation,
  SkillTag,
  SymptomHubId,
} from "@/features/gamification/types";

/**
 * Camada adaptativa orientada a eventos (MVP, client-side).
 *
 * Princípio: NÃO somamos pontos (`profile.x += 5`). Cada decisão vira um evento cognitivo com
 * severidade contínua; o perfil é uma média móvel exponencial (EWMA) desses sinais. Maestria é
 * qualidade × consistência, não porcentagem de acerto.
 */

const HUB_IDS: SymptomHubId[] = ["texto_artificial", "argumentacao_superficial", "repertorio_forcado"];

/** Eventos negativos (sintoma presente) e positivos (qualidade demonstrada) por hub. */
const NEGATIVE_EVENTS: CognitiveEvent[] = [
  "GENERIC_SENTENCE",
  "ARTIFICIAL_TONE",
  "SHALLOW_ARGUMENT",
  "WEAK_PROGRESSION",
  "FORCED_REPERTOIRE",
];

export function isNegativeEvent(type: CognitiveEvent): boolean {
  return NEGATIVE_EVENTS.includes(type);
}

/** Definição de cada hub cognitivo: rótulo, hub pt-BR equivalente, tags, eventos e engine-missão. */
export const COGNITIVE_HUBS: Record<
  SymptomHubId,
  {
    label: string;
    /** Hub de sintoma pt-BR correspondente (em `symptoms.ts`). */
    legacyHubId: string;
    tags: SkillTag[];
    negative: CognitiveEvent[];
    positive: CognitiveEvent[];
    missionEngine: GameEngine;
    /** Frase de fraqueza dominante para a home adaptativa. */
    weaknessNarrative: string;
  }
> = {
  texto_artificial: {
    label: "Seu texto parece artificial",
    legacyHubId: "texto-robotico",
    tags: ["texto-robotico", "conectivo-artificial", "abstracao-excessiva", "repeticao-lexical"],
    negative: ["ARTIFICIAL_TONE", "GENERIC_SENTENCE"],
    positive: ["NATURAL_FLOW"],
    missionEngine: "duel",
    weaknessNarrative:
      "Seu texto vem soando artificial. Continue treinando naturalidade e fluidez para apagar a cara de fórmula pronta.",
  },
  argumentacao_superficial: {
    label: "Você afirma, mas não aprofunda",
    legacyHubId: "nao-aprofunda",
    tags: ["argumentacao-rasa", "progressao-fraca", "abstracao-excessiva"],
    negative: ["SHALLOW_ARGUMENT", "WEAK_PROGRESSION"],
    positive: ["GOOD_PROGRESSION"],
    missionEngine: "argument-escalation",
    weaknessNarrative:
      "Você vem apresentando argumentação superficial. Continue treinando progressão argumentativa e densidade analítica.",
  },
  repertorio_forcado: {
    label: "Seu repertório não encaixa",
    legacyHubId: "repertorio-nao-encaixa",
    tags: ["repertorio-decorativo", "c2"],
    negative: ["FORCED_REPERTOIRE"],
    positive: ["GOOD_REPERTOIRE_LINK"],
    missionEngine: "text-surgery",
    weaknessNarrative:
      "Seu repertório vem entrando de forma forçada. Continue treinando integração orgânica e pertinência argumentativa.",
  },
};

/** Mapa tag → hub cognitivo (usado pela ponte com o skill system legado). */
const TAG_TO_HUB: Partial<Record<SkillTag, SymptomHubId>> = (() => {
  const map: Partial<Record<SkillTag, SymptomHubId>> = {};
  for (const hub of HUB_IDS) {
    for (const tag of COGNITIVE_HUBS[hub].tags) {
      // Primeiro hub que reivindica a tag vence (tags compartilhadas pendem para o mais específico).
      if (!map[tag]) map[tag] = hub;
    }
  }
  return map;
})();

export function emptyAdaptiveProfile(): AdaptiveProfile {
  return {
    weaknessSignals: { texto_artificial: 0, argumentacao_superficial: 0, repertorio_forcado: 0 },
    mastery: { texto_artificial: 0, argumentacao_superficial: 0, repertorio_forcado: 0 },
    recentEvents: [],
  };
}

const EWMA_ALPHA = 0.3; // peso do sinal mais recente
const MAX_EVENTS = 40;

/**
 * Aplica um evento ao perfil. Pura: retorna novo perfil.
 * - evento negativo: empurra `weaknessSignals[hub]` para cima (alvo = severity) e maestria para baixo.
 * - evento positivo: empurra `weaknessSignals[hub]` para baixo e maestria para cima.
 */
export function applyEvent(profile: AdaptiveProfile, event: CognitiveEventRecord): AdaptiveProfile {
  const hub = event.hub;
  const negative = isNegativeEvent(event.type);
  const prevWeak = profile.weaknessSignals[hub] ?? 0;
  const prevMastery = profile.mastery[hub] ?? 0;

  // Alvo do sinal de fraqueza: severity se negativo, 0 se positivo.
  const weakTarget = negative ? event.severity : 0;
  const nextWeak = round2(prevWeak + EWMA_ALPHA * (weakTarget - prevWeak));

  // Maestria 0..100: alvo alto para positivos, baixo para negativos, ponderado pela severity.
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
 * Sem dados, recomenda o hub `texto_artificial` como diagnóstico inicial.
 */
export function recommendHub(profile: AdaptiveProfile, games: GameDefinition[]): Recommendation {
  const hub = dominantWeakness(profile);
  if (!hub) {
    const mission = missionForHub("texto_artificial", games);
    return {
      hub: "texto_artificial",
      reason: "Comece por um diagnóstico: descubra se seu texto soa natural ou artificial.",
      missionGameId: mission?.id ?? null,
    };
  }
  const mission = missionForHub(hub, games);
  return { hub, reason: COGNITIVE_HUBS[hub].weaknessNarrative, missionGameId: mission?.id ?? null };
}

/** Missão (jogo) associada ao engine do hub. */
export function missionForHub(hub: SymptomHubId, games: GameDefinition[]): GameDefinition | undefined {
  const { missionEngine } = COGNITIVE_HUBS[hub];
  return (
    games.find((g) => g.hubs?.includes(hub)) ??
    games.find((g) => g.engine === missionEngine)
  );
}

/**
 * Ponte com o skill system legado: traduz os `{tag, correct}` que os engines já emitem em eventos
 * cognitivos com severidade. Permite instrumentar os engines existentes sem reescrevê-los.
 */
export function tagOutcomeToEvents(
  outcomes: { tag: SkillTag; correct: boolean }[],
  at: string,
): CognitiveEventRecord[] {
  const events: CognitiveEventRecord[] = [];
  for (const { tag, correct } of outcomes) {
    const hub = TAG_TO_HUB[tag];
    if (!hub) continue;
    const def = COGNITIVE_HUBS[hub];
    if (correct) {
      events.push({ type: def.positive[0], severity: 0.4, hub, at });
    } else {
      events.push({ type: def.negative[0], severity: 0.7, hub, at });
    }
  }
  return events;
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
