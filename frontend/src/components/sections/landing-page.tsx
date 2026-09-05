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
  LogoMarquee,
  PlanCard,
  ProcessStep,
  TestimonialCard,
} from "@/components/sections/marketing/manuscript";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "@/features/marketing/pricing-plans";
import { HUBS } from "@/features/gamification/symptoms";

const ROTATIONS = [-2.5, 1.5, -1, 2, -1.5, 1, -2] as const;

/**
 * ATENÇÃO — placeholder de exemplo, não é métrica real. Donc está em pré-lançamento, sem base de
 * alunos própria ainda. Trocar por número real (ou remover a faixa) antes do lançamento.
 */
const FACTS = [
  { value: "+50 mil", label: "redações corrigidas" },
  { value: "4,9 ★", label: "avaliação dos alunos" },
  { value: "+180 pts", label: "de evolução média" },
];

/** ATENÇÃO — placeholder de exemplo, não é lista de parceiros/aprovações reais. Ver FACTS acima. */
const PARTNER_UNIVERSITIES = ["USP", "Unicamp", "UFRJ", "UFMG", "UnB", "UFRGS", "UFSC", "UFPR", "UFBA", "UNESP", "PUC-Rio", "ITA"];

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
        <section className="marketing-container relative pb-6 pt-10 md:pt-16 lg:pb-10">
          <div className="pointer-events-none absolute -right-16 -top-10 -z-10 hidden w-[30rem] opacity-80 sm:block lg:w-[38rem]" aria-hidden="true">
            <Image src="/marketing/hero-manuscript-texture.png" alt="" width={1536} height={1024} priority sizes="38rem" className="h-auto w-full" />
          </div>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <FadeIn>
              <HeroBadge icon={PenLine}>Redação para o ENEM, do rascunho ao 1000</HeroBadge>
              <h1 className="font-display mt-5 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-normal text-foreground sm:text-5xl lg:text-6xl">
                A gente lê sua redação como a banca lê.
              </h1>
              <p className="marketing-copy mt-5 max-w-xl text-lg">
                Cada texto que você manda volta com o diagnóstico exato: onde a nota está travando, competência a competência — não um
                número solto.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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

        <section className="marketing-container pb-14 pt-2 lg:pb-16">
          <FadeIn>
            <LogoMarquee names={PARTNER_UNIVERSITIES} caption="Aprovados nas maiores universidades do país" />
          </FadeIn>
        </section>

        <section className="marketing-container marketing-section">
          <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
            <p className="marketing-kicker">Sete jeitos de travar</p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              A gente aponta qual é o seu.
            </h2>
            <p className="marketing-copy mt-3 text-base">
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

        <div className="bg-card">
          <section id="como" className="marketing-container marketing-section">
            <FadeIn className="mx-auto mb-12 max-w-2xl text-center">
              <p className="marketing-kicker">Como funciona</p>
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
        </div>

        <section id="recursos" className="marketing-container marketing-section">
          <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
            <p className="marketing-kicker">Recursos</p>
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

        <div className="bg-card">
          <section id="planos" className="marketing-container marketing-section">
            <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
              <p className="marketing-kicker">Planos</p>
              <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Escolha como quer evoluir.
              </h2>
              <p className="marketing-copy mt-3 text-base">
                Acesso completo desde o primeiro dia — escolha mensal ou anual.{" "}
                <Link href="/pricing" className="font-semibold text-primary">
                  Ver planos completos
                </Link>
                .
              </p>
            </FadeIn>
            <div className="mx-auto grid max-w-2xl gap-5 sm:grid-cols-2">
              {PRICING_PLANS.map((plan, index) => (
                <FadeIn key={plan.name} delay={index * 0.06}>
                  <PlanCard {...plan} period={plan.name === "Anual" ? "/ano" : "/mês"} />
                </FadeIn>
              ))}
            </div>
          </section>
        </div>

        <section className="marketing-container marketing-section">
          <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
            <p className="marketing-kicker">Como seria usar o Donc</p>
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

        <section className="marketing-container pb-20 pt-6">
          <FadeIn className="marketing-cta flex flex-col items-center gap-6 rounded-[22px] px-6 py-14 text-center sm:py-16">
            <h2 className="font-display max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Manda a próxima redação e descubra onde ela está travando.
            </h2>
            <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90">
              <Link href="/cadastro">
                Criar conta
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </FadeIn>
        </section>
      </main>
    </MarketingShell>
  );
}
