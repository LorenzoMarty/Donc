"use client";

import Link from "next/link";
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
  GraduationCap,
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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/utils";

const features = [
  { title: "Jogos rápidos", text: "Conectivos, interpretação e argumentação em fases curtas com combo, XP e feedback imediato.", icon: Gamepad2, tone: "bg-primary text-primary-foreground" },
  { title: "Redação ENEM", text: "Editor A4, repertório guiado, análise por competência e correção com IA.", icon: FilePenLine, tone: "bg-secondary text-secondary-foreground" },
  { title: "Trilhas guiadas", text: "Português em campanha: desbloqueios, boss stage, revisão e avanço controlado.", icon: Layers3, tone: "bg-accent text-accent-foreground" },
  { title: "Conquistas", text: "Troféus por raridade, objetivos secretos e platina para completar a jornada.", icon: Trophy, tone: "bg-foreground text-background" },
];

const games = [
  { title: "Connect Flow", text: "Encaixe conectivos e veja o texto ganhar coesão.", icon: Zap },
  { title: "Argument Rush", text: "Escolha o argumento mais forte antes do tempo acabar.", icon: Brain },
  { title: "Repertório Hunter", text: "Desbloqueie referências úteis para temas prováveis.", icon: Medal },
  { title: "Essay Builder", text: "Monte introdução, tese e intervenção como peças de estratégia.", icon: PenTool },
];

const campaign = [
  { label: "Fase 1", title: "Interpretação", status: "Liberada", icon: Play },
  { label: "Fase 2", title: "Conectivos", status: "Combo x3", icon: Zap },
  { label: "Fase 3", title: "Argumentação", status: "Em progresso", icon: Target },
  { label: "Boss", title: "Redação rápida", status: "Bloqueado", icon: Crown },
];

