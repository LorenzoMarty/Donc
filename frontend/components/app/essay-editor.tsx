"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Eye, FileText, Maximize2, Minimize2, Save, Send, SpellCheck, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import type { Essay } from "@/lib/api";
import { cn } from "@/lib/utils";

export function EssayEditor({
  essay,
  title,
  content,
  saving,
  focusMode,
  onTitleChange,
  onContentChange,
  onFocusModeChange,
  onSubmit,
}: {
  essay: Essay | null;
  title: string;
  content: string;
  saving: boolean;
  focusMode: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onFocusModeChange: (value: boolean) => void;
  onSubmit: () => void;
}) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lines = Math.max(1, content.split("\n").length, Math.ceil(content.length / 92));
  const lineNumbers = Array.from({ length: Math.min(60, lines) }, (_, index) => index + 1);
  const locked = essay?.status === "corrected";
  const wordProgress = Math.min(100, (words / 320) * 100);
  const structureProgress = Math.min(100, (lines / 24) * 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={cn("overflow-hidden rounded-lg border bg-card/92 shadow-premium backdrop-blur-xl", focusMode && "fixed inset-0 z-50 rounded-none border-0")}
    >
      <div className="flex flex-col gap-4 border-b bg-card/86 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <Input
            value={title}
            disabled={locked}
            onChange={(event) => onTitleChange(event.target.value)}
            className="h-auto border-0 bg-transparent px-0 py-0 text-xl font-black shadow-none focus-visible:ring-0 md:text-2xl"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">{words} palavras</Badge>
            <Badge variant="outline">{lines} linhas</Badge>
            <Badge variant="success">{saving ? "Salvando..." : "Rascunho sincronizado"}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border bg-background/62 px-3 py-2 text-sm">
            <SpellCheck className="h-4 w-4 text-secondary" aria-hidden="true" />
            <span className="font-bold">Ortografia</span>
            <Switch checked aria-label="Corretor ortografico" />
          </div>
          <Button variant="outline" onClick={() => onFocusModeChange(!focusMode)}>
            {focusMode ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
            {focusMode ? "Sair" : "Foco"}
          </Button>
          <Button variant="outline" disabled>
            <Save className="h-4 w-4" aria-hidden="true" />
            Auto
          </Button>
          <Button onClick={onSubmit} disabled={!essay || locked}>
            <Send className="h-4 w-4" aria-hidden="true" />
            Corrigir
          </Button>
        </div>
      </div>

      <div className="grid bg-white text-ink dark:bg-background dark:text-foreground xl:grid-cols-[1fr_290px]">
        <div className="grid min-h-[650px] grid-cols-[48px_1fr]">
          <div className="select-none border-r bg-muted/32 px-2 py-6 text-right font-mono text-xs leading-7 text-muted-foreground">
            {lineNumbers.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <textarea
            value={content}
            disabled={locked}
            onChange={(event) => onContentChange(event.target.value)}
            spellCheck
            className="min-h-[650px] resize-none bg-transparent px-4 py-6 text-[16px] leading-7 outline-none md:px-8"
            placeholder="Comece sua redacao ENEM aqui..."
          />
        </div>

        <aside className="border-t bg-muted/20 p-4 xl:border-l xl:border-t-0">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-lg border bg-background/72 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black">Radar do texto</p>
                <Eye className="h-4 w-4 text-secondary" aria-hidden="true" />
              </div>
              <Metric label="Volume" value={`${Math.round(wordProgress)}%`} progress={wordProgress} />
              <Metric label="Estrutura" value={`${Math.round(structureProgress)}%`} progress={structureProgress} />
            </div>

            <div className="rounded-lg border bg-background/72 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black">
                <Target className="h-4 w-4 text-secondary" aria-hidden="true" />
                Checkpoint
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <Signal active={words >= 80} text="Texto elegivel para correcao" />
                <Signal active={lines >= 4} text="Blocos argumentativos visiveis" />
                <Signal active={content.toLowerCase().includes("portanto") || content.toLowerCase().includes("assim")} text="Conectivos detectados" />
              </ul>
            </div>

            <div className="rounded-lg border bg-primary/8 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-black text-primary">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Status
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {locked ? "Versao corrigida e bloqueada." : saving ? "Sincronizando seu rascunho." : "Pronto para continuar."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </motion.section>
  );
}

function Metric({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-bold text-muted-foreground">{label}</span>
        <span className="font-black">{value}</span>
      </div>
      <Progress value={progress} />
    </div>
  );
}

function Signal({ active, text }: { active: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 className={cn("h-4 w-4", active ? "text-accent" : "text-muted-foreground/45")} aria-hidden="true" />
      <span className={active ? "text-foreground" : undefined}>{text}</span>
    </li>
  );
}

