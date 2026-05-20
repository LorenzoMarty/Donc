"use client";

import { useParams } from "next/navigation";

import CategoryPage from "@/game-pages/games/CategoryPage";

export default function GamesCategoryRoute() {
  const params = useParams<{ categorySlug: string }>() ?? { categorySlug: "" };
  return <CategoryPage categorySlug={params.categorySlug} />;
}
