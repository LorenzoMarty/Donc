"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BarChart3, Check, ChevronRight, Map, PenLine, Target, type LucideIcon } from "lucide-react";

import { FolhinhaMascot } from "@/components/shared/folhinha-mascot";
import { apiFetch } from "@/lib/http-client";
import { cn } from "@/utils";

// Ids espelhados em backend/src/schemas/auth.py (OnboardingUpdateRequest.goal Literal) — mudou um
// id aqui, muda lá também, senão o backend rejeita com 422 silenciosamente pro usuário.
const GOALS = [
  { id: "900+", label: "Nota 900+", description: "Mira no topo do ranking" },
  { id: "850-900", label: "850 – 900", description: "Acima da maioria dos candidatos" },
  { id: "800-850", label: "800 – 850", description: "Nota sólida para maioria das cotas" },
  { id: "consistencia", label: "Criar hábito", description: "Escrever com regularidade primeiro" },
];

// Ids espelhados em backend/src/schemas/auth.py (OnboardingUpdateRequest.level Literal) — mesma
// regra do GOALS acima.
const LEVELS = [
  { id: "iniciante", label: "Iniciante", description: "Ainda não escrevi redações para o ENEM" },
  { id: "intermediario", label: "Intermediário", description: "Já escrevi algumas, quero subir a nota" },
  { id: "avancado", label: "Avançado", description: "Escrevo com regularidade, quero afinar" },
];

