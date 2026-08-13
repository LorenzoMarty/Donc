import type { AdminContentQuality, AIGeneratedGame, EssayTheme } from "@/types/api";

const RECENT_WINDOW_DAYS = 7;

/** REQ-2 (P3c): "Publicados" — jogo/tema gerado por IA que já passou pela revisão e está ativo. */
export function countPublished(games: AIGeneratedGame[], themes: EssayTheme[]): number {
  return games.filter((g) => g.status === "approved").length + themes.filter((t) => t.status === "approved").length;
}

/** REQ-4 (P3c): "Criados recentemente" — jogo/tema criado nos últimos 7 dias. Aula/módulo ficam
 * fora: a API de admin não expõe `created_at` pra esses dois tipos hoje (sem coluna no banco),
 * e REQ-4 não autoriza endpoint/migração nova pra resolver isso. */
export function countRecentlyCreated(games: AIGeneratedGame[], themes: EssayTheme[], now: Date): number {
  const threshold = now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const isRecent = (createdAt: string) => new Date(createdAt).getTime() >= threshold;
  return games.filter((g) => isRecent(g.created_at)).length + themes.filter((t) => isRecent(t.created_at)).length;
}

/** REQ-5 (P3c): "Precisa atenção" — reusa o mesmo cálculo já usado em adaptive-health.tsx (P2c),
 * movido pra cá pra ser compartilhado sem duplicar a lógica. */
export function contentQualityTotal(quality: AdminContentQuality): number {
  return (
    quality.lessons_without_target.length +
    quality.exercises_without_target.length +
    quality.games_without_target.length +
    quality.unused_lessons.length +
    quality.unused_exercises.length +
    quality.unused_games.length +
    quality.rejected_games.length +
    quality.edited_games.length
  );
}
