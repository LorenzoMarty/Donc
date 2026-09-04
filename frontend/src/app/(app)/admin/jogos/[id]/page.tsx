"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { GameEditorPanel } from "@/app/(app)/admin/_tabs/ai-games";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader } from "@/components/shared/premium-ui";
import { useAuth } from "@/providers/app-providers";
import { apiFetch } from "@/services/api";
import type { AdminReviewer, AIGeneratedGame } from "@/types/api";

/**
 * Tela dedicada de um jogo (pedido do usuário: tabela na lista + tela separada pra ver/editar
 * perguntas, no lugar do dropdown inline que existia em `ai-games.tsx`).
 */
export default function AdminGameDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const gameId = Number(params.id);

  const [games, setGames] = useState<AIGeneratedGame[] | null>(null);
  const [users, setUsers] = useState<AdminReviewer[]>([]);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    Promise.allSettled([apiFetch<AIGeneratedGame[]>("/admin/ai-games"), apiFetch<AdminReviewer[]>("/admin/reviewers")]).then(
      ([g, u]) => {
        if (g.status === "fulfilled") setGames(g.value);
        else setError(g.reason instanceof Error ? g.reason.message : "Não foi possível carregar o jogo.");
        if (u.status === "fulfilled") setUsers(u.value);
      },
    );
  }, [authLoading, isAdmin]);

  if (authLoading) return <LoadingCard />;

  if (!isAdmin) {
    return <PageHeader eyebrow="Admin" title="Painel indisponível" description="Acesso restrito a administradores." />;
  }

  if (error) {
    return <PageHeader eyebrow="Jogos" title="Não foi possível carregar" description={error} />;
  }

  if (!games) return <LoadingCard />;

  const game = games.find((g) => g.id === gameId);

  if (!game) {
    return (
      <PageHeader
        eyebrow="Jogos"
        title="Jogo não encontrado"
        description="Ele pode ter sido excluído."
        action={
          <Button variant="outline" onClick={() => router.push("/admin?tab=games")}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para Jogos
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Jogos"
        title={game.name}
        description="Perguntas, respostas, explicações e revisão deste jogo."
        action={
          <Button variant="outline" asChild>
            <Link href="/admin?tab=games">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar para Jogos
            </Link>
          </Button>
        }
      />

      <GameEditorPanel
        game={game}
        users={users}
        allGames={games}
        onReviewed={(updated) => setGames((prev) => (prev ? prev.map((g) => (g.id === updated.id ? updated : g)) : prev))}
        onDeleted={() => router.push("/admin?tab=games")}
      />
    </div>
  );
}
