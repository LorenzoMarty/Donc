"use client";

import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Crown,
  FilePenLine,
  Flame,
  Gamepad2,
  Layers3,
  Medal,
  PenTool,
  Play,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { HoverGlowCard, MetricRail, MovingBorderPanel, Reveal } from "@/components/sections/aceternity-primitives";
import { MarketingShell } from "@/components/sections/marketing-shell";
import { AnimatedGameCard, InteractiveMascot, SmoothProgressPath } from "@/components/shared/motion-system";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/utils";

const features = [
  {
    title: "Praticas rapidas",
    text: "Conectivos, interpretacao e argumentacao em sessoes curtas com feedback imediato.",
    icon: Gamepad2,
    tone: "bg-primary text-primary-foreground",
  },
  {
    title: "Redação ENEM",
    text: "Editor A4, repertório guiado, análise por competência e correção com IA.",
    icon: FilePenLine,
    tone: "bg-primary/10 text-primary",
  },
  {
    title: "Trilhas guiadas",
    text: "Portugues em sequencias organizadas: revisao, pratica e avanco controlado.",
    icon: Layers3,
    tone: "bg-accent text-accent-foreground",
  },
  {
    title: "Evolucao",
    text: "Marcos discretos para registrar constancia, dominio e qualidade de escrita.",
    icon: Trophy,
    tone: "bg-primary/12 text-primary",
  },
];

const games = [
  { title: "Conectivo preciso", text: "Selecione conectivos e refine a coesao textual.", icon: Zap },
  { title: "Argumentacao", text: "Escolha o argumento mais forte para sustentar a tese.", icon: Brain },
  { title: "Repertorio produtivo", text: "Ative referencias uteis para temas provaveis.", icon: Medal },
  { title: "Estrutura textual", text: "Organize introducao, tese e intervencao com clareza.", icon: PenTool },
];

const campaign = [
  { label: "Etapa 1", title: "Interpretacao", status: "Disponivel", icon: Play },
  { label: "Etapa 2", title: "Conectivos", status: "Em revisao", icon: Zap },
  { label: "Etapa 3", title: "Argumentacao", status: "Em progresso", icon: Target },
  { label: "Etapa 4", title: "Redacao curta", status: "A seguir", icon: Crown },
];

