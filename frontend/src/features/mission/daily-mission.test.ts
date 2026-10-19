import { describe, expect, it } from "vitest";

import { emptyAdaptiveProfile } from "@/features/gamification/adaptive";
import type { GameAttempt, GameDefinition } from "@/features/gamification/types";
import { buildMission, emptyMissionLog, localDayKey, parseMissionLog, syncMissionLog } from "@/features/mission/daily-mission";

const NOW = new Date(2026, 9, 17, 15, 0);
const TODAY = localDayKey(NOW);

const game = { id: "g1", name: "Cirurgia de texto", category: "argumentacao", engine: "text-surgery" } as GameDefinition;
const attemptToday = { id: "a", gameId: "g1", playedAt: new Date(2026, 9, 17, 9, 0).toISOString() } as GameAttempt;
const attemptYesterday = { id: "b", gameId: "g1", playedAt: new Date(2026, 9, 16, 23, 0).toISOString() } as GameAttempt;

const dashboard = {
  completed_lessons: 3,
  recent_lessons: [
    { id: 1, title: "Tese", module: "Estrutura", progress_percent: 100 },
    { id: 2, title: "Repertório", module: "Argumentação", progress_percent: 40 },
  ],
  suggested_lessons: [{ id: 9, title: "Coesão", module: "Coesão", progress_percent: 0 }],
};

const base = { adaptive: emptyAdaptiveProfile(), games: [game], dashboard, log: emptyMissionLog, now: NOW };

describe("buildMission", () => {
  it("picks the unfinished lesson and the recommended game, nothing done yet", () => {
    const mission = buildMission({ ...base, attempts: [attemptYesterday] });
    expect(mission.lesson).toMatchObject({ href: "/aulas/2", done: false });
    expect(mission.activity.done).toBe(false);
    expect(mission.complete).toBe(false);
  });

  it("falls back to suggested lesson and /games when nothing is in progress or no game matches", () => {
    const mission = buildMission({
      ...base,
      games: [],
      attempts: [],
      dashboard: { ...dashboard, recent_lessons: [] },
    });
    expect(mission.lesson?.href).toBe("/aulas/9");
    expect(mission.activity.href).toBe("/games");
  });

  it("is complete only when activity played today and a lesson finished since the day's baseline", () => {
    const log = { baseline: { day: TODAY, completedLessons: 2 }, doneDays: [] };
    expect(buildMission({ ...base, attempts: [attemptToday], log }).complete).toBe(true);
    expect(buildMission({ ...base, attempts: [], log }).complete).toBe(false);
    const noLessonYet = { baseline: { day: TODAY, completedLessons: 3 }, doneDays: [] };
    expect(buildMission({ ...base, attempts: [attemptToday], log: noLessonYet }).complete).toBe(false);
  });

  it("without any lesson available, the activity alone completes the mission", () => {
    const mission = buildMission({
      ...base,
      attempts: [attemptToday],
      dashboard: { ...dashboard, recent_lessons: [], suggested_lessons: [] },
    });
    expect(mission.lesson).toBeNull();
    expect(mission.complete).toBe(true);
  });
});

describe("syncMissionLog", () => {
  it("sets baseline on first visit of the day and keeps it afterwards", () => {
    const mission = buildMission({ ...base, attempts: [] });
    const first = syncMissionLog(emptyMissionLog, mission, 3);
    expect(first.baseline).toEqual({ day: TODAY, completedLessons: 3 });
    expect(syncMissionLog(first, mission, 5)).toBe(first);
  });

  it("resets baseline on a new day and records completed days once", () => {
    const yesterdayLog = { baseline: { day: "2026-10-16", completedLessons: 1 }, doneDays: ["2026-10-16"] };
    const mission = { ...buildMission({ ...base, attempts: [] }), complete: true };
    const next = syncMissionLog(yesterdayLog, mission, 3);
    expect(next.baseline).toEqual({ day: TODAY, completedLessons: 3 });
    expect(next.doneDays).toEqual(["2026-10-16", TODAY]);
    expect(syncMissionLog(next, mission, 3)).toBe(next);
  });
});


describe("parseMissionLog", () => {
  it("round-trips a valid log", () => {
    const log = { baseline: { day: "2026-10-17", completedLessons: 4 }, doneDays: ["2026-10-16"] };
    expect(parseMissionLog(JSON.stringify(log))).toEqual(log);
  });

  it("falls back to an empty log for missing, broken or wrongly typed data", () => {
    expect(parseMissionLog(null)).toEqual(emptyMissionLog);
    expect(parseMissionLog("{nao e json")).toEqual(emptyMissionLog);
    expect(parseMissionLog(JSON.stringify({ baseline: "x", doneDays: "nope" }))).toEqual(emptyMissionLog);
    expect(parseMissionLog(JSON.stringify({ doneDays: ["2026-10-16", 7, null] })).doneDays).toEqual(["2026-10-16"]);
  });
});
