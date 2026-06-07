"use client";

import { useParams } from "next/navigation";

import SymptomPage from "@/game-pages/games/SymptomPage";

export default function GamesSymptomRoute() {
  const params = useParams<{ symptomId: string }>() ?? { symptomId: "" };
  return <SymptomPage symptomId={params.symptomId} />;
}
