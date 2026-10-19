import { Lock, Trophy } from "lucide-react";

import { Surface } from "@/components/shared/premium-ui";
import { computeAchievements } from "@/features/achievements/achievements";
import type { Dashboard } from "@/types/api";
import { cn } from "@/utils";

export function AchievementsCard({ dashboard }: { dashboard: Dashboard | null }) {
  if (!dashboard) return null;
  const achievements = computeAchievements(dashboard);
  const earnedCount = achievements.filter((item) => item.earned).length;

  return (
    <div data-testid="achievements">
      <Surface>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="section-title font-semibold">Conquistas</h2>
          <span className="text-[13px] text-muted-foreground">
            {earnedCount} de {achievements.length}
          </span>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {achievements.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-control border border-border/60 p-3",
                item.earned ? "bg-primary/5" : "opacity-60",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                  item.earned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {item.earned ? <Trophy className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold leading-tight">{item.title}</span>
                <span className="block text-[12px] text-muted-foreground">{item.description}</span>
                <span className="sr-only">{item.earned ? "Conquistada" : "Bloqueada"}</span>
              </span>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}
