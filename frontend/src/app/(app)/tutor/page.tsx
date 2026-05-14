import { MotionShell } from "@/components/shared/motion-shell";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { TutorChat } from "@/components/shared/tutor-chat";

export default function TutorPage() {
  return (
    <MotionShell className="space-y-6">
      <PageHeader
        eyebrow="IA Tutora"
        title="Dúvidas em modo rápido"
        description="Explicações curtas, exemplos e próximos passos para Português e Redação."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <TutorChat />
        <Surface>
          <h2 className="mb-4 text-lg font-black tracking-normal">Perguntas rápidas</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="game-tile bg-background p-3">Explique a diferença entre coesão e coerência.</div>
            <div className="game-tile bg-background p-3">Crie uma proposta de intervenção completa.</div>
            <div className="game-tile bg-background p-3">Corrija a pontuação de um parágrafo.</div>
            <div className="game-tile bg-background p-3">Sugira repertórios para educação digital.</div>
          </div>
        </Surface>
      </div>
    </MotionShell>
  );
}
