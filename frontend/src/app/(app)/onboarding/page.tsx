"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BarChart3, BookOpen, ChevronRight, Map, PenLine, Sparkles, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

const STORAGE_KEY = "donc.onboarding.v1";

const GOALS = [
  { id: "900+", label: "Nota 900+", description: "Meta máxima no ENEM" },
  { id: "850-900", label: "850 – 900", description: "Alto desempenho" },
  { id: "800-850", label: "800 – 850", description: "Acima da média" },
  { id: "consistencia", label: "Estudar consistência", description: "Hábito diário" },
];

const LEVELS = [
  { id: "iniciante", label: "Iniciante", description: "Ainda não escrevi redações para o ENEM" },
  { id: "intermediario", label: "Intermediário", description: "Já pratiquei, mas quero melhorar" },
  { id: "avancado", label: "Avançado", description: "Treino regularmente, quero otimizar" },
];

const TOUR_SLIDES = [
  {
    icon: Map,
    title: "Jogos de Prática",
    description: "Exercícios curtos de gramática, conectivos e argumentação para treinar todo dia.",
    href: "/games",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  {
    icon: PenLine,
    title: "Editor de Redação",
    description: "Escreva com foco, envie para a IA corrigir e veja sua nota por competência ENEM.",
    href: "/redacao",
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
  },
  {
    icon: BarChart3,
    title: "Painel de Evolução",
    description: "Acompanhe notas, sequências, competências e veja exatamente onde melhorar.",
    href: "/dashboard",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [goal, setGoal] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [tourSlide, setTourSlide] = useState(0);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (step === 0) {
      autoRef.current = setTimeout(() => advance(), 2200);
    }
    return () => { if (autoRef.current) clearTimeout(autoRef.current); };
  }, [step]);

  function advance() {
    if (autoRef.current) clearTimeout(autoRef.current);
    setDirection(1);
    setStep((s) => s + 1);
  }

  function back() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  function finish() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ goal, level, completedAt: new Date().toISOString() }),
    );
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <StepDots total={5} current={step} />

        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <StepShell key="welcome" direction={direction}>
              <WelcomeStep onNext={advance} />
            </StepShell>
          )}
          {step === 1 && (
            <StepShell key="goal" direction={direction}>
              <ChoiceStep
                eyebrow="Passo 1 de 3"
                title="Qual é a sua meta no ENEM?"
                options={GOALS}
                selected={goal}
                onSelect={setGoal}
                onNext={advance}
                onBack={back}
                nextDisabled={!goal}
              />
            </StepShell>
          )}
          {step === 2 && (
            <StepShell key="level" direction={direction}>
              <ChoiceStep
                eyebrow="Passo 2 de 3"
                title="Qual é o seu nível atual?"
                options={LEVELS}
                selected={level}
                onSelect={setLevel}
                onNext={advance}
                onBack={back}
                nextDisabled={!level}
              />
            </StepShell>
          )}
          {step === 3 && (
            <StepShell key="tour" direction={direction}>
              <TourStep
                slide={tourSlide}
                onSlide={setTourSlide}
                onNext={advance}
                onBack={back}
              />
            </StepShell>
          )}
          {step === 4 && (
            <StepShell key="cta" direction={direction}>
              <CTAStep goal={goal} level={level} onFinish={finish} onBack={back} />
            </StepShell>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepShell({ children, direction }: { children: React.ReactNode; direction: number }) {
  return (
    <motion.div
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="mb-8 flex justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 24 : 8, backgroundColor: i === current ? "#FFC300" : "hsl(0 0% 88%)" }}
          transition={{ duration: 0.3 }}
          className="h-2 rounded-full"
        />
      ))}
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/10"
      >
        <Sparkles className="h-10 w-10 text-primary" aria-hidden="true" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-3xl font-bold tracking-tight"
      >
        Bem-vindo ao Donc ENEM
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mt-3 text-muted-foreground"
      >
        Vamos configurar sua experiência em 3 passos rápidos.
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8"
      >
        <Button onClick={onNext} size="lg" className="w-full">
          Começar configuração
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </motion.div>
    </div>
  );
}

function ChoiceStep({
  eyebrow,
  title,
  options,
  selected,
  onSelect,
  onNext,
  onBack,
  nextDisabled,
}: {
  eyebrow: string;
  title: string;
  options: { id: string; label: string; description: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  nextDisabled: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-5 grid gap-3">
        {options.map((opt, i) => (
          <motion.button
            key={opt.id}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.28 }}
            onClick={() => onSelect(opt.id)}
            className={cn(
              "w-full rounded-[var(--radius)] border p-4 text-left transition-all duration-150",
              selected === opt.id
                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                : "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{opt.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{opt.description}</p>
              </div>
              <div
                className={cn(
                  "h-5 w-5 shrink-0 rounded-full border-2 transition-all",
                  selected === opt.id ? "border-primary bg-primary" : "border-border",
                )}
              />
            </div>
          </motion.button>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button onClick={onNext} disabled={nextDisabled} className="flex-[2]">
          Continuar
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function TourStep({
  slide,
  onSlide,
  onNext,
  onBack,
}: {
  slide: number;
  onSlide: (n: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const current = TOUR_SLIDES[slide];
  const Icon = current.icon;
  const isLast = slide === TOUR_SLIDES.length - 1;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Passo 3 de 3 · Tour rápido</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">O que você pode fazer</h2>

      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className={cn("mt-5 rounded-[var(--radius)] border p-6", current.bg)}
        >
          <div className={cn("mb-4 inline-flex rounded-xl border p-3", current.bg)}>
            <Icon className={cn("h-7 w-7", current.color)} aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold">{current.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.description}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex justify-center gap-2">
        {TOUR_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSlide(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-200",
              i === slide ? "w-6 bg-primary" : "w-2 bg-border",
            )}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" type="button">
          Voltar
        </Button>
        {isLast ? (
          <Button onClick={onNext} className="flex-[2]">
            Continuar
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={() => onSlide(slide + 1)} className="flex-[2]">
            Próximo
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

function CTAStep({
  goal,
  level,
  onFinish,
  onBack,
}: {
  goal: string | null;
  level: string | null;
  onFinish: () => void;
  onBack: () => void;
}) {
  const goalLabel = GOALS.find((g) => g.id === goal)?.label ?? goal;
  const levelLabel = LEVELS.find((l) => l.id === level)?.label ?? level;

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, type: "spring" }}
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/10"
      >
        <Target className="h-10 w-10 text-primary" aria-hidden="true" />
      </motion.div>

      <h2 className="text-2xl font-bold tracking-tight">Tudo pronto!</h2>
      <p className="mt-2 text-muted-foreground">Sua experiência foi configurada.</p>

      <div className="mt-6 grid gap-2 text-left">
        <div className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">Meta</span>
          <span className="text-sm font-semibold">{goalLabel}</span>
        </div>
        <div className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">Nível</span>
          <span className="text-sm font-semibold">{levelLabel}</span>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button onClick={onFinish} size="lg" className="flex-[2]">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Ir para o painel
        </Button>
      </div>
    </div>
  );
}