const TOUR_SLIDES: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  hydraImageUrl?: string;
  hydraVideoUrl?: string;
}[] = [
  {
    icon: Map,
    title: "Aqui você treina seus sintomas",
    description: "Argumentação, repertório, conectivos — cada um vira um treino curto, direto no que está te travando.",
    href: "/games",
  },
  {
    icon: PenLine,
    title: "Aqui você escreve e recebe nota real",
    description: "Escolha um tema, escreva, envie. A IA corrige como o ENEM corrige: nota por competência, não só um número solto.",
    href: "/redacao",
  },
  {
    icon: BarChart3,
    title: "Aqui você acompanha sua evolução",
    description: "Sequência de treino, notas e quais competências ainda travam sua nota — tudo num só lugar.",
    href: "/dashboard",
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
  const totalSteps = 5;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (step === 0) {
      autoRef.current = setTimeout(() => advance(), 2600);
    }
    return () => {
      if (autoRef.current) clearTimeout(autoRef.current);
    };
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
    apiFetch("/auth/onboarding", {
      method: "PUT",
      body: JSON.stringify({ goal, level }),
    }).catch(() => undefined);
    router.push("/dashboard");
  }

  const canBack = step > 0;
  const isLast = step === totalSteps - 1;
  const blocked = (step === 1 && !goal) || (step === 2 && !level);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[hsl(var(--accent-900))]">
      <div className="flex items-center gap-5 px-9 py-6">
        <span className="font-display text-[26px] font-medium text-[hsl(var(--accent-300))]">donc</span>
        <div className="mx-auto flex w-full max-w-[360px] gap-1.5">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={cn("h-[5px] flex-1 rounded-[3px] transition-colors duration-300", index <= step ? "bg-[hsl(var(--accent-300))]" : "bg-white/16")}
            />
          ))}
        </div>
        <Link href="/dashboard" className="text-[14px] font-medium text-white/70 hover:text-white/90">
          Pular
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto px-10 pb-16 pt-5">
        <div className="w-full max-w-[620px] text-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 ? (
                <div className="mb-7 flex justify-center">
                  <FolhinhaMascot mood="happy" size={150} message="Oi, eu sou a Folhinha!" onDark className="[&_svg]:overflow-visible" />
                </div>
              ) : null}

              {step === 0 ? (
                <>
                  <p className="mb-3 text-[14px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--accent-300))]">Boas-vindas ao Donc</p>
                  <h1 className="font-display text-[38px] font-medium leading-[1.15] text-white">
                    Vamos preparar sua jornada rumo ao 1000
                  </h1>
                  <p className="mx-auto mt-3.5 max-w-[520px] text-[17px] leading-relaxed text-white/70">
                    Sou a Folhinha, sua tutora de redação. Em 3 passos rápidos eu personalizo os treinos, aulas e temas pra você.
                  </p>
                </>
              ) : step === 1 ? (
                <ChoiceStepBody kicker="Passo 1 de 3" title="Qual é a sua meta no ENEM?" options={GOALS} selected={goal} onSelect={setGoal} />
              ) : step === 2 ? (
                <ChoiceStepBody kicker="Passo 2 de 3" title="Qual é o seu nível atual?" options={LEVELS} selected={level} onSelect={setLevel} />
              ) : step === 3 ? (
                <TourStepBody slide={tourSlide} onSlide={setTourSlide} />
              ) : (
                <CTAStepBody goal={goal} level={level} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3.5 border-t border-white/8 px-10 py-[26px]">
        {canBack ? (
          <button
            type="button"
            onClick={back}
            className="rounded-[13px] bg-white/10 px-6 py-3.5 text-[15px] font-semibold text-white"
          >
            Voltar
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (isLast) {
              finish();
              return;
            }
            if (step === 3 && tourSlide < TOUR_SLIDES.length - 1) {
              setTourSlide((value) => value + 1);
              return;
            }
            if (!blocked) advance();
          }}
          disabled={blocked}
          className={cn(
            "flex items-center gap-2 rounded-[13px] px-[30px] py-3.5 text-[15px] font-bold transition-colors",
            blocked ? "cursor-not-allowed bg-white/15 text-white/40" : "bg-[hsl(var(--accent-300))] text-[hsl(var(--accent-900))]",
          )}
        >
          {isLast ? "Ir para o painel" : step === 0 ? "Começar" : step === 3 && tourSlide < TOUR_SLIDES.length - 1 ? "Próximo" : "Continuar"}
          <ChevronRight className="h-[17px] w-[17px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ChoiceStepBody({
  kicker,
  title,
  options,
  selected,
  onSelect,
}: {
  kicker: string;
  title: string;
  options: { id: string; label: string; description: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-[14px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--accent-300))]">{kicker}</p>
      <h2 className="font-display text-[38px] font-medium leading-[1.15] text-white">{title}</h2>
      <div className="mt-8 flex flex-col gap-3 text-left">
        {options.map((opt, i) => {
          const active = selected === opt.id;
          return (
            <motion.button
              key={opt.id}
              type="button"
              // Sem fade de opacidade aqui — só o slide (y) — porque essa entrada escalonada por
              // item, empilhada sobre o fade do passo inteiro (slideVariants), deixava o texto
              // visivelmente apagado por ~0.5s a cada passo (baixo contraste percebido).
              initial={{ opacity: 1, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.16 }}
              onClick={() => onSelect(opt.id)}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4.5 text-left transition-colors",
                active
                  ? "border-[hsl(var(--accent-300))] bg-[hsl(var(--accent-300)/14%)]"
                  : "border-transparent bg-white/5 shadow-[0_14px_32px_-18px_rgba(0,0,0,0.6)]",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold text-white">{opt.label}</p>
                <p className="mt-0.5 text-[13px] text-white/75">{opt.description}</p>
              </div>
              <div
                className={cn(
                  "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border-2",
                  active ? "border-transparent bg-[hsl(var(--accent-300))]" : "border-white/20",
                )}
              >
                {active ? <Check className="h-3.5 w-3.5 text-[hsl(var(--accent-900))]" strokeWidth={3} aria-hidden="true" /> : null}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function TourStepBody({ slide, onSlide }: { slide: number; onSlide: (n: number) => void }) {
  const current = TOUR_SLIDES[slide];
  const Icon = current.icon;

  return (
    <div>
      <p className="mb-3 text-[14px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--accent-300))]">Passo 3 de 3 · Tour rápido</p>
      <h2 className="font-display text-[38px] font-medium leading-[1.15] text-white">É assim que você evolui</h2>

      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="mt-6 rounded-2xl bg-white/5 p-6 text-left shadow-[0_20px_44px_-16px_rgba(0,0,0,0.6)]"
        >
          {current.hydraVideoUrl ? (
            <video src={current.hydraVideoUrl} controls className="mb-4 w-full rounded-control object-contain" aria-label="Vídeo da Hydra, a mascote do Donc" />
          ) : current.hydraImageUrl ? (
            <Image src={current.hydraImageUrl} alt="Hydra, a mascote do Donc" width={80} height={80} className="mb-4 rounded-control object-contain" />
          ) : (
            <div className="mb-4 inline-flex rounded-xl bg-[hsl(var(--accent-300)/14%)] p-3">
              <Icon className="h-7 w-7 text-[hsl(var(--accent-300))]" aria-hidden="true" />
            </div>
          )}
          <h3 className="text-[18px] font-semibold text-white">{current.title}</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-white/75">{current.description}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex justify-center gap-2">
        {TOUR_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSlide(i)}
            className={cn("h-2 rounded-full transition-all duration-200", i === slide ? "w-6 bg-[hsl(var(--accent-300))]" : "w-2 bg-white/20")}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function CTAStepBody({ goal, level }: { goal: string | null; level: string | null }) {
  const goalLabel = GOALS.find((g) => g.id === goal)?.label ?? goal;
  const levelLabel = LEVELS.find((l) => l.id === level)?.label ?? level;

  return (
    <div>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, type: "spring" }}
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[hsl(var(--accent-300)/18%)]"
      >
        <Target className="h-9 w-9 text-[hsl(var(--accent-300))]" aria-hidden="true" />
      </motion.div>

      <p className="mb-3 text-[14px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--accent-300))]">Tudo pronto</p>
      <h2 className="font-display text-[38px] font-medium leading-[1.15] text-white">Sua trilha está montada!</h2>
      <p className="mx-auto mt-3.5 max-w-[480px] text-[17px] leading-relaxed text-white/70">
        Assim que você escrever a primeira redação, eu já te aponto exatamente onde focar. Sem enrolação.
      </p>

      <div className="mx-auto mt-7 grid max-w-[380px] gap-2 text-left">
        <div className="flex items-center justify-between rounded-control bg-white/5 px-4 py-3">
          <span className="text-[13px] text-white/75">Meta</span>
          <span className="text-[14px] font-semibold text-white">{goalLabel}</span>
        </div>
        <div className="flex items-center justify-between rounded-control bg-white/5 px-4 py-3">
          <span className="text-[13px] text-white/75">Nível</span>
          <span className="text-[14px] font-semibold text-white">{levelLabel}</span>
        </div>
      </div>
    </div>
  );
}
