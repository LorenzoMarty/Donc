"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ScoreAreaChart({ data }: { data: { label: string; score: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -18, right: 8, top: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} domain={[0, 1000]} />
          <Tooltip contentStyle={{ borderRadius: 8, borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }} />
          <Area type="monotone" dataKey="score" stroke="#3A86FF" strokeWidth={3} fill="#3A86FF" fillOpacity={0.12} />
        </AreaChart>
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
          <Bar dataKey="value" fill="#3A86FF" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