export function LandingPage() {
  return (
    <MarketingShell>
      <main className="overflow-hidden">
        <section className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <div className="game-surface relative min-h-[570px] overflow-hidden bg-foreground p-4 text-background md:p-6 lg:p-8">
            <img src="/study-collaboration.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-foreground/70" aria-hidden="true" />
            <div className="relative grid min-h-[530px] gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
              <Reveal className="max-w-4xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border-2 border-background bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground shadow-[0_3px_0_hsl(var(--background))]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Português e Redação em modo campanha
                </div>
                <h1 className="text-5xl font-black leading-[0.95] tracking-normal md:text-7xl lg:text-8xl">Donk ENEM</h1>
                <p className="mt-5 max-w-2xl text-lg font-semibold leading-7 text-background/82 md:text-2xl md:leading-9">
                  Estude como quem avança de fase: jogos rápidos, redação com IA, trilhas guiadas e conquistas para manter ritmo todos os dias.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="bg-primary text-primary-foreground">
                    <Link href="/cadastro">
                      Começar campanha
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
              { value: "12", label: "tipos de missão para estudar sem travar" },
              { value: "XP", label: "recompensa visual a cada prática" },
              { value: "1000", label: "meta final para redação" },
            ]}
          />
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-2 md:px-6 xl:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <HoverGlowCard key={feature.title} delay={index * 0.05}>
                <div className={cn("mb-5 grid h-12 w-12 place-items-center rounded-2xl border-2 border-foreground shadow-[0_3px_0_hsl(var(--foreground))]", feature.tone)}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-black tracking-normal">{feature.title}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">{feature.text}</p>
              </HoverGlowCard>
            );
          })}
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <div className="game-surface h-full bg-primary p-5 text-primary-foreground md:p-7">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-background/70 px-3 py-1 text-xs font-black text-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
                <Flame className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Fluxo contínuo
              </div>
              <h2 className="text-3xl font-black tracking-normal md:text-5xl">A próxima fase sempre fica clara.</h2>
              <p className="mt-4 text-sm font-semibold leading-6 text-foreground/74 md:text-base">
                Sem listas infinitas. O aluno abre uma trilha, joga uma fase curta, recebe recompensa e já sabe qual é o próximo passo.
              </p>
              <Button asChild className="mt-7 bg-foreground text-background">
                <Link href="/exercicios">
                  Ver jogos
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
                <p className="text-xs font-black uppercase text-muted-foreground">Laboratório de redação</p>
                <h2 className="mt-2 text-3xl font-black tracking-normal md:text-5xl">Escrever fica mais leve quando o foco parece uma folha real.</h2>
                <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-muted-foreground md:text-base">
                  A redação tem modo foco em A4, banco de conectivos, repertórios por tema e mini jogos para treinar coesão antes da correção.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["A4", "IA por competência", "Repertório", "Conectivos"].map((item) => (
                    <span key={item} className="game-chip bg-primary/12 px-3 py-2 text-xs font-black text-foreground">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <EssaySheetPreview />
            </div>
          </MovingBorderPanel>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-2 md:px-6 xl:grid-cols-4">
          {games.map((game, index) => {
            const Icon = game.icon;
            return (
              <HoverGlowCard key={game.title} delay={index * 0.05} className="min-h-[190px]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-foreground bg-secondary text-secondary-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="rounded-full border-2 border-foreground bg-primary px-2 py-1 text-[11px] font-black text-primary-foreground">+XP</span>
                </div>
                <h3 className="text-lg font-black tracking-normal">{game.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">{game.text}</p>
              </HoverGlowCard>
            );
          })}
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="game-surface grid gap-6 bg-primary p-5 text-primary-foreground md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="text-xs font-black uppercase text-foreground/62">Pronto para sair da lista de exercícios?</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal md:text-5xl">Entre e comece pela sua primeira fase.</h2>
            </div>
            <Button asChild size="lg" className="bg-foreground text-background">
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
            <div className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-foreground bg-primary text-primary-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-black">Campanha de hoje</p>
              <p className="text-xs font-bold text-muted-foreground">42 min de foco</p>
            </div>
          </div>
          <span className="rounded-full border-2 border-foreground bg-accent px-3 py-1 text-xs font-black text-accent-foreground shadow-[0_2px_0_hsl(var(--foreground))]">Nível 8</span>
        </div>

        <div className="grid gap-3">
          <PreviewTile icon={Flame} label="Sequência" value="12 dias" progress={86} />
          <PreviewTile icon={Award} label="Troféus" value="18/32" progress={56} />
          <PreviewTile icon={BookOpenCheck} label="Trilha ativa" value="Coesão" progress={68} />
        </div>

        <div className="game-tile mt-3 bg-primary/14 p-3">
          <div className="mb-2 flex items-center justify-between text-sm font-black">
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
    <div className="game-tile bg-card p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl border-2 border-foreground bg-primary text-primary-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-lg font-black tracking-normal">{value}</p>
      </div>
      <p className="mb-2 text-xs font-bold text-muted-foreground">{label}</p>
      <Progress value={progress} />
    </div>
  );
}

function CampaignCard({
  step,
  index,
}: {
  step: { label: string; title: string; status: string; icon: LucideIcon };
  index: number;
}) {
  const Icon = step.icon;
  const locked = step.status === "Bloqueado";

  return (
    <Reveal delay={index * 0.04}>
      <div className={cn("game-tile min-h-[160px] bg-card p-4", locked && "opacity-70")}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="rounded-full border-2 border-foreground bg-muted px-3 py-1 text-xs font-black">{step.label}</span>
          <div className={cn("grid h-11 w-11 place-items-center rounded-2xl border-2 border-foreground shadow-[0_3px_0_hsl(var(--foreground))]", locked ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground")}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <h3 className="text-xl font-black tracking-normal">{step.title}</h3>
        <p className="mt-3 text-sm font-bold text-muted-foreground">{step.status}</p>
      </div>
    </Reveal>
  );
}

function EssaySheetPreview() {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="aspect-[210/297] border-2 border-primary bg-[#fffdf7] p-5 text-foreground shadow-[0_5px_0_hsl(var(--primary))]">
        <div className="mb-4 h-3 w-2/3 rounded-full bg-primary/40" />
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-muted" />
          <div className="h-2 w-11/12 rounded-full bg-muted" />
          <div className="h-2 w-10/12 rounded-full bg-muted" />
          <div className="h-2 w-full rounded-full bg-muted" />
          <div className="h-2 w-8/12 rounded-full bg-muted" />
        </div>
        <div className="mt-5 rounded-xl border-2 border-foreground bg-primary/12 p-3 text-xs font-black">
          C1 180 • C2 200 • C3 180
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs font-black text-accent">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Pronta para correção
        </div>
      </div>
    </div>
  );
}