export function LandingPage() {
  return (
    <MarketingShell>
      <main>
        <section className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <div className="game-surface relative min-h-[calc(100dvh-9rem)] overflow-clip bg-card p-4 text-foreground md:min-h-[570px] md:p-6 lg:p-8">
            <Image
              src="/study-collaboration.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="pointer-events-none absolute inset-0 object-cover opacity-35"
            />
            <div className="pointer-events-none absolute inset-0 bg-background/76" aria-hidden="true" />
            <div className="relative grid min-h-[calc(100dvh-11rem)] gap-6 md:min-h-[530px] lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26.25rem)] lg:items-center">
              <Reveal className="max-w-4xl">
                <div className="game-chip mb-5 inline-flex items-center gap-2 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Portugues e Redacao com rotina guiada
                </div>
                <h1 className="text-5xl font-semibold leading-[0.95] tracking-normal md:text-6xl lg:text-7xl">
                  Donc ENEM
                </h1>
                <p className="mt-5 max-w-2xl text-lg font-medium leading-7 text-muted-foreground md:text-2xl md:leading-9">
                  Pratique escrita com constancia: aulas, redacao com IA, exercicios curtos e indicadores de evolucao real.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="bg-primary text-primary-foreground">
                    <Link href="/cadastro">
                      Comecar rotina
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="bg-background text-foreground">
                    <Link href="/login">Entrar</Link>
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <HeroConsole />
              </Reveal>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <MetricRail
            items={[
              { value: "5", label: "competências ENEM acompanhadas" },
              { value: "12", label: "formatos de pratica para estudar sem travar" },
              { value: "PTS", label: "reforco secundario de consistencia" },
              { value: "1000", label: "meta final para redação" },
            ]}
          />
        </section>

        <section className="fluid-grid mx-auto max-w-7xl gap-4 px-4 py-8 [--grid-min:15rem] md:px-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <HoverGlowCard key={feature.title} delay={index * 0.05}>
                <div className={cn("mb-5 grid h-10 w-10 place-items-center rounded-md border border-primary/25", feature.tone)}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-semibold tracking-normal">{feature.title}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">{feature.text}</p>
              </HoverGlowCard>
            );
          })}
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <div className="game-surface h-full bg-primary p-5 text-primary-foreground md:p-7">
              <div className="game-chip mb-5 inline-flex items-center gap-2 bg-background/70 px-3 py-1 text-xs font-semibold text-foreground">
                <Flame className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Fluxo contínuo
              </div>
              <h2 className="text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
                O proximo passo sempre fica claro.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-6 text-foreground/74 md:text-base">
                Sem listas infinitas. O aluno abre uma trilha, conclui uma pratica curta, recebe feedback e sabe qual e o proximo passo.
              </p>
              <Button asChild className="mt-7 bg-background text-foreground hover:bg-background/90">
                <Link href="/games">
                  Ver praticas
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {campaign.map((step, index) => (
              <CampaignCard key={step.title} step={step} index={index} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <MovingBorderPanel>
            <div className="grid gap-6 p-5 md:grid-cols-[1fr_0.85fr] md:p-8 lg:p-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Laboratorio de redacao</p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
                  Escrever fica mais leve em uma tela limpa e direta.
                </h2>
                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-muted-foreground md:text-base">
                  A redacao tem editor compacto, banco de conectivos, repertorios por tema e praticas curtas para treinar coesao antes da
                  correcao.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["A4", "IA por competência", "Repertório", "Conectivos"].map((item) => (
                    <span key={item} className="game-chip bg-primary/12 px-3 py-2 text-xs font-semibold text-foreground">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <EssaySheetPreview />
            </div>
          </MovingBorderPanel>
        </section>

        <section className="fluid-grid mx-auto max-w-7xl gap-4 px-4 py-8 [--grid-min:15rem] md:px-6">
          {games.map((game, index) => {
            const Icon = game.icon;
            return (
              <HoverGlowCard key={game.title} delay={index * 0.05} className="min-h-[190px]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="game-chip bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">PTS</span>
                </div>
                <h3 className="text-lg font-semibold tracking-normal">{game.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">{game.text}</p>
              </HoverGlowCard>
            );
          })}
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="game-surface grid gap-6 bg-primary p-5 text-primary-foreground md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/62">
                Pronto para sair da lista de exercicios?
              </p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
                Entre e comece pela sua primeira pratica.
              </h2>
            </div>
            <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90">
              <Link href="/cadastro">
                Criar conta
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}

function HeroConsole() {
  return (
    <div className="relative">
      <div className="game-surface bg-background p-4 text-foreground">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <InteractiveMascot size="sm" mood="happy" />
            <div>
              <p className="text-sm font-semibold">Rotina de hoje</p>
              <p className="text-xs font-bold text-muted-foreground">42 min de foco</p>
            </div>
          </div>
          <span className="game-chip bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Consistencia 8</span>
        </div>

        <div className="grid gap-3">
          <PreviewTile icon={Flame} label="Sequência" value="12 dias" progress={86} />
          <PreviewTile icon={Award} label="Marcos" value="18/32" progress={56} />
          <PreviewTile icon={BookOpenCheck} label="Trilha ativa" value="Coesão" progress={68} />
        </div>

        <div className="mt-3">
          <SmoothProgressPath progress={72} />
        </div>

        <div className="game-tile mt-3 bg-primary/14 p-3">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold">
            <span>Nota estimada</span>
            <span>920</span>
          </div>
          <Progress value={92} />
        </div>
      </div>
    </div>
  );
}

function PreviewTile({ icon: Icon, label, value, progress }: { icon: LucideIcon; label: string; value: string; progress: number }) {
  return (
    <AnimatedGameCard className="bg-card p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-lg font-semibold tracking-normal">{value}</p>
      </div>
      <p className="mb-2 text-xs font-bold text-muted-foreground">{label}</p>
      <Progress value={progress} />
    </AnimatedGameCard>
  );
}

function CampaignCard({ step, index }: { step: { label: string; title: string; status: string; icon: LucideIcon }; index: number }) {
  const Icon = step.icon;
  const locked = step.status === "Bloqueado";

  return (
    <Reveal delay={index * 0.04}>
      <AnimatedGameCard className={cn("min-h-[160px] bg-card p-4", locked && "opacity-70")}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="game-chip bg-muted/70 px-3 py-1 text-xs font-semibold text-muted-foreground">{step.label}</span>
          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-md border border-primary/25",
              locked ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <h3 className="text-xl font-semibold tracking-normal">{step.title}</h3>
        <p className="mt-3 text-sm font-bold text-muted-foreground">{step.status}</p>
      </AnimatedGameCard>
    </Reveal>
  );
}

function EssaySheetPreview() {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="aspect-[210/297] rounded-md border border-border bg-card p-5 text-[#333333] shadow-[0_18px_40px_rgba(20,30,55,.14)]">
        <div className="mb-4 h-3 w-2/3 rounded-full bg-primary/40" />
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-muted" />
          <div className="h-2 w-11/12 rounded-full bg-muted" />
          <div className="h-2 w-10/12 rounded-full bg-muted" />
          <div className="h-2 w-full rounded-full bg-muted" />
          <div className="h-2 w-8/12 rounded-full bg-muted" />
        </div>
        <div className="mt-5 rounded-md border border-primary/20 bg-primary/12 p-3 text-xs font-semibold">C1 180 • C2 200 • C3 180</div>
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Pronta para correção
        </div>
      </div>
    </div>
  );
}
