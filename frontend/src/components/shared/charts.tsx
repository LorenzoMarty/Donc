"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ScoreAreaChart({ data }: { data: { label: string; score: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -18, right: 8, top: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} domain={[0, 1000]} />
          <Tooltip contentStyle={{ borderRadius: 8, borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }} />
          <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} fill="hsl(var(--primary))" fillOpacity={0.12} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const COMPETENCY_TREND_SERIES: { key: "c1" | "c2" | "c3" | "c4" | "c5"; label: string; color: string }[] = [
  { key: "c1", label: "C1 — Norma culta", color: "hsl(var(--primary))" },
  { key: "c2", label: "C2 — Tema e gênero", color: "hsl(var(--highlight))" },
  { key: "c3", label: "C3 — Argumentação", color: "hsl(var(--streak))" },
  { key: "c4", label: "C4 — Coesão", color: "hsl(var(--chart-c4))" },
  { key: "c5", label: "C5 — Intervenção", color: "hsl(var(--chart-c5))" },
];

export function CompetencyTrendChart({
  data,
}: {
  data: { label: string; c1: number; c2: number; c3: number; c4: number; c5: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -18, right: 8, top: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} domain={[0, 200]} />
          <Tooltip contentStyle={{ borderRadius: 8, borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {COMPETENCY_TREND_SERIES.map((series) => (
            <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={series.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompetencyRadarChart({ data }: { data: { competency: string; value: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="competency" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 200]} tickCount={3} axisLine={false} tick={false} />
          <Tooltip contentStyle={{ borderRadius: 8, borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }} />
          <Radar dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary))" fillOpacity={0.22} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompetencyBarChart({ data }: { data: { competency: string; value: number }[] }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -18, right: 8, top: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="competency" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} domain={[0, 200]} />
          <Tooltip contentStyle={{ borderRadius: 8, borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }} />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
