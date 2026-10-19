import { recommendHub } from "@/features/gamification/adaptive";
import { HUBS } from "@/features/gamification/symptoms";
import type { AdaptiveProfile, GameAttempt, GameDefinition } from "@/features/gamification/types";
import type { Dashboard } from "@/types/api";

/** Registro local da missão (mesmo modelo client-side de XP/streak): `baseline` guarda quantas aulas
 * estavam concluídas na primeira visita do dia; `doneDays` lista os dias com missão cumprida. */
export type MissionLog = {
  baseline: { day: string; completedLessons: number } | null;
  doneDays: string[];
};

export type MissionStep = { title: string; description: string; href: string; done: boolean };

export type DailyMission = {
  day: string;
  activity: MissionStep;
  lesson: MissionStep | null;
  complete: boolean;
};

export const emptyMissionLog: MissionLog = { baseline: null, doneDays: [] };

/** Lê o log salvo no navegador. Qualquer coisa fora do formato (JSON quebrado, tipos errados, edição manual)
 * volta ao log vazio em vez de derrubar o dashboard. */
export function parseMissionLog(raw: string | null): MissionLog {
  if (!raw) return emptyMissionLog;
  try {
    const data = JSON.parse(raw) as { baseline?: unknown; doneDays?: unknown };
    const baseline = data.baseline as { day?: unknown; completedLessons?: unknown } | null | undefined;
    return {
      baseline:
        baseline && typeof baseline.day === "string" && typeof baseline.completedLessons === "number"
          ? { day: baseline.day, completedLessons: baseline.completedLessons }
          : null,
      doneDays: Array.isArray(data.doneDays) ? data.doneDays.filter((day): day is string => typeof day === "string") : [],
    };
  } catch {
    return emptyMissionLog;
  }
}

/** Dia local (não UTC): a missão vira à meia-noite do aluno, não às 21h no Brasil. */
export function localDayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

type DashboardLessons = Pick<Dashboard, "recent_lessons" | "suggested_lessons" | "completed_lessons">;

function nextLesson(data: DashboardLessons) {
  const inProgress = data.recent_lessons?.find((lesson) => lesson.progress_percent < 100);
  return inProgress ?? data.suggested_lessons?.[0] ?? null;
}

export function buildMission(input: {
  adaptive: AdaptiveProfile;
  games: GameDefinition[];
  attempts: GameAttempt[];
  dashboard: DashboardLessons;
  log: MissionLog;
  now?: Date;
}): DailyMission {
  const now = input.now ?? new Date();
  const day = localDayKey(now);
  const recommendation = recommendHub(input.adaptive, input.games);
  const game = input.games.find((item) => item.id === recommendation.missionGameId);
  const playedToday = input.attempts.some((attempt) => localDayKey(new Date(attempt.playedAt)) === day);

  const activity: MissionStep = {
    title: game ? game.name : `Treino: ${HUBS[recommendation.hub].label}`,
    description: recommendation.reason,
    href: game ? `/games/${game.category}/${game.id}` : "/games",
    done: playedToday,
  };

  const lessonTarget = nextLesson(input.dashboard);
  const baseline = input.log.baseline?.day === day ? input.log.baseline.completedLessons : input.dashboard.completed_lessons;
  const lesson: MissionStep | null = lessonTarget
    ? {
        title: lessonTarget.title,
        description: lessonTarget.module,
        href: `/aulas/${lessonTarget.id}`,
        done: input.dashboard.completed_lessons > baseline,
      }
    : null;

  return { day, activity, lesson, complete: activity.done && (lesson?.done ?? true) };
}

/** Atualiza o log: fixa o baseline do dia na primeira visita e registra o dia ao cumprir a missão. */
export function syncMissionLog(log: MissionLog, mission: DailyMission, completedLessons: number): MissionLog {
  const baseline = log.baseline?.day === mission.day ? log.baseline : { day: mission.day, completedLessons };
  const doneDays = mission.complete && !log.doneDays.includes(mission.day) ? [...log.doneDays, mission.day] : log.doneDays;
  if (baseline === log.baseline && doneDays === log.doneDays) return log;
  return { baseline, doneDays };
}
