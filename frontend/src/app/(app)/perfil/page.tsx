"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Flame, GraduationCap, Medal, Zap } from "lucide-react";

import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { useAuth } from "@/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { initials } from "@/utils";

export default function ProfilePage() {
  const { user } = useAuth();
  const xp = user?.xp ?? 0;
  const level = user?.level ?? 1;
  const xpProgress = xp % 250 ? ((xp % 250) / 250) * 100 : 100;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Perfil"
        title="Sua identidade de progresso"
        description="Nível, sequência, XP e atalhos de evolução em uma página aberta e clara."
        action={
          <Button asChild size="lg">
            <Link href="/conquistas">
              Ver conquistas
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Surface className="bg-primary text-primary-foreground">
          <div className="flex items-center gap-5">
            <div className="grid h-24 w-24 place-items-center rounded-[28px] border-2 border-foreground bg-foreground text-3xl font-black text-background shadow-[0_5px_0_hsl(var(--foreground))]">
              {initials(user?.name ?? "Aluno")}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground/62">Aluno Donk ENEM</p>
              <h2 className="mt-1 text-3xl font-black tracking-normal">{user?.name ?? "Aluno"}</h2>
              <p className="mt-2 text-sm text-foreground/70">{user?.email}</p>
            </div>
          </div>
        </Surface>

        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={Zap} label="XP" value={String(xp)} />
          <Metric icon={GraduationCap} label="Nível" value={String(level)} />
          <Metric icon={Flame} label="Sequência" value={`${user?.streak_days ?? 0} dias`} />
        </div>
      </section>

      <Surface>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase text-muted-foreground">Próximo nível</p>
            <h2 className="mt-1 text-xl font-black tracking-normal">Energia intelectual acumulada</h2>
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
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl border-2 border-foreground bg-primary text-primary-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-normal">{value}</p>
    </Surface>
  );
}
