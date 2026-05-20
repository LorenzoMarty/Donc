"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Flame, GraduationCap, Medal, Zap } from "lucide-react";

import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/providers/app-providers";
import { initials } from "@/utils";

export default function ProfilePage() {
  const { user } = useAuth();
  const xp = user?.xp ?? 0;
  const level = user?.level ?? 1;
  const xpProgress = xp % 250 ? ((xp % 250) / 250) * 100 : 100;

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Perfil"
        title="Sua identidade de progresso"
        description="Consistencia, frequencia e atalhos essenciais para continuar evoluindo."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/conquistas">
              Ver marcos
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Surface className="bg-primary text-primary-foreground">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 place-items-center rounded-md border border-foreground/20 bg-foreground/10 text-2xl font-semibold text-foreground">
              {initials(user?.name ?? "Aluno")}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground/62">Aluno Donk ENEM</p>
              <h2 className="mt-1 truncate text-3xl font-semibold tracking-normal">{user?.name ?? "Aluno"}</h2>
              <p className="mt-2 truncate text-sm text-foreground/70">{user?.email}</p>
            </div>
          </div>
        </Surface>

        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={Zap} label="Pontos" value={String(xp)} />
          <Metric icon={GraduationCap} label="Consistencia" value={String(level)} />
          <Metric icon={Flame} label="Sequencia" value={`${user?.streak_days ?? 0} dias`} />
        </div>
      </section>

      <Surface>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Proximo nivel</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">Energia intelectual acumulada</h2>
          </div>
          <Medal className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <Progress value={xpProgress} className="h-3" />
      </Surface>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Surface>
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
    </Surface>
  );
}
