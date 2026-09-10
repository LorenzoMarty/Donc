import Link from "next/link";
import { ArrowRight, Brain, GraduationCap, Sparkles } from "lucide-react";

import { AceternityGrid, HoverGlowCard, Reveal } from "@/components/sections/aceternity-primitives";
import { MarketingShell } from "@/components/sections/marketing-shell";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <MarketingShell>
      <main className="marketing-container py-10">
        <AceternityGrid className="p-5 xs:p-6 md:p-10 lg:p-12">
          <Reveal className="max-w-4xl">
            <p className="marketing-kicker">Sobre</p>
            <h1 className="font-display mt-3 text-4xl font-semibold leading-tight tracking-normal md:text-5xl lg:text-6xl">
              Donc existe pra transformar estudo em progresso que você consegue ver.
            </h1>
            <p className="marketing-copy mt-5 text-lg">
              Nasceu de um problema simples: treinar Português e Redação sem saber se está funcionando. A plataforma une correção por IA,
              prática guiada e um jeito claro de acompanhar evolução — pra tirar a dúvida &ldquo;isso está adiantando?&rdquo; do caminho.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/cadastro">
                Criar conta
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </Reveal>
        </AceternityGrid>

        <section className="fluid-grid marketing-section gap-4 [--grid-min:16rem]">
          {[
            { title: "Progresso visível", text: "Nota por competência, sequência de dias e marcos de domínio — não só uma lista de tarefas.", icon: Sparkles },
            { title: "Correção que explica", text: "Feedback por competência do ENEM, com o porquê de cada ponto perdido, não só um número.", icon: Brain },
            { title: "Foco no que cai na prova", text: "Português, Redação e as competências cobradas — sem conteúdo solto que não ajuda na nota.", icon: GraduationCap },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <HoverGlowCard key={item.title} delay={index * 0.05}>
                <Icon className="mb-5 h-6 w-6 text-primary" aria-hidden="true" />
                <h2 className="text-xl font-semibold tracking-normal">{item.title}</h2>
                <p className="marketing-copy mt-3 text-sm">{item.text}</p>
              </HoverGlowCard>
            );
          })}
        </section>
      </main>
    </MarketingShell>
  );
}
