import { getRankSnapshot } from "@/features/xp/xp";

export function getLocalRanking(xp: number) {
  const upper = xp + 380;
  const lower = Math.max(120, xp - 210);

  return [
    { name: "Lia", score: upper, label: getRankSnapshot(upper).current.name },
    { name: "Voce", score: xp, label: getRankSnapshot(xp).current.name },
    { name: "Theo", score: lower, label: getRankSnapshot(lower).current.name },
  ];
}
