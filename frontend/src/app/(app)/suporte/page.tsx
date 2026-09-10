"use client";

import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { SUPPORT_FAQ_ITEMS } from "@/features/support/faq-data";

import { FaqAccordion } from "./components/faq-accordion";
import { TicketForm } from "./components/ticket-form";

export default function SupportPage() {
  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Suporte"
        title="Como podemos ajudar?"
        description="Tire dúvidas frequentes ou abra um chamado com a nossa equipe."
      />

      <Surface>
        <h2 className="text-lg font-semibold tracking-normal">Perguntas frequentes</h2>
        <div className="mt-4">
          <FaqAccordion items={SUPPORT_FAQ_ITEMS} />
        </div>
      </Surface>

      <Surface delay={0.05}>
        <h2 className="text-lg font-semibold tracking-normal">Abrir chamado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Não achou sua resposta acima? Conte o que está acontecendo que nossa equipe retorna por e-mail.
        </p>
        <div className="mt-4">
          <TicketForm />
        </div>
      </Surface>
    </div>
  );
}
