"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";

import { Surface } from "@/components/shared/premium-ui";
import type { GameProgress } from "@/features/gamification/types";
import { buildPhaseMap, type PhaseNode, type PhaseNodeState } from "@/features/profile/phase-map";

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

// Caminho em "linhas de metrô": colunas fixas, linhas alternando direção — trechos horizontais
// dentro de cada linha, verticais na virada de linha (mesma coluna), curvados nos cantos.
const ROW_LENGTHS = [3, 2, 3, 2];
const COLUMNS = [30, 110, 190, 270];
const ROW_HEIGHT = 58;
const TOP_MARGIN = 30;
const BOTTOM_MARGIN = 30;
const NODE_RADIUS = 10;
const CORNER_RADIUS = 16;
const VIEW_WIDTH = 320;

type LaidOutNode = { x: number; y: number; node: PhaseNode };

function layoutNodes(nodes: PhaseNode[]): LaidOutNode[] {
  const points: LaidOutNode[] = [];
  let colIndex = 0;
  let direction: 1 | -1 = 1;
  let row = 0;
  let cursor = 0;

  for (const length of ROW_LENGTHS) {
    if (cursor >= nodes.length) break;
    const y = TOP_MARGIN + row * ROW_HEIGHT;
    const rowCols = Array.from({ length }, (_, i) => (direction === 1 ? colIndex + i : colIndex - i));
    for (const col of rowCols) {
      if (cursor >= nodes.length) break;
      points.push({ x: COLUMNS[col], y, node: nodes[cursor] });
      cursor++;
    }
    colIndex = rowCols[rowCols.length - 1] ?? colIndex;
    direction = direction === 1 ? -1 : 1;
    row++;
  }
  return points;
}

function pointTowards(from: { x: number; y: number }, to: { x: number; y: number }, dist: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const t = Math.min(dist, len) / len;
  return { x: from.x + dx * t, y: from.y + dy * t };
}

function roundedPath(points: { x: number; y: number }[], radius: number): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const into = pointTowards(curr, prev, radius);
    const out = pointTowards(curr, next, radius);
    d += ` L ${into.x} ${into.y} Q ${curr.x} ${curr.y} ${out.x} ${out.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function PhaseMapCard({ progress }: { progress: Record<string, GameProgress> }) {
  const { nodes, nextGame } = useMemo(() => buildPhaseMap(progress), [progress]);
  const points = useMemo(() => layoutNodes(nodes), [nodes]);
  const height = points.length ? Math.max(...points.map((p) => p.y)) + BOTTOM_MARGIN : 140;

  const lastPlayedIndex = points.reduce((acc, p, i) => (p.node.played ? i : acc), -1);
  const solidPoints = points.slice(0, Math.max(lastPlayedIndex + 1, 0));
  const dashedPoints = points.slice(Math.max(lastPlayedIndex, 0));

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
          <svg viewBox={`0 0 ${VIEW_WIDTH} ${height}`} className="w-full" role="img" aria-label="Mapa de fases jogadas e recomendadas">
            {dashedPoints.length > 1 ? (
              <path
                d={roundedPath(dashedPoints, CORNER_RADIUS)}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={2}
                strokeDasharray="4 6"
                strokeLinecap="round"
              />
            ) : null}
            {solidPoints.length > 1 ? (
              <path d={roundedPath(solidPoints, CORNER_RADIUS)} fill="none" stroke="hsl(var(--border))" strokeWidth={2} strokeLinecap="round" />
            ) : null}
            {points.map((p, i) => (
              <circle key={`${p.node.gameId}-${i}`} cx={p.x} cy={p.y} r={NODE_RADIUS} fill={STATE_COLOR[p.node.state]} stroke="hsl(var(--card))" strokeWidth={3}>
                <title>
                  {p.node.name} — {STATE_LABEL[p.node.state]}
                </title>
              </circle>
            ))}
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
