"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AlertCircle, Brain, CheckCircle2, FilePenLine, FlaskConical, Lightbulb, Sparkles, Trophy } from "lucide-react";

import { EssayEditor } from "@/components/writing/essay-editor";
import { LoadingCard } from "@/components/shared/loading-card";
import { CompetencyMeter, PageHeader, Surface } from "@/components/shared/premium-ui";
import {
  ArgumentChallenge,
  ConnectiveGame,
  ConnectiveLibrary,
  EssayAnalysisViewer,
  EssayPuzzle,
  RepertoireSuggestions,
} from "@/components/writing/writing-lab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedEffect } from "@/hooks/use-debounced-effect";
import { apiFetch, type Essay, type EssayTheme } from "@/services/api";
import { cn } from "@/utils";

export default function EssayPage() {
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<EssayTheme | null>(null);
  const [essay, setEssay] = useState<Essay | null>(null);
  const [title, setTitle] = useState("Minha redação ENEM");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<EssayTheme[]>("/essays/themes")
      .then((items) => {
        setThemes(items);
        setSelectedTheme(items[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useDebouncedEffect(
    () => {
      if (!essay || essay.status === "corrected") return;
      setSaving(true);
      apiFetch<Essay>(`/essays/${essay.id}/autosave`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      })
        .then(setEssay)
        .finally(() => setSaving(false));
    },
    [essay?.id, title, content],
    900,
  );

  async function createDraft(theme = selectedTheme) {
    if (!theme) return;
    setError("");
    const draft = await apiFetch<Essay>("/essays", {
      method: "POST",
      body: JSON.stringify({ theme_id: theme.id, title: `Redação - ${theme.title.slice(0, 70)}` }),
    });
    setEssay(draft);
    setTitle(draft.title);
    setContent(draft.content);
  }

  async function submit() {
    if (!essay) return;
    setError("");
    try {
      const corrected = await apiFetch<Essay>(`/essays/${essay.id}/submit`, { method: "POST" });
      setEssay(corrected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível corrigir.");
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Laboratório de redação"
        title="Treine, escreva e evolua como em uma campanha."
        description="Editor focado, repertório guiado, jogos de conectivos, análise anotada e progressão por competências."
        action={
          <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto">
            <Button onClick={() => createDraft()} disabled={!selectedTheme} size="lg">
              <FilePenLine className="h-4 w-4" aria-hidden="true" />
              Nova redação
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/conquistas">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Troféus
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto bg-muted/72 p-1 no-scrollbar">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="repertorio">Repertório</TabsTrigger>
          <TabsTrigger value="jogos">Treinos</TabsTrigger>
          <TabsTrigger value="analise">Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
            <Surface>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-muted-foreground">Banco de temas</p>
                  <h2 className="mt-1 text-xl font-black tracking-normal">Escolha o recorte</h2>
                </div>
                <Sparkles className="h-5 w-5 text-secondary" aria-hidden="true" />
              </div>
              <div className="grid gap-3">
                {themes.map((theme) => (
                  <button
                    type="button"
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className={cn(
                      "game-tile group w-full bg-background/54 p-3 text-left transition-all hover:bg-muted/62",
                      selectedTheme?.id === theme.id && "bg-primary/20",
                    )}
                  >
                    <p className="text-sm font-black">{theme.title}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{theme.context}</p>
                  </button>
                ))}
              </div>
            </Surface>

            <CorrectionPanel essay={essay} error={error} />
          </div>

          {!essay ? (
            <Surface className="grid min-h-[280px] place-items-center text-center">
              <div>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border-2 border-foreground bg-primary text-primary-foreground shadow-[0_4px_0_hsl(var(--foreground))]">
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </div>
                <p className="text-xl font-black tracking-normal">Seu próximo rascunho está pronto.</p>
                <p className="mt-2 text-sm text-muted-foreground">Escolha um tema e entre no fluxo.</p>
                <Button className="mt-5" onClick={() => createDraft()} disabled={!selectedTheme}>
                  Começar redação
                </Button>
              </div>
            </Surface>
          ) : (
            <EssayEditor
              essay={essay}
              title={title}
              content={content}
              saving={saving}
              focusMode={focusMode}
              onTitleChange={setTitle}
              onContentChange={setContent}
              onFocusModeChange={setFocusMode}
              onSubmit={submit}
            />
          )}
        </TabsContent>

        <TabsContent value="repertorio" className="mt-0 space-y-4">
          <RepertoireSuggestions themeTitle={selectedTheme?.title} />
          <ConnectiveLibrary />
        </TabsContent>

        <TabsContent value="jogos" className="mt-0">
          <div className="grid gap-4 xl:grid-cols-3">
            <ConnectiveGame />
            <EssayPuzzle />
            <ArgumentChallenge />
          </div>
        </TabsContent>

        <TabsContent value="analise" className="mt-0">
          <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
            <EssayAnalysisViewer />
            <Surface>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-muted-foreground">Competências</p>
                  <h2 className="mt-1 text-xl font-black tracking-normal">O que observar</h2>
                </div>
                <FlaskConical className="h-5 w-5 text-secondary" aria-hidden="true" />
              </div>
              <div className="space-y-3">
                {[
                  "Tese explícita no fim da introdução.",
                  "Repertorio produtivo conectado ao argumento.",
                  "Conectivos com função lógica clara.",
                  "Intervenção com agente, ação, meio e finalidade.",
                ].map((item) => (
                  <div key={item} className="game-tile flex gap-3 bg-background/54 p-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    <span className="leading-6 text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CorrectionPanel({ essay, error }: { essay: Essay | null; error: string }) {
  return (
    <Surface>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Coach IA</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Análise da correção</h2>
        </div>
        <Brain className="h-5 w-5 text-secondary" aria-hidden="true" />
      </div>
      {essay?.correction ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div className="game-surface grid min-h-[160px] place-items-center bg-primary text-primary-foreground">
              <div className="text-center">
                <p className="text-xs font-bold text-foreground/70">Nota</p>
                <motion.p
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="text-5xl font-black tracking-normal"
                >
                  {essay.correction.total_score}
                </motion.p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <CompetencyMeter label="Competência 1" value={essay.correction.competency_1} />
              <CompetencyMeter label="Competência 2" value={essay.correction.competency_2} />
              <CompetencyMeter label="Competência 3" value={essay.correction.competency_3} />
              <CompetencyMeter label="Competência 4" value={essay.correction.competency_4} />
              <CompetencyMeter label="Competência 5" value={essay.correction.competency_5} />
            </div>
          </div>
          <div className="game-tile bg-background/56 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-black">
              <Lightbulb className="h-4 w-4 text-secondary" aria-hidden="true" />
              Insight principal
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{essay.correction.feedback}</p>
          </div>
        </div>
      ) : (
        <div className="game-surface grid min-h-[210px] place-items-center border-dashed bg-background/46 p-6 text-center">
          <div>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border-2 border-foreground bg-secondary text-secondary-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
              <Brain className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="font-black">Aguardando envio</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">A nota e os insights aparecem aqui quando a redação for corrigida.</p>
          </div>
        </div>
      )}
      {error && (
        <div className="game-tile mt-4 flex gap-2 bg-destructive/10 p-3 text-sm font-bold text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </Surface>
  );
}
