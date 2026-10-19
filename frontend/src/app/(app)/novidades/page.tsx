"use client";

import { useEffect } from "react";

import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { WHATS_NEW_ENTRIES } from "@/features/whats-new/entries";
import { markWhatsNewSeen } from "@/features/whats-new/use-whats-new-unread";

export default function WhatsNewPage() {
  useEffect(() => {
    markWhatsNewSeen();
  }, []);

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader eyebrow="Novidades" title="Novidades da plataforma" description="As melhorias mais recentes da plataforma, da mais nova para a mais antiga." />
      <ul className="grid gap-3" data-testid="whats-new-list">
        {WHATS_NEW_ENTRIES.map((entry) => (
          <li key={entry.id}>
            <Surface>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-normal">{entry.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.description}</p>
            </Surface>
          </li>
        ))}
      </ul>
    </div>
  );
}
