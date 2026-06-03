"use client";

import { useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/services/api";
import type { EssayTheme } from "@/types/api";

export function ThemesTab({ themes, onGenerated }: { themes: EssayTheme[]; onGenerated: (theme: EssayTheme) => void }) {
  const [focus, setFocus] = useState("");
  const [generating, setGenerating] = useState(false);

  async function generateTheme() {
    if (generating) return;
    setGenerating(true);
    try {
      const theme = await apiFetch<EssayTheme>("/admin/essay-themes/generate", {
        method: "POST",
        body: JSON.stringify({ focus: focus.trim() || null }),
      });
      onGenerated(theme);
      setFocus("");
      toast.success("Tema gerado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel gerar o tema.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Banco de temas</Badge>
            <Badge variant="outline">{themes.length} ativos</Badge>
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {themes.map((theme) => (
            <article key={theme.id} className="rounded-md border border-border bg-background/40 p-4">
              <div className="mb-3 flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="text-safe text-sm font-semibold leading-5">{theme.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{theme.source}</p>
                </div>
              </div>
              <p className="text-safe line-clamp-4 text-xs leading-5 text-muted-foreground">{theme.context}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(theme.supporting_texts ?? []).slice(0, 3).map((text) => (
                  <Badge key={`${theme.id}-${text.title}`} variant="outline" className="max-w-full truncate text-[11px]">
                    {text.title}
                  </Badge>
                ))}
              </div>
            </article>
          ))}
          {!themes.length ? <p className="text-sm text-muted-foreground">Nenhum tema ativo cadastrado.</p> : null}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold">Gerar tema</h3>
        </div>
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
            Foco opcional
            <Input
              value={focus}
              maxLength={160}
              placeholder="Ex.: tecnologia, saude publica"
              onChange={(event) => setFocus(event.target.value)}
            />
          </label>
          <Button type="button" onClick={generateTheme} disabled={generating}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {generating ? "Gerando..." : "Gerar um tema"}
          </Button>
        </div>
      </div>
    </div>
  );
}
