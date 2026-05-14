"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";

export default function PracticeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const id = window.setTimeout(() => router.replace("/exercicios"), 600);
    return () => window.clearTimeout(id);
  }, [router]);

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Surface className="max-w-md text-center">
        <h1 className="text-2xl font-black">A prática ficou mais rápida</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Os exercícios agora viraram jogos em sequência dentro da própria trilha. Você será levado para lá automaticamente.
        </p>
        <Button className="mt-5 w-full" onClick={() => router.replace("/exercicios")}>
          Ir para os jogos
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Surface>
    </div>
  );
}
