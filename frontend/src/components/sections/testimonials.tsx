import { Quote } from "lucide-react";

import { Reveal } from "@/components/sections/aceternity-primitives";

/**
 * Donc ENEM está pré-lançamento — sem aluno pagante ainda. Estes depoimentos são exemplos
 * ilustrativos, não relatos reais (ver REQ-5 da spec de marketing). Trocar por depoimentos
 * reais assim que existirem.
 */
const EXAMPLE_TESTIMONIALS = [
  {
    quote: "Antes eu treinava redação sem saber onde estava travando. Agora sei exatamente qual competência revisar antes da próxima.",
    name: "Exemplo ilustrativo",
    role: "Aluno(a) do 3º ano — depoimento de exemplo",
  },
  {
    quote: "A correção volta rápido e explica o porquê da nota, não só o número. Isso mudou como eu reescrevo o texto.",
    name: "Exemplo ilustrativo",
    role: "Aluno(a) cursinho — depoimento de exemplo",
  },
  {
    quote: "As práticas curtas cabem entre uma aula e outra. Consigo manter a rotina mesmo em semana cheia de prova.",
    name: "Exemplo ilustrativo",
    role: "Aluno(a) do 2º ano — depoimento de exemplo",
  },
];

export function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <Reveal className="mb-6 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">O que muda na rotina</p>
        <h2 className="font-display mt-2 text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
          Exemplos de como a rotina costuma mudar.
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Donc ENEM está em pré-lançamento — os depoimentos abaixo são exemplos ilustrativos de uso, não relatos reais ainda.
        </p>
      </Reveal>

      <div className="fluid-grid gap-4 [--grid-min:16rem]">
        {EXAMPLE_TESTIMONIALS.map((testimonial, index) => (
          <Reveal key={testimonial.name + index} delay={index * 0.05} className="game-tile flex h-full flex-col gap-4 bg-card p-5">
            <Quote className="h-5 w-5 text-primary/70" aria-hidden="true" />
            <p className="flex-1 text-sm leading-6 text-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
            <div>
              <p className="text-sm font-semibold">{testimonial.name}</p>
              <p className="text-xs text-muted-foreground">{testimonial.role}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
