"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AlertCircle, Brain, CheckCircle2, FilePenLine, FlaskConical, Lightbulb, Sparkles, Trophy } from "lucide-react";

import { EssayEditor } from "@/components/app/essay-editor";
import { LoadingCard } from "@/components/app/loading-card";
import { CompetencyMeter, PageHeader, Surface } from "@/components/app/premium-ui";
import {
  ArgumentChallenge,
  ConnectiveGame,
  ConnectiveLibrary,
  EssayAnalysisViewer,
  EssayPuzzle,
  RepertoireSuggestions,
  WritingLevelSystem,
} from "@/components/app/writing-lab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedEffect } from "@/hooks/use-debounced-effect";
import { apiFetch, type Essay, type EssayTheme } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function EssayPage() {
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<EssayTheme | null>(null);
  const [essay, setEssay] = useState<Essay | null>(null);
  const [title, setTitle] = useState("Minha redacao ENEM");
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
      body: JSON.stringify({ theme_id: theme.id, title: `Redacao - ${theme.title.slice(0, 70)}` }),
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
      setError(err instanceof Error ? err.message : "Nao foi possivel corrigir.");
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Laboratorio de redacao"
        title="Treine, escreva e evolua como em uma campanha."
        description="Editor focado, repertorio guiado, jogos de conectivos, analise anotada e progressao por competencias."
        action={
          <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto">
            <Button onClick={() => createDraft()} disabled={!selectedTheme} size="lg">
              <FilePenLine className="h-4 w-4" aria-hidden="true" />
              Nova redacao
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/conquistas">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Trofeus
              </Link>
            </Button>
          </div>
        }
      />

      <WritingLevelSystem content={content} score={essay?.score} />

      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg bg-muted/72 p-1 no-scrollbar">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="repertorio">Repertorio</TabsTrigger>
          <TabsTrigger value="jogos">Treinos</TabsTrigger>
          <TabsTrigger value="analise">Analise</TabsTrigger>
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
                      "group w-full rounded-lg border bg-background/54 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-muted/62",
                      selectedTheme?.id === theme.id && "border-primary/40 bg-primary/8 shadow-sm",
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
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow">
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </div>
                <p className="text-xl font-black tracking-normal">Seu proximo rascunho esta pronto.</p>
                <p className="mt-2 text-sm text-muted-foreground">Escolha um tema e entre no fluxo.</p>
                <Button className="mt-5" onClick={() => createDraft()} disabled={!selectedTheme}>
                  Comecar redacao
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
                  <p className="text-xs font-black uppercase text-muted-foreground">Competencias</p>
                  <h2 className="mt-1 text-xl font-black tracking-normal">O que observar</h2>
                </div>
                <FlaskConical className="h-5 w-5 text-secondary" aria-hidden="true" />
              </div>
              <div className="space-y-3">
                {[
                  "Tese explicita no fim da introducao.",
                  "Repertorio produtivo conectado ao argumento.",
                  "Conectivos com funcao logica clara.",
                  "Intervencao com agente, acao, meio e finalidade.",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-lg border bg-background/54 p-3 text-sm">
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
          <h2 className="mt-1 text-xl font-black tracking-normal">Analise da correcao</h2>
        </div>
        <Brain className="h-5 w-5 text-secondary" aria-hidden="true" />
      </div>
      {essay?.correction ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div className="grid min-h-[160px] place-items-center rounded-lg border bg-primary text-primary-foreground">
              <div className="text-center">
                <p className="text-xs font-bold text-white/70">Nota</p>
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
              <CompetencyMeter label="Competencia 1" value={essay.correction.competency_1} />
              <CompetencyMeter label="Competencia 2" value={essay.correction.competency_2} />
              <CompetencyMeter label="Competencia 3" value={essay.correction.competency_3} />
              <CompetencyMeter label="Competencia 4" value={essay.correction.competency_4} />
              <CompetencyMeter label="Competencia 5" value={essay.correction.competency_5} />
            </div>
          </div>
          <div className="rounded-lg border bg-background/56 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-black">
              <Lightbulb className="h-4 w-4 text-secondary" aria-hidden="true" />
              Insight principal
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{essay.correction.feedback}</p>
          </div>
        </div>
      ) : (
        <div className="grid min-h-[210px] place-items-center rounded-lg border border-dashed bg-background/46 p-6 text-center">
          <div>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg bg-secondary/18 text-secondary">
              <Brain className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="font-black">Aguardando envio</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">A nota e os insights aparecem aqui quando a redacao for corrigida.</p>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4 flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </Surface>
  );
}
