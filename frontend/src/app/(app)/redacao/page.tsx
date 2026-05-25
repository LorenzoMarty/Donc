"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Brain, CheckCircle2, FilePenLine, Files, History, Lightbulb, Loader2, Sparkles } from "lucide-react";

import { EssayEditor } from "@/components/writing/essay-editor";
import { LoadingCard } from "@/components/shared/loading-card";
import { CompetencyMeter, PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch, type Essay, type EssayTheme, type EssayVersion } from "@/services/api";
import { cn } from "@/utils";

type EssayViewMode = "editor" | "analysis";

export default function EssayPage() {
  const [themes, setThemes] = useState<EssayTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<EssayTheme | null>(null);
  const [essay, setEssay] = useState<Essay | null>(null);
  const [title, setTitle] = useState("Minha redação ENEM");
  const [content, setContent] = useState("");
  const [draftStarted, setDraftStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<EssayViewMode>("editor");
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const saveRequestRef = useRef(0);
  const submittingRef = useRef(false);
  const essayId = essay?.id;
  const essayStatus = essay?.status;
  const selectedThemeId = selectedTheme?.id;
  const wordCount = countWords(content);
  const paragraphCount = countParagraphs(content);
  const selectedVersion = selectedVersionId ? (essay?.versions.find((version) => version.id === selectedVersionId) ?? null) : null;
  const analysisCorrection = selectedVersion?.correction ?? essay?.correction ?? null;
  const analysisTitle = selectedVersion?.title ?? essay?.title ?? title;
  const analysisContent = selectedVersion?.content ?? essay?.content ?? content;
  const analysisTheme = essay?.theme ?? selectedTheme;
  const analysisVersionLabel = selectedVersion ? `Versao ${selectedVersion.version_number}` : essay?.status === "corrected" ? "Versao atual" : "Rascunho";

  useEffect(() => {
    let mounted = true;

    async function loadInitialState() {
      try {
        const items = await apiFetch<EssayTheme[]>("/essays/themes");
        if (!mounted) return;
        setThemes(items);

        const params = new URLSearchParams(window.location.search);
        const essayId = params.get("essayId");
        if (essayId) {
          const openedEssay = await apiFetch<Essay>(`/essays/${essayId}`);
          if (!mounted) return;
          const versionId = Number(params.get("versionId"));
          const version = Number.isFinite(versionId) ? (openedEssay.versions.find((item) => item.id === versionId) ?? null) : null;
          const source = version ?? openedEssay;
          setEssay(openedEssay);
          setSelectedVersionId(version?.id ?? null);
          setTitle(source.title);
          setContent(source.content);
          setSelectedTheme(openedEssay.theme);
          setDraftStarted(true);
          setMode(params.get("view") === "analise" || openedEssay.status === "corrected" || Boolean(version?.correction) ? "analysis" : "editor");
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
    if (mode !== "editor" || submitting || essayStatus === "corrected") return;

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
  }, [content, draftStarted, essayId, essayStatus, mode, selectedThemeId, submitting, title]);

  function createDraft(theme = selectedTheme) {
    if (!theme) return;
    setError("");
    setSelectedTheme(theme);
    setEssay(null);
    setMode("editor");
    setSelectedVersionId(null);
    setDraftStarted(true);
    setTitle(`Redacao - ${theme.title.slice(0, 70)}`);
    setContent("");
    replaceEssayUrl();
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
      const latestVersion = latestCorrectedVersion(corrected);
      setEssay(corrected);
      setSelectedVersionId(latestVersion?.id ?? null);
      setTitle((latestVersion ?? corrected).title);
      setContent((latestVersion ?? corrected).content);
      setMode("analysis");
      replaceEssayUrl(corrected.id, latestVersion?.id, "analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel corrigir.");
      setMode("editor");
    } finally {
      submittingRef.current = false;
      saveRequestRef.current += 1;
      setSubmitting(false);
      setSaving(false);
    }
  }

  function readVersion(version: EssayVersion) {
    setError("");
    setMode("analysis");
    setSelectedVersionId(version.id);
    setTitle(version.title);
    setContent(version.content);
    if (essay) replaceEssayUrl(essay.id, version.id, "analysis");
  }

  async function rewriteFromVersion(version: EssayVersion) {
    if (!essay) return;
    setError("");
    try {
      const draft = await apiFetch<Essay>(`/essays/${essay.id}/versions/${version.id}/rewrite`, { method: "POST" });
      setEssay(draft);
      setMode("editor");
      setSelectedVersionId(null);
      setTitle(draft.title);
      setContent(draft.content);
      setDraftStarted(true);
      replaceEssayUrl(draft.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel iniciar a reescrita.");
    }
  }

  if (loading) return <LoadingCard />;

  if (submitting && essay) {
    return <CorrectionWaitingScreen title={title} wordCount={wordCount} paragraphCount={paragraphCount} />;
  }

  const hasCorrection = Boolean(analysisCorrection);
  const isWriting = mode === "editor" && draftStarted && essay?.status !== "corrected";

  if (mode === "analysis" && essay) {
    return (
      <div className="space-y-5 md:space-y-6">
        <PageHeader
          eyebrow="Analise da correcao"
          title="Resultado da sua redacao"
          description="Leia o texto junto da correcao para entender nota, competencias e proximos ajustes."
          action={
            <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setMode("editor");
                  setSelectedVersionId(null);
                  setTitle(essay.title);
                  setContent(essay.content);
                  replaceEssayUrl(essay.id);
                }}
              >
                Ver versoes
              </Button>
              <Button asChild size="lg">
                <Link href="/redacoes">
                  <Files className="h-4 w-4" aria-hidden="true" />
                  Historico
                </Link>
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <EssayReadPanel
            title={analysisTitle}
            content={analysisContent}
            theme={analysisTheme}
            versionLabel={analysisVersionLabel}
            correction={analysisCorrection}
          />
          <CorrectionPanel correction={analysisCorrection} error={error} />
        </div>

        <VersionPanel essay={essay} selectedVersionId={selectedVersionId} onRead={readVersion} onRewrite={rewriteFromVersion} />
      </div>
    );
  }

  if (isWriting) {
    return (
      <div className="min-h-[calc(100dvh-7rem)]">
        <EssayEditor
          essay={essay}
          theme={selectedTheme}
          title={title}
          content={content}
          wordCount={wordCount}
          paragraphCount={paragraphCount}
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
        description="Editor limpo para desenvolver sua redacao com clareza e acompanhar estrutura, linhas e paragrafos."
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

      <div className="space-y-4">
        {!essay ? (
          <ThemePicker themes={themes} selectedTheme={selectedTheme} onSelect={setSelectedTheme} />
        ) : (
          <div className={cn("grid gap-4", hasCorrection ? "2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : "2xl:grid-cols-1")}>
            <VersionPanel essay={essay} selectedVersionId={selectedVersionId} onRead={readVersion} onRewrite={rewriteFromVersion} />
            {hasCorrection ? <CorrectionPanel correction={analysisCorrection} error={error} /> : null}
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
            paragraphCount={paragraphCount}
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
      </div>
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
  selectedVersionId,
  onRead,
  onRewrite,
}: {
  essay: Essay;
  selectedVersionId: number | null;
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
                    <Badge variant={selectedVersionId === version.id ? "secondary" : "outline"}>Versao {version.version_number}</Badge>
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

function CorrectionWaitingScreen({ title, wordCount, paragraphCount }: { title: string; wordCount: number; paragraphCount: number }) {
  return (
    <div className="grid min-h-[calc(100dvh-10rem)] place-items-center">
      <Surface className="w-full max-w-3xl text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary/12 text-primary">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Correcao em andamento</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">Analisando sua redacao</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Estamos salvando a versao final, avaliando as competencias e preparando a tela de analise. Ao terminar, voce sera levado
          automaticamente para o resultado.
        </p>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          <div className="game-tile bg-background/58 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Titulo</p>
            <p className="text-safe mt-1 text-sm font-semibold">{title}</p>
          </div>
          <div className="game-tile bg-background/58 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tamanho</p>
            <p className="mt-1 text-sm font-semibold">{wordCount} palavras</p>
          </div>
          <div className="game-tile bg-background/58 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Paragrafos</p>
            <p className="mt-1 text-sm font-semibold">{paragraphCount}</p>
          </div>
        </div>
      </Surface>
    </div>
  );
}

function EssayReadPanel({
  title,
  content,
  theme,
  versionLabel,
  correction,
}: {
  title: string;
  content: string;
  theme: EssayTheme | null;
  versionLabel: string;
  correction: Essay["correction"];
}) {
  const paragraphCount = countParagraphs(content);

  return (
    <Surface>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Redacao analisada</p>
          <h2 className="text-safe mt-1 text-2xl font-semibold tracking-normal">{title}</h2>
          {theme ? <p className="text-safe mt-2 text-sm leading-6 text-muted-foreground">{theme.title}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{versionLabel}</Badge>
          <Badge variant="outline">{paragraphCount} paragrafos</Badge>
          {correction ? <Badge variant="success">{correction.total_score} pontos</Badge> : <Badge variant="outline">Sem correcao</Badge>}
        </div>
      </div>
      <div className="game-tile max-h-[70dvh] overflow-y-auto bg-background/56 p-4">
        <div className="whitespace-pre-wrap text-safe text-sm leading-7 text-foreground">{content}</div>
      </div>
    </Surface>
  );
}

function CorrectionPanel({ correction, error }: { correction: Essay["correction"]; error: string }) {
  const essay = correction ? { correction } : null;

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

function countParagraphs(value: string) {
  const stripped = value.trim();
  if (!stripped) return 0;
  if (/\n\s*\n/.test(stripped)) return stripped.split(/\n\s*\n+/).filter((paragraph) => paragraph.trim()).length;
  return stripped.split(/\n+/).filter((line) => line.trim()).length;
}

function latestCorrectedVersion(essay: Essay) {
  return (
    [...essay.versions]
      .filter((version) => version.correction)
      .sort((a, b) => b.version_number - a.version_number)[0] ?? null
  );
}

function replaceEssayUrl(essayId?: number, versionId?: number, mode?: EssayViewMode) {
  if (typeof window === "undefined") return;
  if (!essayId) {
    window.history.replaceState(null, "", "/redacao");
    return;
  }

  const params = new URLSearchParams({ essayId: String(essayId) });
  if (mode === "analysis") params.set("view", "analise");
  if (versionId) params.set("versionId", String(versionId));
  window.history.replaceState(null, "", `/redacao?${params.toString()}`);
}
