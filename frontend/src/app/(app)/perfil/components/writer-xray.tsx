"use client";

import Link from "next/link";
import { ArrowRight, BookMarked, Lightbulb, TriangleAlert } from "lucide-react";

import { CompetencyBarChart, ScoreAreaChart } from "@/components/shared/charts";
import { Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { WriterXray } from "@/features/profile/writer-xray";
import { cn } from "@/utils";

export function WriterXraySection({ xray, loading }: { xray: WriterXray | null; loading: boolean }) {
  if (loading) {
    return (
      <Surface>
        <SectionTitle eyebrow="Raio-X do escritor" title="Lendo sua escrita..." />
        <div className="mt-4 grid gap-3">
          <div className="h-60 animate-pulse rounded-md bg-muted/50" />
        </div>
      </Surface>
    );
  }

  if (!xray || xray.isEmpty) {
    return (
      <Surface>
        <SectionTitle eyebrow="Raio-X do escritor" title="Corrija uma redação para ver seu diagnóstico" />
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Depois da primeira correção, o Raio-X mostra sua nota por competência, os erros que se repetem e o que treinar.
        </p>
        <Button asChild className="mt-4">
          <Link href="/redacao">
            Escrever uma redação
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </Surface>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 xl:grid-cols-2">
        {xray.hasScores ? (
          <Surface>
            <SectionTitle eyebrow="Competências" title="Nota por competência ENEM" />
            <div className="mt-4">
              <CompetencyBarChart data={xray.competencyBars} />
            </div>
          </Surface>
        ) : null}
        {xray.hasTrend ? (
          <Surface>
            <SectionTitle eyebrow="Evolução" title="Nota das últimas redações" />
            <div className="mt-4">
              <ScoreAreaChart data={xray.trend} />
            </div>
          </Surface>
        ) : null}
      </section>

      {xray.weakCompetencies.length ? (
        <Surface>
          <SectionTitle eyebrow="Pontos fracos" title="Competências com mais perda de nota" icon={TriangleAlert} tone="warning" />
          <div className="mt-4 grid gap-3">
            {xray.weakCompetencies.map((weak) => (
              <div key={weak.code} className="game-tile bg-background/56 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{weak.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {weak.count} {weak.count === 1 ? "ocorrência" : "ocorrências"}
                  </Badge>
                </div>
                <Progress value={Math.min(100, weak.count * 20)} className="h-2" />
              </div>
            ))}
          </div>
        </Surface>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {xray.recurringErrors.length ? (
          <ListSurface
            eyebrow="Erros recorrentes"
            title="O que aparece em mais de uma redação"
            icon={TriangleAlert}
            tone="warning"
            items={xray.recurringErrors}
          />
        ) : null}
        {xray.recommendations.length ? (
          <ListSurface
            eyebrow="Recomendações"
            title="Próximos passos de treino"
            icon={Lightbulb}
            tone="highlight"
            items={xray.recommendations}
          />
        ) : null}
      </section>

      {xray.repertories.length ? (
        <Surface>
          <SectionTitle eyebrow="Repertório" title="Referências que você já usou" icon={BookMarked} />
          <div className="mt-4 flex flex-wrap gap-2">
            {xray.repertories.map((item) => (
              <Badge key={item} variant="secondary" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </Surface>
      ) : null}
    </div>
  );
}

const SECTION_TONE = {
  primary: "text-primary",
  warning: "text-destructive",
  highlight: "text-highlight",
} as const;

function ListSurface({
  eyebrow,
  title,
  icon,
  tone = "primary",
  items,
}: {
  eyebrow: string;
  title: string;
  icon: typeof Lightbulb;
  tone?: keyof typeof SECTION_TONE;
  items: string[];
}) {
  return (
    <Surface>
      <SectionTitle eyebrow={eyebrow} title={title} icon={icon} tone={tone} />
      <ul className="mt-4 grid gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 rounded-control bg-muted/60 p-3 text-sm leading-6">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function SectionTitle({
  eyebrow,
  title,
  icon: Icon,
  tone = "primary",
}: {
  eyebrow: string;
  title: string;
  icon?: typeof Lightbulb;
  tone?: keyof typeof SECTION_TONE;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-normal">{title}</h2>
      </div>
      {Icon ? <Icon className={cn("h-5 w-5 shrink-0", SECTION_TONE[tone])} aria-hidden="true" /> : null}
    </div>
  );
}
