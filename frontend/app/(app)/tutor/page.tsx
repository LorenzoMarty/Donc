import { MotionShell } from "@/components/app/motion-shell";
import { PageHeader, Surface } from "@/components/app/premium-ui";
import { TutorChat } from "@/components/app/tutor-chat";

export default function TutorPage() {
  return (
    <MotionShell className="space-y-6">
      <PageHeader
        eyebrow="IA Tutora"
        title="Duvidas em modo turbo"
        description="Explicacoes curtas, exemplos e proximos passos para Portugues e Redacao."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <TutorChat />
        <Surface>
          <h2 className="mb-4 text-lg font-black tracking-normal">Prompts rapidos</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-md border p-3">Explique a diferenca entre coesao e coerencia.</div>
            <div className="rounded-md border p-3">Crie uma proposta de intervencao completa.</div>
            <div className="rounded-md border p-3">Corrija a pontuacao de um paragrafo.</div>
            <div className="rounded-md border p-3">Sugira repertorios para educacao digital.</div>
          </div>
        </Surface>
      </div>
    </MotionShell>
  );
}
