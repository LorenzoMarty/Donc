"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Surface } from "@/components/shared/premium-ui";
import type { GameProgress } from "@/features/gamification/types";
import { buildPhaseMap, type PhaseNode, type PhaseNodeState } from "@/features/profile/phase-map";
import { useGameStore } from "@/stores/game-store";

const STATE_COLOR: Record<PhaseNodeState, string> = {
  bloqueado: "hsl(var(--muted-foreground))",
  aprendiz: "hsl(var(--streak))",
  praticante: "hsl(var(--info))",
  mestre: "hsl(var(--highlight))",
};

const STATE_LABEL: Record<PhaseNodeState, string> = {
  mestre: "Mestre",
  praticante: "Praticante",
  aprendiz: "Aprendiz",
  bloqueado: "Bloqueado",
};

const LEGEND_ORDER: PhaseNodeState[] = ["mestre", "praticante", "aprendiz", "bloqueado"];

// Grafo abstrato organizado em petalas: cada categoria vira um cluster próprio distribuído em
// círculo; dentro do cluster os nós usam espiral áurea + jitter determinístico. Isso mantém as
// conexões (mesma categoria) curtas e locais, evitando a teia cruzando o card inteiro.
const VIEW_WIDTH = 420;
const VIEW_HEIGHT = 340;
const NODE_RADIUS = 7;
const CLUSTER_ORBIT = 125;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const CATEGORY_ORDER = ["estrutura", "coesao", "argumentacao", "repertorio", "gramatica", "competencias-enem", "desafios-diarios"];

type LaidOutNode = { x: number; y: number; node: PhaseNode };

function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function scatterNodes(nodes: PhaseNode[]): LaidOutNode[] {
  const groups = new Map<string, PhaseNode[]>();
  for (const node of nodes) {
    const group = groups.get(node.category) ?? [];
    group.push(node);
    groups.set(node.category, group);
  }
  const categories = [...CATEGORY_ORDER.filter((cat) => groups.has(cat)), ...[...groups.keys()].filter((cat) => !CATEGORY_ORDER.includes(cat))];

  const cx = VIEW_WIDTH / 2;
  const cy = VIEW_HEIGHT / 2;
  const points: LaidOutNode[] = [];

  categories.forEach((category, ci) => {
    const group = groups.get(category)!;
    const clusterAngle = (ci / categories.length) * Math.PI * 2 - Math.PI / 2;
    const clusterCx = cx + Math.cos(clusterAngle) * CLUSTER_ORBIT;
    const clusterCy = cy + Math.sin(clusterAngle) * CLUSTER_ORBIT;
    const clusterRadius = 24 + group.length * 4;

    group.forEach((node, i) => {
      const t = group.length <= 1 ? 0 : i / (group.length - 1);
      const radius = clusterRadius * Math.sqrt(t);
      const angle = i * GOLDEN_ANGLE + (hash01(`${node.gameId}-a`) - 0.5) * 0.6;
      const jitter = (hash01(`${node.gameId}-r`) - 0.5) * 6;
      const r = Math.max(0, radius + jitter);
      points.push({ x: clusterCx + Math.cos(angle) * r, y: clusterCy + Math.sin(angle) * r, node });
    });
  });

  return points;
}

function categoryLinks(points: LaidOutNode[]): { key: string; x1: number; y1: number; x2: number; y2: number; blocked: boolean }[] {
  const groups = new Map<string, LaidOutNode[]>();
  for (const point of points) {
    const group = groups.get(point.node.category) ?? [];
    group.push(point);
    groups.set(point.node.category, group);
  }
  const links: { key: string; x1: number; y1: number; x2: number; y2: number; blocked: boolean }[] = [];
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        links.push({
          key: `${group[i].node.gameId}-${group[j].node.gameId}`,
          x1: group[i].x,
          y1: group[i].y,
          x2: group[j].x,
          y2: group[j].y,
          // DESIGN_SYSTEM.md § Mapa de fases: caminho pontilhado pra trechos bloqueados.
          blocked: group[i].node.state === "bloqueado" || group[j].node.state === "bloqueado",
        });
      }
    }
  }
  return links;
}

export function PhaseMapCard({ progress }: { progress: Record<string, GameProgress> }) {
  const remoteGames = useGameStore((state) => state.remoteGames);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);
  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);
  const { nodes, nextGame } = useMemo(() => buildPhaseMap(progress, remoteGames), [progress, remoteGames]);
  const points = useMemo(() => scatterNodes(nodes), [nodes]);
  const links = useMemo(() => categoryLinks(points), [points]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = points.find((p) => p.node.gameId === hoveredId);

  return (
    <Surface>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mapa de fases</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">Sua evolução, fase a fase</h2>
        </div>
        {nextGame ? (
          <Link
            href={`/games/${nextGame.category}/${nextGame.id}`}
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Ir ao treino
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {points.length ? (
        <>
          <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="w-full" role="img" aria-label="Mapa de fases: todos os jogos por nível de domínio">
            {links.map((link) => (
              <line
                key={link.key}
                x1={link.x1}
                y1={link.y1}
                x2={link.x2}
                y2={link.y2}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                strokeDasharray={link.blocked ? "3 4" : undefined}
              />
            ))}
            {points.map((p) => (
              <circle
                key={p.node.gameId}
                cx={p.x}
                cy={p.y}
                r={NODE_RADIUS}
                fill={STATE_COLOR[p.node.state]}
                stroke="hsl(var(--card))"
                strokeWidth={2}
                className="cursor-pointer"
                onPointerEnter={(event) => event.pointerType !== "touch" && setHoveredId(p.node.gameId)}
                onPointerLeave={(event) => event.pointerType !== "touch" && setHoveredId((current) => (current === p.node.gameId ? null : current))}
                onClick={() => setHoveredId((current) => (current === p.node.gameId ? null : p.node.gameId))}
              >
                <title>
                  {p.node.name} — {STATE_LABEL[p.node.state]}
                </title>
              </circle>
            ))}
            {hovered ? (
              <text
                x={hovered.x}
                y={hovered.y - NODE_RADIUS - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="hsl(var(--foreground))"
                stroke="hsl(var(--card))"
                strokeWidth={4}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {hovered.node.name}
              </text>
            ) : null}
          </svg>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {LEGEND_ORDER.map((state) => (
              <span key={state} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: STATE_COLOR[state] }} aria-hidden="true" />
                {STATE_LABEL[state]}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">Jogue sua primeira fase pra começar seu mapa.</p>
      )}
    </Surface>
  );
}
