"use client";

import { useParams } from "next/navigation";

import GameSession from "@/game-pages/games/GameSession";

export default function GameSessionRoute() {
  const params = useParams<{ categorySlug: string; gameId: string }>() ?? { categorySlug: "", gameId: "" };
  return <GameSession categorySlug={params.categorySlug} gameId={params.gameId} />;
}
