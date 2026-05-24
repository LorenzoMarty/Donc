"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Brain, CheckCircle2, FilePenLine, Files, History, Lightbulb, Sparkles } from "lucide-react";

import { EssayEditor } from "@/components/writing/essay-editor";
import { LoadingCard } from "@/components/shared/loading-card";
import { CompetencyMeter, PageHeader, Surface } from "@/components/shared/premium-ui";
import { ConnectiveLibrary, RepertoireSuggestions } from "@/components/writing/writing-lab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, type Essay, type EssayTheme, type EssayVersion } from "@/services/api";
import { cn } from "@/utils";

export default function EssayPage() {
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<EssayTheme | null>(null);
  const [essay, setEssay] = useState<Essay | null>(null);
  const [title, setTitle] = useState("Minha redação ENEM");
  const [content, setContent] = useState("");
  const [draftStarted, setDraftStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const saveRequestRef = useRef(0);
  const submittingRef = useRef(false);
  const essayId = essay?.id;
  const essayStatus = essay?.status;
  const selectedThemeId = selectedTheme?.id;
  const wordCount = countWords(content);

  useEffect(() => {
    let mounted = true;

    async function loadInitialState() {
      try {
        const items = await apiFetch<EssayTheme[]>("/essays/themes");
        if (!mounted) return;
        setThemes(items);

        const essayId = new URLSearchParams(window.location.search).get("essayId");
        if (essayId) {
          const openedEssay = await apiFetch<Essay>(`/essays/${essayId}`);
          if (!mounted) return;
          setEssay(openedEssay);
          setTitle(openedEssay.title);
          setContent(openedEssay.content);
          setSelectedTheme(openedEssay.theme);
          setDraftStarted(true);
          return;
        }

        setSelectedTheme(items[0] ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nao foi possivel abrir a redacao.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadInitialState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (submitting || essayStatus === "corrected") return;

    const id = window.setTimeout(() => {
      const hasContent = content.trim().length > 0;

      if (essayId === undefined) {
        if (!draftStarted || selectedThemeId === undefined || !hasContent) return;
        const requestId = ++saveRequestRef.current;
        setSaving(true);
        apiFetch<Essay>("/essays", {
          method: "POST",
          body: JSON.stringify({ theme_id: selectedThemeId, title, content }),
        })
          .then((saved) => {
            if (requestId === saveRequestRef.current && !submittingRef.current) setEssay(saved);
          })
          .catch((err) => {
            if (requestId === saveRequestRef.current && !submittingRef.current) {
              setError(err instanceof Error ? err.message : "Nao foi possivel salvar o rascunho.");
            }
          })
          .finally(() => {
            if (requestId === saveRequestRef.current && !submittingRef.current) setSaving(false);
          });
        return;
      }

      if (!hasContent) {
        const requestId = ++saveRequestRef.current;
        setSaving(true);
        apiFetch<{ message: string }>(`/essays/${essayId}`, { method: "DELETE" })
          .then(() => {
            if (requestId === saveRequestRef.current && !submittingRef.current) {
              setEssay(null);
              setDraftStarted(true);
            }
          })
          .catch((err) => {
            if (requestId === saveRequestRef.current && !submittingRef.current) {
              setError(err instanceof Error ? err.message : "Nao foi possivel remover o rascunho vazio.");
            }
          })
          .finally(() => {
            if (requestId === saveRequestRef.current && !submittingRef.current) setSaving(false);
          });
        return;
      }

      const requestId = ++saveRequestRef.current;
      setSaving(true);
      apiFetch<Essay>(`/essays/${essayId}/autosave`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      })
        .then((saved) => {
          if (requestId === saveRequestRef.current && !submittingRef.current) setEssay(saved);
        })
        .catch((err) => {
          if (requestId === saveRequestRef.current && !submittingRef.current) {
            setError(err instanceof Error ? err.message : "Nao foi possivel salvar o rascunho.");
          }
        })
        .finally(() => {
          if (requestId === saveRequestRef.current && !submittingRef.current) setSaving(false);
        });
    }, 900);

    return () => window.clearTimeout(id);
  }, [content, draftStarted, essayId, essayStatus, selectedThemeId, submitting, title]);

  function createDraft(theme = selectedTheme) {
    if (!theme) return;
    setError("");
    setSelectedTheme(theme);
    setEssay(null);
    setDraftStarted(true);
    setTitle(`Redacao - ${theme.title.slice(0, 70)}`);
    setContent("");
  }

  async function submit() {
    if (!essay || submittingRef.current) return;
    setError("");
    if (wordCount < 80) {
      setError("A redacao precisa ter pelo menos 80 palavras para ser enviada para correcao.");
      return;
    }

    submittingRef.current = true;
    saveRequestRef.current += 1;
    setSaving(false);
    setSubmitting(true);
    try {
      const saved = await apiFetch<Essay>(`/essays/${essay.id}/autosave`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      });
      setEssay(saved);
      const corrected = await apiFetch<Essay>(`/essays/${saved.id}/submit`, { method: "POST" });
      setEssay(corrected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel corrigir.");
    } finally {
      submittingRef.current = false;
      saveRequestRef.current += 1;
      setSubmitting(false);
      setSaving(false);
    }
  }

  function readVersion(version: EssayVersion) {
    setError("");
    setTitle(version.title);
    setContent(version.content);
  }

  async function rewriteFromVersion(version: EssayVersion) {
    if (!essay) return;
    setError("");
    try {
      const draft = await apiFetch<Essay>(`/essays/${essay.id}/versions/${version.id}/rewrite`, { method: "POST" });
      setEssay(draft);
      setTitle(draft.title);
      setContent(draft.content);
      setDraftStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel iniciar a reescrita.");
    }
  }

  if (loading) return <LoadingCard />;

  const hasCorrection = Boolean(essay?.correction);
  const isWriting = draftStarted && essay?.status !== "corrected";

  if (isWriting) {
    return (
      <div className="min-h-[calc(100dvh-7rem)]">
        <EssayEditor
          essay={essay}
          theme={selectedTheme}
          title={title}
          content={content}
          wordCount={wordCount}
          saving={saving}
          submitting={submitting}
          error={error}
          focusMode={focusMode}
          onTitleChange={setTitle}
          onContentChange={setContent}
          onFocusModeChange={setFocusMode}
          onSubmit={submit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Laboratorio de redacao"
        title="Escreva com foco e revise por competencia."
        description="Editor limpo e repertorio guiado para desenvolver sua redacao com clareza."
        action={
          <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto">
            <Button onClick={() => createDraft()} disabled={!selectedTheme} size="lg">
              <FilePenLine className="h-4 w-4" aria-hidden="true" />
              Nova redacao
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/redacoes">
                <Files className="h-4 w-4" aria-hidden="true" />
                Historico
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList className="mobile-scroll h-auto w-full justify-start overflow-x-auto bg-muted/72 p-1 no-scrollbar">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="repertorio">Repertorio</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-0 space-y-4">
          {!essay ? (
            <ThemePicker themes={themes} selectedTheme={selectedTheme} onSelect={setSelectedTheme} />
          ) : (
            <div className={cn("grid gap-4", hasCorrection ? "2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : "2xl:grid-cols-1")}>
              <VersionPanel essay={essay} onRead={readVersion} onRewrite={rewriteFromVersion} />
              {hasCorrection ? <CorrectionPanel essay={essay} error={error} /> : null}
            </div>
          )}

          {error && !hasCorrection ? (
            <div className="game-tile flex gap-2 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          ) : null}

          {!essay && !draftStarted ? (
            <Surface className="grid min-h-[280px] place-items-center text-center">
              <div>
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </div>
                <p className="text-xl font-semibold tracking-normal">Escolha um tema e comece a escrever.</p>
                <p className="mt-2 text-sm text-muted-foreground">O editor abre limpo para voce desenvolver a redacao no seu ritmo.</p>
                <Button className="mt-5" onClick={() => createDraft()} disabled={!selectedTheme}>
                  Comecar redacao
                </Button>
              </div>
            </Surface>
          ) : (
            <EssayEditor
              essay={essay}
              theme={selectedTheme}
              title={title}
              content={content}
              wordCount={wordCount}
              saving={saving}
              submitting={submitting}
              error={error}
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
      </Tabs>
    </div>
  );
}

function ThemePicker({
  themes,
  selectedTheme,
  onSelect,
}: {
  themes: EssayTheme[];
  selectedTheme: EssayTheme | null;
  onSelect: (theme: EssayTheme) => void;
}) {
  return (
    <Surface>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Banco de temas</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">Escolha o tema</h2>
        </div>
        <Sparkles className="h-5 w-5 text-secondary" aria-hidden="true" />
      </div>
      <div className="grid gap-3">
        {themes.map((theme) => (
          <button
            type="button"
            key={theme.id}
            onClick={() => onSelect(theme)}
            className={cn(
              "game-tile group w-full bg-background/54 p-3 text-left transition-all hover:bg-muted/62",
              selectedTheme?.id === theme.id && "bg-primary/20",
            )}
          >
            <p className="text-sm font-semibold">{theme.title}</p>
            <p className="text-safe mt-2 text-xs leading-5 text-muted-foreground">{theme.context}</p>
          </button>
        ))}
      </div>
    </Surface>
  );
}

function VersionPanel({
  essay,
  onRead,
  onRewrite,
}: {
  essay: Essay;
  onRead: (version: EssayVersion) => void;
  onRewrite: (version: EssayVersion) => void;
}) {
  const versions = essay.versions.length ? [...essay.versions].sort((a, b) => b.version_number - a.version_number) : [];

  return (
    <Surface>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Versoes salvas</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">Escolha onde continuar</h2>
        </div>
        <History className="h-5 w-5 text-secondary" aria-hidden="true" />
      </div>

      {versions.length ? (
        <div className="space-y-3">
          {versions.map((version) => (
            <div key={version.id} className="game-tile bg-background/56 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Versao {version.version_number}</Badge>
                    {version.score ? <Badge variant="success">{version.score}</Badge> : <Badge variant="secondary">Em escrita</Badge>}
                  </div>
                  <p className="text-safe mt-2 text-sm font-semibold">{version.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(version.updated_at)}</p>
                </div>
                <div className="grid w-full gap-2 xs:w-auto xs:grid-cols-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => onRead(version)}>
                    Ler
                  </Button>
                  <Button type="button" size="sm" onClick={() => onRewrite(version)}>
                    <FilePenLine className="h-4 w-4" aria-hidden="true" />
                    Reescrever
                  </Button>
                </div>
              </div>
              {version.correction?.feedback ? (
                <p className="text-safe mt-3 text-sm leading-6 text-muted-foreground">{version.correction.feedback}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">As correcoes desta redacao ficarao salvas aqui a cada nova reescrita.</p>
      )}
    </Surface>
  );
}

function CorrectionPanel({ essay, error }: { essay: Essay | null; error: string }) {
  return (
    <Surface>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Correcao</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">Análise da correção</h2>
        </div>
        <Brain className="h-5 w-5 text-secondary" aria-hidden="true" />
      </div>
      {essay?.correction ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(8rem,11.25rem)_minmax(0,1fr)]">
            <div className="game-surface grid min-h-[160px] place-items-center bg-primary text-primary-foreground">
              <div className="text-center">
                <p className="text-xs font-bold text-foreground/70">Nota</p>
                <motion.p
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="text-5xl font-semibold tracking-normal"
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
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-secondary" aria-hidden="true" />
              Insight principal
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{essay.correction.feedback}</p>
          </div>
        </div>
      ) : (
        <div className="game-surface grid min-h-[210px] place-items-center border-dashed bg-background/46 p-6 text-center">
          <div>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
              <Brain className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="font-semibold">Aguardando envio</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              A nota e os insights aparecem aqui quando a redação for corrigida.
            </p>
          </div>
        </div>
      )}
      {error && (
        <div className="game-tile mt-4 flex gap-2 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </Surface>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}
