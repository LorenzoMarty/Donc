"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { SUPPORT_FAQ_ITEMS } from "@/features/support/faq-data";
import { safeOrigin } from "@/features/support/origin";
import { SUPPORT_TICKET_CATEGORIES } from "@/features/support/support-categories";
import type { SupportTicketCategory } from "@/types/api";

import { FaqAccordion } from "./components/faq-accordion";
import { MyTickets } from "./components/my-tickets";
import { TicketForm } from "./components/ticket-form";

function SupportContent() {
  const params = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const category = params?.get("categoria") as SupportTicketCategory | null;
  const origin = params?.get("origem");
  const initialCategory = SUPPORT_TICKET_CATEGORIES.some((option) => option.value === category) ? (category ?? undefined) : undefined;
  // Só caminhos internos entram no texto (evita injetar conteúdo arbitrário vindo da URL).
  const safePath = safeOrigin(origin);
  const initialMessage = safePath ? `Estava na página ${safePath}.\n\n` : "";

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Suporte"
        title="Como podemos ajudar?"
        description="Tire dúvidas frequentes, mande uma sugestão ou abra um chamado com a nossa equipe."
      />

      <Surface>
        <h2 className="text-lg font-semibold tracking-normal">Perguntas frequentes</h2>
        <div className="mt-4">
          <FaqAccordion items={SUPPORT_FAQ_ITEMS} />
        </div>
      </Surface>

      <Surface delay={0.05}>
        <h2 className="text-lg font-semibold tracking-normal">Dúvida ou sugestão</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Não achou sua resposta acima? Conte o que está acontecendo, ou o que gostaria de ver no Donc, que nossa equipe responde aqui e por e-mail.
        </p>
        <div className="mt-4">
          <TicketForm initialCategory={initialCategory} initialMessage={initialMessage} onSent={() => setRefreshKey((key) => key + 1)} />
        </div>
      </Surface>

      <Surface delay={0.1}>
        <h2 className="text-lg font-semibold tracking-normal">Meus chamados</h2>
        <div className="mt-4">
          <MyTickets refreshKey={refreshKey} />
        </div>
      </Surface>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense>
      <SupportContent />
    </Suspense>
  );
}
