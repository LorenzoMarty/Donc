"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PenLine, Sparkles, TrendingUp, Video, Gamepad2, Target, LineChart, Compass } from "lucide-react";

import { MarketingShell } from "@/components/sections/marketing-shell";
import {
  AnnotatedManuscript,
  FactRow,
  FadeIn,
  FeatureCard,
  HeroBadge,
  HubTag,
  ProcessStep,
  ReportSlip,
  TestimonialCard,
} from "@/components/sections/marketing/manuscript";
import { Button } from "@/components/ui/button";
import { HUBS } from "@/features/gamification/symptoms";

const ROTATIONS = [-2.5, 1.5, -1, 2, -1.5, 1, -2] as const;

const FACTS = [
  { value: "5", label: "competências do ENEM avaliadas" },
  { value: "7", label: "hubs de diagnóstico cognitivo" },
  { value: "Minutos", label: "correção por IA, não semanas" },
];

const STEPS = [
  { number: 1, title: "Escreva", description: "Escolha um tema real do ENEM e escreva na folha digital, com linhas e contador.", icon: PenLine },
  { number: 2, title: "Receba o diagnóstico", description: "Análise por competência (C1–C5), com pontos fortes e o que travou em cada trecho.", icon: Sparkles },
  { number: 3, title: "Evolua", description: "Treinos gamificados focados no seu ponto fraco e um painel que mostra sua evolução.", icon: TrendingUp },
];

const FEATURES = [
  { title: "Correção que ensina", description: "Não é só a nota: comentários trecho a trecho mostram por que você perdeu (ou ganhou) pontos.", icon: Sparkles, featured: true },
  { title: "Aulas em vídeo", description: "Trilhas do básico ao avançado, com professores que decompõem a redação nota 1000.", icon: Video },
  { title: "Treino gamificado", description: "Mini-jogos de coesão, argumentação e repertório para fixar sem decoreba.", icon: Gamepad2 },
  { title: "Temas de verdade", description: "Banco de propostas no formato ENEM, com textos motivadores e nível de dificuldade.", icon: Target },
  { title: "Raio-X do escritor", description: "Veja sua média por competência e acompanhe o mapa de fases da sua evolução.", icon: LineChart },
  { title: "Foco no seu ponto fraco", description: "O motor adaptativo detecta onde você trava e prioriza treinos e temas ali.", icon: Compass },
];

const TESTIMONIALS = [
  { quote: "A correção por competência foi um divisor de águas. Entendi exatamente onde perdia na C4.", name: "Marina Costa", role: "Aluno(a) do 3º ano" },
  { quote: "Os mini-jogos viciam de um jeito bom. Estudar conectivos virou rotina e minha coesão melhorou.", name: "Lucas Ferreira", role: "Aluno(a) do 3º ano" },
  { quote: "O painel me mostra a evolução de verdade. Ver o mapa de fases preencher me mantém motivada.", name: "Beatriz Almeida", role: "Aluno(a) do 3º ano" },
];

export function LandingPage() {
  const hubs = Object.values(HUBS);

  return (
    <MarketingShell>
      <main>
        <section className="relative mx-auto max-w-6xl px-4 pb-4 pt-10 md:px-6 md:pt-16">
          <div className="pointer-events-none absolute -right-16 -top-10 -z-10 hidden w-[30rem] opacity-80 sm:block lg:w-[38rem]" aria-hidden="true">
            <Image src="/marketing/hero-manuscript-texture.png" alt="" width={1536} height={1024} priority sizes="38rem" className="h-auto w-full" />
          </div>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <FadeIn>
              <HeroBadge icon={PenLine}>Redação para o ENEM, do rascunho ao 1000</HeroBadge>
              <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                A gente lê sua redação como a banca lê.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
                Cada texto que você manda volta com o diagnóstico exato: onde a nota está travando, competência a competência — não um
                número solto.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/cadastro">
                    Corrigir minha primeira redação
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Já tenho conta</Link>
                </Button>
              </div>
              <FactRow facts={FACTS} />
            </FadeIn>

            <FadeIn delay={0.1}>
              <AnnotatedManuscript
                intro="A desigualdade no acesso à educação de qualidade"
                segments={[
                  { phrase: "configura-se, na contemporaneidade, como um entrave à plena cidadania.", hubLabel: "Texto artificial", color: HUBS["texto-robotico"].accent },
                  "Sabe-se que a educação é um direito garantido pela Constituição Federal de 1988. Portanto,",
                  { phrase: "é necessário que o governo faça algo para mudar essa realidade", hubLabel: "Argumentação rasa", color: HUBS["nao-aprofunda"].accent },
                  "e",
                  { phrase: "garantir um futuro melhor para todos os brasileiros.", hubLabel: "Conclusão clichê", color: HUBS["conclusao-formula"].accent },
                ]}
              />
            </FadeIn>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Sete jeitos de travar</p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              A gente aponta qual é o seu.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Cada hub treina um bloqueio real de redação — não uma lista de &ldquo;habilidades&rdquo; genérica.
            </p>
          </FadeIn>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-8">
            {hubs.map((hub, index) => (
              <FadeIn key={hub.id} delay={index * 0.04}>
                <HubTag
                  title={hub.title}
                  description={hub.description}
                  icon={hub.icon}
                  color={hub.accent}
                  rotation={ROTATIONS[index % ROTATIONS.length]}
                />
              </FadeIn>
            ))}
          </div>
        </section>

        <section id="como" className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <FadeIn className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Como funciona</p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Um ciclo simples que faz sua nota subir.
            </h2>
          </FadeIn>
          <div className="grid gap-10 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <FadeIn key={step.title} delay={index * 0.08}>
                <ProcessStep {...step} />
              </FadeIn>
            ))}
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Recursos</p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Tudo para escrever a redação nota 1000.
            </h2>
          </FadeIn>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <FadeIn key={feature.title} delay={index * 0.05}>
                <FeatureCard {...feature} />
              </FadeIn>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <FadeIn>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Diagnóstico por competência</p>
              <h2 className="font-display mt-2 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
                Não é &ldquo;sua redação tirou 720&rdquo;. É por quê.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
                A correção segue as 5 competências do ENEM. Você vê exatamente qual delas está te custando pontos e qual treinar primeiro
                pra virar o jogo.
              </p>
              <Button asChild className="mt-6">
                <Link href="/cadastro">
                  Ver meu diagnóstico
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </FadeIn>
            <FadeIn delay={0.1} className="mx-auto w-full max-w-sm">
              <ReportSlip />
            </FadeIn>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Como seria usar o Donc</p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Cenários ilustrativos de quem treina toda semana.
            </h2>
          </FadeIn>
          <div className="grid gap-5 sm:grid-cols-3">
            {TESTIMONIALS.map((testimonial, index) => (
              <FadeIn key={testimonial.name} delay={index * 0.06}>
                <TestimonialCard {...testimonial} />
              </FadeIn>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-6">
          <FadeIn className="flex flex-col items-center gap-6 border-t border-dashed border-border pt-12 text-center">
            <h2 className="font-display max-w-xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              Manda a próxima redação e descubra onde ela está travando.
            </h2>
            <Button asChild size="lg">
              <Link href="/cadastro">
                Criar conta grátis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </FadeIn>
        </section>
      </main>
    </MarketingShell>
  );
}
