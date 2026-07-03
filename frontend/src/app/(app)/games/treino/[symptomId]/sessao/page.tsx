"use client";

import { useParams } from "next/navigation";

import ChainedSession from "@/game-pages/games/ChainedSession";

export default function GamesSymptomSessionRoute() {
  const params = useParams<{ symptomId: string }>() ?? { symptomId: "" };
  return <ChainedSession symptomId={params.symptomId} />;
}
