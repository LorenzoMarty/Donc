"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { SupportFaqItem } from "@/features/support/faq-data";
import { cn } from "@/utils";

export function FaqAccordion({ items }: { items: SupportFaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const open = openIndex === index;
        const answerId = `faq-answer-${index}`;
        return (
          <Card key={item.question} className="p-0">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-3 p-4 text-left text-sm font-semibold"
              aria-expanded={open}
              aria-controls={answerId}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              {item.question}
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            {open ? (
              <p id={answerId} className="px-4 pb-4 text-sm text-muted-foreground">
                {item.answer}
              </p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
