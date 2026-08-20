"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AIGeneratedGame } from "@/types/api";

/**
 * Spec migrar-jogos-estaticos-para-banco REQ-5a-j: editor dedicado por engine não-quiz — cada um
 * opera sobre `game.payload` (JSON genérico do backend) com campos e rótulos específicos do tipo,
 * nunca um textarea de JSON cru. `onChange` devolve o payload completo pro card salvar via PATCH.
 */

type Payload = Record<string, unknown>;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={onClick}>
      <X className="h-3 w-3" />
      {label}
    </Button>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Plus className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

function ItemCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-control bg-background/60 p-3 shadow-soft space-y-2.5">{children}</div>;
}

/**
 * Reaproveita o padrão de card recolhível já usado nas perguntas de quiz (Q1, Q2...) pros itens
 * "wall of inputs" dos engines não-quiz (rodada/caso/escada) — só o item aberto no momento mostra
 * todos os campos; os demais ficam resumidos por um título + prévia curta.
 */
function CollapsibleItemCard({
  title,
  summary,
  open,
  onToggle,
  onRemove,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-control bg-background/60 shadow-soft">
      <div className="flex items-center gap-1 p-2.5">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <p className="text-xs font-semibold">{title}</p>
            {summary ? <p className="truncate text-xs text-muted-foreground">{summary}</p> : null}
          </div>
        </button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={onRemove} aria-label={`Remover ${title.toLowerCase()}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {open && <div className="space-y-2.5 border-t p-3">{children}</div>}
    </div>
  );
}

/** Gerencia quais itens (por id) estão abertos — novo item entra já aberto pra edição imediata. */
function useExpandable() {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  return {
    isOpen: (id: string) => openIds.has(id),
    toggle: (id: string) =>
      setOpenIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    expand: (id: string) => setOpenIds((prev) => new Set(prev).add(id)),
  };
}

// ── classify ─────────────────────────────────────────────────────────────

function ClassifyEditor({ payload, onChange }: { payload: Payload; onChange: (p: Payload) => void }) {
  const instruction = (payload.instruction as string) ?? "";
  const buckets = (payload.buckets as { id: string; label: string }[]) ?? [];
  const items = (payload.items as { id: string; text: string; bucketId: string }[]) ?? [];

  return (
    <div className="space-y-4">
      <Field label="Instrução">
        <Textarea value={instruction} onChange={(e) => onChange({ ...payload, instruction: e.target.value })} rows={2} className="min-h-0 resize-none" />
      </Field>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Baldes</p>
        {buckets.map((bucket, bi) => (
          <div key={bucket.id} className="flex items-center gap-2">
            <Input
              value={bucket.label}
              onChange={(e) => onChange({ ...payload, buckets: buckets.map((b, i) => (i === bi ? { ...b, label: e.target.value } : b)) })}
              className="h-9 flex-1 text-xs"
            />
            <RemoveButton label="" onClick={() => onChange({ ...payload, buckets: buckets.filter((_, i) => i !== bi) })} />
          </div>
        ))}
        <AddButton label="Adicionar balde" onClick={() => onChange({ ...payload, buckets: [...buckets, { id: uid(), label: "Novo balde" }] })} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Itens</p>
        {items.map((item, ii) => (
          <ItemCard key={item.id}>
            <div className="flex items-center gap-2">
              <Input
                value={item.text}
                onChange={(e) => onChange({ ...payload, items: items.map((it, i) => (i === ii ? { ...it, text: e.target.value } : it)) })}
                className="h-9 flex-1 text-xs"
              />
              <Select
                value={item.bucketId}
                onChange={(e) => onChange({ ...payload, items: items.map((it, i) => (i === ii ? { ...it, bucketId: e.target.value } : it)) })}
                className="h-9 w-40 text-xs"
              >
                {buckets.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </Select>
              <RemoveButton label="" onClick={() => onChange({ ...payload, items: items.filter((_, i) => i !== ii) })} />
            </div>
          </ItemCard>
        ))}
        <AddButton
          label="Adicionar item"
          onClick={() => onChange({ ...payload, items: [...items, { id: uid(), text: "Novo item", bucketId: buckets[0]?.id ?? "" }] })}
        />
      </div>
    </div>
  );
}

// ── order ────────────────────────────────────────────────────────────────

function StringArrayField({ values, onChange, addLabel }: { values: string[]; onChange: (v: string[]) => void; addLabel: string }) {
  const [ids, setIds] = useState<string[]>(() => values.map(() => uid()));
  const rows = values.map((v, i) => ({ value: v, id: ids[i] ?? uid() }));

  return (
    <div className="space-y-1.5 pl-4">
      {rows.map((row, i) => (
        <div key={row.id} className="flex items-center gap-2">
          <Input value={row.value} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} className="h-8 flex-1 text-xs" />
          <RemoveButton
            label=""
            onClick={() => {
              setIds((prev) => prev.filter((_, j) => j !== i));
              onChange(values.filter((_, j) => j !== i));
            }}
          />
        </div>
      ))}
      <AddButton
        label={addLabel}
        onClick={() => {
          setIds((prev) => [...prev, uid()]);
          onChange([...values, ""]);
        }}
      />
    </div>
  );
}

function OrderEditor({ payload, onChange }: { payload: Payload; onChange: (p: Payload) => void }) {
  const rounds = (payload.rounds as { id: string; instruction: string; items: string[]; explanation: string }[]) ?? [];
  const expandable = useExpandable();

  function updateRound(i: number, patch: Partial<(typeof rounds)[number]>) {
    onChange({ ...payload, rounds: rounds.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  function addRound() {
    const id = uid();
    onChange({ ...payload, rounds: [...rounds, { id, instruction: "", items: [""], explanation: "" }] });
    expandable.expand(id);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{rounds.length} rodada{rounds.length === 1 ? "" : "s"}</p>
      {rounds.map((round, ri) => (
        <CollapsibleItemCard
          key={round.id}
          title={`Rodada ${ri + 1}`}
          summary={round.instruction || "(sem instrução)"}
          open={expandable.isOpen(round.id)}
          onToggle={() => expandable.toggle(round.id)}
          onRemove={() => onChange({ ...payload, rounds: rounds.filter((_, j) => j !== ri) })}
        >
          <Field label="Instrução">
            <Input value={round.instruction} onChange={(e) => updateRound(ri, { instruction: e.target.value })} className="h-9 text-xs" />
          </Field>
          <p className="text-xs text-muted-foreground">Itens na ordem correta (aluno vê embaralhado):</p>
          <StringArrayField values={round.items} onChange={(items) => updateRound(ri, { items })} addLabel="Adicionar item" />
          <Field label="Explicação">
            <Input value={round.explanation} onChange={(e) => updateRound(ri, { explanation: e.target.value })} className="h-9 text-xs" />
          </Field>
        </CollapsibleItemCard>
      ))}
      <AddButton label="Adicionar rodada" onClick={addRound} />
    </div>
  );
}

// ── fill-blank ───────────────────────────────────────────────────────────

function FillBlankEditor({ payload, onChange }: { payload: Payload; onChange: (p: Payload) => void }) {
  const rounds = (payload.rounds as { id: string; prompt: string; accepted: string[]; explanation: string }[]) ?? [];
  const expandable = useExpandable();

  function updateRound(i: number, patch: Partial<(typeof rounds)[number]>) {
    onChange({ ...payload, rounds: rounds.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  function addRound() {
    const id = uid();
    onChange({ ...payload, rounds: [...rounds, { id, prompt: "", accepted: [""], explanation: "" }] });
    expandable.expand(id);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{rounds.length} rodada{rounds.length === 1 ? "" : "s"}</p>
      {rounds.map((round, ri) => (
        <CollapsibleItemCard
          key={round.id}
          title={`Rodada ${ri + 1}`}
          summary={round.prompt || "(sem enunciado)"}
          open={expandable.isOpen(round.id)}
          onToggle={() => expandable.toggle(round.id)}
          onRemove={() => onChange({ ...payload, rounds: rounds.filter((_, j) => j !== ri) })}
        >
          <Field label="Enunciado (use ___ para a lacuna)">
            <Textarea value={round.prompt} onChange={(e) => updateRound(ri, { prompt: e.target.value })} rows={2} className="min-h-0 resize-none text-xs" />
          </Field>
          <p className="text-xs text-muted-foreground">Respostas aceitas:</p>
          <StringArrayField values={round.accepted} onChange={(accepted) => updateRound(ri, { accepted })} addLabel="Adicionar resposta aceita" />
          <Field label="Explicação">
            <Input value={round.explanation} onChange={(e) => updateRound(ri, { explanation: e.target.value })} className="h-9 text-xs" />
          </Field>
        </CollapsibleItemCard>
      ))}
      <AddButton label="Adicionar rodada" onClick={addRound} />
    </div>
  );
}

// ── duel ─────────────────────────────────────────────────────────────────

function DuelEditor({ payload, onChange }: { payload: Payload; onChange: (p: Payload) => void }) {
  const rounds = (payload.rounds as { id: string; context: string; a: string; b: string; winner: "a" | "b"; dimension: string; explanation: string }[]) ?? [];
  const expandable = useExpandable();

  function updateRound(i: number, patch: Partial<(typeof rounds)[number]>) {
    onChange({ ...payload, rounds: rounds.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  function addRound() {
    const id = uid();
    onChange({ ...payload, rounds: [...rounds, { id, context: "", a: "", b: "", winner: "a", dimension: "", explanation: "" }] });
    expandable.expand(id);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{rounds.length} rodada{rounds.length === 1 ? "" : "s"}</p>
      {rounds.map((round, ri) => (
        <CollapsibleItemCard
          key={round.id}
          title={`Rodada ${ri + 1}`}
          summary={round.context || "(sem contexto)"}
          open={expandable.isOpen(round.id)}
          onToggle={() => expandable.toggle(round.id)}
          onRemove={() => onChange({ ...payload, rounds: rounds.filter((_, j) => j !== ri) })}
        >
          <Field label="Contexto">
            <Input value={round.context} onChange={(e) => updateRound(ri, { context: e.target.value })} className="h-9 text-xs" />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Versão A">
              <Textarea value={round.a} onChange={(e) => updateRound(ri, { a: e.target.value })} rows={2} className="min-h-0 resize-none text-xs" />
            </Field>
            <Field label="Versão B">
              <Textarea value={round.b} onChange={(e) => updateRound(ri, { b: e.target.value })} rows={2} className="min-h-0 resize-none text-xs" />
            </Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Vencedora">
              <Select value={round.winner} onChange={(e) => updateRound(ri, { winner: e.target.value as "a" | "b" })} className="h-9 text-xs">
                <option value="a">Versão A</option>
                <option value="b">Versão B</option>
              </Select>
            </Field>
            <Field label="Dimensão decisiva">
              <Input value={round.dimension} onChange={(e) => updateRound(ri, { dimension: e.target.value })} className="h-9 text-xs" placeholder="ex: progressão, naturalidade" />
            </Field>
          </div>
          <Field label="Explicação">
            <Input value={round.explanation} onChange={(e) => updateRound(ri, { explanation: e.target.value })} className="h-9 text-xs" />
          </Field>
        </CollapsibleItemCard>
      ))}
      <AddButton label="Adicionar rodada" onClick={addRound} />
    </div>
  );
}

// ── argument-escalation ─────────────────────────────────────────────────

type EscalationOption = { text: string; correct: boolean; note: string };
type EscalationRung = { level: number; instruction: string; options: EscalationOption[] };
type EscalationLadder = { id: string; theme: string; rungs: EscalationRung[] };

function EscalationEditor({ payload, onChange }: { payload: Payload; onChange: (p: Payload) => void }) {
  const ladders = (payload.ladders as EscalationLadder[]) ?? [];
  const expandable = useExpandable();

  function addLadder() {
    const id = uid();
    onChange({
      ...payload,
      ladders: [...ladders, { id, theme: "", rungs: [{ level: 1, instruction: "", options: [{ text: "", correct: true, note: "" }] }] }],
    });
    expandable.expand(id);
  }

  function updateLadder(i: number, patch: Partial<EscalationLadder>) {
    onChange({ ...payload, ladders: ladders.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  }
  function updateRung(li: number, ri: number, patch: Partial<EscalationRung>) {
    updateLadder(li, { rungs: ladders[li].rungs.map((r, j) => (j === ri ? { ...r, ...patch } : r)) });
  }
  function updateOption(li: number, ri: number, oi: number, patch: Partial<EscalationOption>) {
    const rung = ladders[li].rungs[ri];
    updateRung(li, ri, { options: rung.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{ladders.length} escada{ladders.length === 1 ? "" : "s"}</p>
      {ladders.map((ladder, li) => (
        <CollapsibleItemCard
          key={ladder.id}
          title={`Escada ${li + 1}`}
          summary={ladder.theme || "(sem tema)"}
          open={expandable.isOpen(ladder.id)}
          onToggle={() => expandable.toggle(ladder.id)}
          onRemove={() => onChange({ ...payload, ladders: ladders.filter((_, j) => j !== li) })}
        >
          <Field label="Tema">
            <Input value={ladder.theme} onChange={(e) => updateLadder(li, { theme: e.target.value })} className="h-9 text-xs" />
          </Field>
          {ladder.rungs.map((rung, ri) => (
            <div key={ri} className="ml-3 rounded-control bg-card/60 p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">Nível {rung.level}</span>
                <Input value={rung.instruction} onChange={(e) => updateRung(li, ri, { instruction: e.target.value })} className="h-8 flex-1 text-xs" placeholder="Instrução" />
              </div>
              {rung.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2 pl-3">
                  <button
                    type="button"
                    onClick={() => updateOption(li, ri, oi, { correct: !opt.correct })}
                    className={`h-5 w-5 shrink-0 rounded-full border-2 ${opt.correct ? "border-primary bg-primary" : "border-muted-foreground"}`}
                    aria-label="Marcar como correta"
                  />
                  <Input value={opt.text} onChange={(e) => updateOption(li, ri, oi, { text: e.target.value })} className="h-8 flex-1 text-xs" placeholder="Opção" />
                  <Input value={opt.note} onChange={(e) => updateOption(li, ri, oi, { note: e.target.value })} className="h-8 flex-1 text-xs" placeholder="Nota" />
                </div>
              ))}
            </div>
          ))}
        </CollapsibleItemCard>
      ))}
      <AddButton label="Adicionar escada" onClick={addLadder} />
    </div>
  );
}

// ── artificiality ────────────────────────────────────────────────────────

function ArtificialityEditor({ payload, onChange }: { payload: Payload; onChange: (p: Payload) => void }) {
  const rounds = (payload.rounds as { id: string; passage: string; verdict: "humano" | "artificial"; explanation: string }[]) ?? [];
  const expandable = useExpandable();

  function updateRound(i: number, patch: Partial<(typeof rounds)[number]>) {
    onChange({ ...payload, rounds: rounds.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  function addRound() {
    const id = uid();
    onChange({ ...payload, rounds: [...rounds, { id, passage: "", verdict: "humano", explanation: "" }] });
    expandable.expand(id);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{rounds.length} rodada{rounds.length === 1 ? "" : "s"}</p>
      {rounds.map((round, ri) => (
        <CollapsibleItemCard
          key={round.id}
          title={`Rodada ${ri + 1}`}
          summary={round.passage || "(sem trecho)"}
          open={expandable.isOpen(round.id)}
          onToggle={() => expandable.toggle(round.id)}
          onRemove={() => onChange({ ...payload, rounds: rounds.filter((_, j) => j !== ri) })}
        >
          <Field label="Trecho">
            <Textarea value={round.passage} onChange={(e) => updateRound(ri, { passage: e.target.value })} rows={3} className="min-h-0 resize-none text-xs" />
          </Field>
          <Field label="Veredito">
            <Select value={round.verdict} onChange={(e) => updateRound(ri, { verdict: e.target.value as "humano" | "artificial" })} className="h-9 text-xs">
              <option value="humano">Humano</option>
              <option value="artificial">Artificial</option>
            </Select>
          </Field>
          <Field label="Explicação">
            <Input value={round.explanation} onChange={(e) => updateRound(ri, { explanation: e.target.value })} className="h-9 text-xs" />
          </Field>
        </CollapsibleItemCard>
      ))}
      <AddButton label="Adicionar rodada" onClick={addRound} />
    </div>
  );
}

// ── corrector ────────────────────────────────────────────────────────────

type CorrectorCandidate = { id: string; label: string; competency: "C1" | "C2" | "C3" | "C4" | "C5"; present: boolean; note: string };
type CorrectorCase = { id: string; paragraph: string; candidates: CorrectorCandidate[] };

function CorrectorEditor({ payload, onChange }: { payload: Payload; onChange: (p: Payload) => void }) {
  const cases = (payload.cases as CorrectorCase[]) ?? [];
  const expandable = useExpandable();

  function addCase() {
    const id = uid();
    onChange({ ...payload, cases: [...cases, { id, paragraph: "", candidates: [] }] });
    expandable.expand(id);
  }

  function updateCase(i: number, patch: Partial<CorrectorCase>) {
    onChange({ ...payload, cases: cases.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  }
  function updateCandidate(ci: number, cai: number, patch: Partial<CorrectorCandidate>) {
    updateCase(ci, { candidates: cases[ci].candidates.map((c, j) => (j === cai ? { ...c, ...patch } : c)) });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{cases.length} caso{cases.length === 1 ? "" : "s"}</p>
      {cases.map((c, ci) => (
        <CollapsibleItemCard
          key={c.id}
          title={`Caso ${ci + 1}`}
          summary={c.paragraph || "(sem parágrafo)"}
          open={expandable.isOpen(c.id)}
          onToggle={() => expandable.toggle(c.id)}
          onRemove={() => onChange({ ...payload, cases: cases.filter((_, j) => j !== ci) })}
        >
          <Field label="Parágrafo">
            <Textarea value={c.paragraph} onChange={(e) => updateCase(ci, { paragraph: e.target.value })} rows={3} className="min-h-0 resize-none text-xs" />
          </Field>
          <p className="text-xs text-muted-foreground">Problemas candidatos:</p>
          {c.candidates.map((cand, cai) => (
            <div key={cand.id} className="flex flex-wrap items-center gap-2 pl-3">
              <button
                type="button"
                onClick={() => updateCandidate(ci, cai, { present: !cand.present })}
                className={`h-5 w-5 shrink-0 rounded-full border-2 ${cand.present ? "border-primary bg-primary" : "border-muted-foreground"}`}
                aria-label="Marcar como presente no parágrafo"
              />
              <Input value={cand.label} onChange={(e) => updateCandidate(ci, cai, { label: e.target.value })} className="h-8 flex-1 text-xs" placeholder="Descrição do problema" />
              <Select value={cand.competency} onChange={(e) => updateCandidate(ci, cai, { competency: e.target.value as CorrectorCandidate["competency"] })} className="h-8 w-20 text-xs">
                {["C1", "C2", "C3", "C4", "C5"].map((c2) => (
                  <option key={c2} value={c2}>{c2}</option>
                ))}
              </Select>
            </div>
          ))}
          <AddButton
            label="Adicionar candidato"
            onClick={() => updateCase(ci, { candidates: [...c.candidates, { id: uid(), label: "", competency: "C1", present: false, note: "" }] })}
          />
        </CollapsibleItemCard>
      ))}
      <AddButton label="Adicionar caso" onClick={addCase} />
    </div>
  );
}

// ── essay-collapse ───────────────────────────────────────────────────────

type CollapseFragment = { id: string; text: string; correctIndex: number };
type CollapseConnectorOption = { text: string; correct: boolean; note: string };
type CollapseConnector = { slotId: string; before: string; after: string; options: CollapseConnectorOption[] };
type CollapseRound = { id: string; brief: string; fragments: CollapseFragment[]; connectors: CollapseConnector[]; explanation: string };

function EssayCollapseEditor({ payload, onChange }: { payload: Payload; onChange: (p: Payload) => void }) {
  const rounds = (payload.rounds as CollapseRound[]) ?? [];
  const expandable = useExpandable();

  function addRound() {
    const id = uid();
    onChange({ ...payload, rounds: [...rounds, { id, brief: "", fragments: [], connectors: [], explanation: "" }] });
    expandable.expand(id);
  }

  function updateRound(i: number, patch: Partial<CollapseRound>) {
    onChange({ ...payload, rounds: rounds.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  function updateConnector(ri: number, ci: number, patch: Partial<CollapseConnector>) {
    const connectors = rounds[ri].connectors ?? [];
    updateRound(ri, { connectors: connectors.map((c, j) => (j === ci ? { ...c, ...patch } : c)) });
  }
  function updateConnectorOption(ri: number, ci: number, oi: number, patch: Partial<CollapseConnectorOption>) {
    const connector = (rounds[ri].connectors ?? [])[ci];
    updateConnector(ri, ci, { options: connector.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{rounds.length} rodada{rounds.length === 1 ? "" : "s"}</p>
      {rounds.map((round, ri) => {
        const connectors = round.connectors ?? [];
        return (
          <CollapsibleItemCard
            key={round.id}
            title={`Rodada ${ri + 1}`}
            summary={round.brief || "(sem contexto)"}
            open={expandable.isOpen(round.id)}
            onToggle={() => expandable.toggle(round.id)}
            onRemove={() => onChange({ ...payload, rounds: rounds.filter((_, j) => j !== ri) })}
          >
            <Field label="Contexto (brief)">
              <Textarea value={round.brief} onChange={(e) => updateRound(ri, { brief: e.target.value })} rows={2} className="min-h-0 resize-none text-xs" />
            </Field>
            <p className="text-xs text-muted-foreground">Fragmentos (posição correta = ordem na lista):</p>
            {round.fragments.map((frag, fi) => (
              <div key={frag.id} className="flex items-center gap-2 pl-3">
                <span className="text-xs text-muted-foreground w-4">{frag.correctIndex + 1}.</span>
                <Textarea
                  value={frag.text}
                  onChange={(e) => updateRound(ri, { fragments: round.fragments.map((f, j) => (j === fi ? { ...f, text: e.target.value } : f)) })}
                  rows={1}
                  className="min-h-0 flex-1 resize-none text-xs"
                />
                <RemoveButton label="" onClick={() => updateRound(ri, { fragments: round.fragments.filter((_, j) => j !== fi).map((f, j) => ({ ...f, correctIndex: j })) })} />
              </div>
            ))}
            <AddButton
              label="Adicionar fragmento"
              onClick={() => updateRound(ri, { fragments: [...round.fragments, { id: uid(), text: "", correctIndex: round.fragments.length }] })}
            />

            <p className="text-xs text-muted-foreground">Conectores entre fragmentos (opcional):</p>
            {connectors.map((connector, ci) => (
              <div key={connector.slotId} className="ml-3 rounded-control bg-card/60 p-2.5 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={connector.before} onChange={(e) => updateConnector(ri, ci, { before: e.target.value })} className="h-8 text-xs" placeholder="Trecho antes da lacuna" />
                  <Input value={connector.after} onChange={(e) => updateConnector(ri, ci, { after: e.target.value })} className="h-8 text-xs" placeholder="Trecho depois da lacuna" />
                </div>
                {connector.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2 pl-3">
                    <button
                      type="button"
                      onClick={() => updateConnectorOption(ri, ci, oi, { correct: !opt.correct })}
                      className={`h-5 w-5 shrink-0 rounded-full border-2 ${opt.correct ? "border-primary bg-primary" : "border-muted-foreground"}`}
                      aria-label="Marcar como correta"
                    />
                    <Input value={opt.text} onChange={(e) => updateConnectorOption(ri, ci, oi, { text: e.target.value })} className="h-8 flex-1 text-xs" placeholder="Opção" />
                    <Input value={opt.note} onChange={(e) => updateConnectorOption(ri, ci, oi, { note: e.target.value })} className="h-8 flex-1 text-xs" placeholder="Nota" />
                  </div>
                ))}
                <AddButton
                  label="Adicionar opção"
                  onClick={() => updateConnector(ri, ci, { options: [...connector.options, { text: "", correct: false, note: "" }] })}
                />
                <RemoveButton label="Remover conector" onClick={() => updateRound(ri, { connectors: connectors.filter((_, j) => j !== ci) })} />
              </div>
            ))}
            <AddButton
              label="Adicionar conector"
              onClick={() => updateRound(ri, { connectors: [...connectors, { slotId: uid(), before: "", after: "", options: [{ text: "", correct: true, note: "" }] }] })}
            />

            <Field label="Explicação">
              <Input value={round.explanation} onChange={(e) => updateRound(ri, { explanation: e.target.value })} className="h-9 text-xs" />
            </Field>
          </CollapsibleItemCard>
        );
      })}
      <AddButton label="Adicionar rodada" onClick={addRound} />
    </div>
  );
}

// ── text-surgery ─────────────────────────────────────────────────────────

type SurgeryChoiceOption = { text: string; grade: "S" | "A" | "B" | "C" | "Fraco"; note: string };
type SurgerySegment =
  | { kind: "text"; text: string }
  | { slotId: string; mode: "choice"; options: SurgeryChoiceOption[]; tags?: string[] }
  | { slotId: string; mode: "rewrite"; base: string; criteria: string; tags?: string[] };
type SurgeryCase = { id: string; brief: string; segments: SurgerySegment[] };

// Segmentos vem do backend como `string | {slotId,mode,...}` (ver SurgerySegment em
// features/gamification/types.ts) — normaliza pro shape com `kind` só pra edição, sem mudar o
// formato salvo (des-normaliza de volta em `toRawSegment`).
function fromRawSegment(raw: unknown): SurgerySegment {
  if (typeof raw === "string") return { kind: "text", text: raw };
  return raw as Exclude<SurgerySegment, { kind: "text" }>;
}
function toRawSegment(segment: SurgerySegment): unknown {
  if ("kind" in segment) return segment.text;
  return segment;
}

const GRADES: SurgeryChoiceOption["grade"][] = ["S", "A", "B", "C", "Fraco"];

function TextSurgeryEditor({ payload, onChange }: { payload: Payload; onChange: (p: Payload) => void }) {
  const rawCases = (payload.cases as { id: string; brief: string; segments: unknown[] }[]) ?? [];
  const cases: SurgeryCase[] = rawCases.map((c) => ({ ...c, segments: c.segments.map(fromRawSegment) }));
  const expandable = useExpandable();

  function updateCase(i: number, patch: Partial<SurgeryCase>) {
    const next = cases.map((c, j) => (j === i ? { ...c, ...patch } : c));
    onChange({ ...payload, cases: next.map((c) => ({ ...c, segments: c.segments.map(toRawSegment) })) });
  }
  function updateSegment(ci: number, si: number, next: SurgerySegment) {
    updateCase(ci, { segments: cases[ci].segments.map((s, j) => (j === si ? next : s)) });
  }
  function addCase() {
    const id = uid();
    onChange({ ...payload, cases: [...cases, { id, brief: "", segments: [] }].map((cc) => ({ ...cc, segments: cc.segments.map(toRawSegment) })) });
    expandable.expand(id);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{cases.length} caso{cases.length === 1 ? "" : "s"}</p>
      {cases.map((c, ci) => (
        <CollapsibleItemCard
          key={c.id}
          title={`Caso ${ci + 1}`}
          summary={c.brief || "(sem contexto)"}
          open={expandable.isOpen(c.id)}
          onToggle={() => expandable.toggle(c.id)}
          onRemove={() => onChange({ ...payload, cases: cases.filter((_, j) => j !== ci).map((cc) => ({ ...cc, segments: cc.segments.map(toRawSegment) })) })}
        >
          <Field label="Contexto (brief)">
            <Textarea value={c.brief} onChange={(e) => updateCase(ci, { brief: e.target.value })} rows={2} className="min-h-0 resize-none text-xs" />
          </Field>
          <p className="text-xs text-muted-foreground">Segmentos (texto fixo, escolha ou reescrita):</p>
          {c.segments.map((seg, si) => (
            <div key={si} className="ml-3 rounded-control bg-card/60 p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <Select
                  value={"kind" in seg ? "text" : seg.mode}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "text") updateSegment(ci, si, { kind: "text", text: "" });
                    else if (value === "choice") updateSegment(ci, si, { slotId: uid(), mode: "choice", options: [{ text: "", grade: "S", note: "" }] });
                    else updateSegment(ci, si, { slotId: uid(), mode: "rewrite", base: "", criteria: "" });
                  }}
                  className="h-8 w-32 text-xs"
                >
                  <option value="text">Texto fixo</option>
                  <option value="choice">Escolha</option>
                  <option value="rewrite">Reescrita</option>
                </Select>
                <RemoveButton label="Remover segmento" onClick={() => updateCase(ci, { segments: c.segments.filter((_, j) => j !== si) })} />
              </div>

              {"kind" in seg && (
                <Textarea value={seg.text} onChange={(e) => updateSegment(ci, si, { kind: "text", text: e.target.value })} rows={1} className="min-h-0 resize-none text-xs" placeholder="Texto fixo" />
              )}

              {!("kind" in seg) && seg.mode === "choice" && (
                <div className="space-y-1.5">
                  {seg.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <Select
                        value={opt.grade}
                        onChange={(e) => updateSegment(ci, si, { ...seg, options: seg.options.map((o, j) => (j === oi ? { ...o, grade: e.target.value as SurgeryChoiceOption["grade"] } : o)) })}
                        className="h-8 w-20 text-xs"
                      >
                        {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </Select>
                      <Input value={opt.text} onChange={(e) => updateSegment(ci, si, { ...seg, options: seg.options.map((o, j) => (j === oi ? { ...o, text: e.target.value } : o)) })} className="h-8 flex-1 text-xs" placeholder="Opção" />
                      <Input value={opt.note} onChange={(e) => updateSegment(ci, si, { ...seg, options: seg.options.map((o, j) => (j === oi ? { ...o, note: e.target.value } : o)) })} className="h-8 flex-1 text-xs" placeholder="Nota" />
                    </div>
                  ))}
                  <AddButton label="Adicionar opção" onClick={() => updateSegment(ci, si, { ...seg, options: [...seg.options, { text: "", grade: "S", note: "" }] })} />
                </div>
              )}

              {!("kind" in seg) && seg.mode === "rewrite" && (
                <div className="space-y-1.5">
                  <Textarea value={seg.base} onChange={(e) => updateSegment(ci, si, { ...seg, base: e.target.value })} rows={1} className="min-h-0 resize-none text-xs" placeholder="Texto-base degradado" />
                  <Input value={seg.criteria} onChange={(e) => updateSegment(ci, si, { ...seg, criteria: e.target.value })} className="h-8 text-xs" placeholder="Critério avaliado pela IA" />
                </div>
              )}
            </div>
          ))}
          <AddButton label="Adicionar segmento" onClick={() => updateCase(ci, { segments: [...c.segments, { kind: "text", text: "" }] })} />
        </CollapsibleItemCard>
      ))}
      <AddButton label="Adicionar caso" onClick={addCase} />
    </div>
  );
}

// ── survival ─────────────────────────────────────────────────────────────

function SurvivalEditor({ payload, onChange, allGames, currentGameId }: { payload: Payload; onChange: (p: Payload) => void; allGames: AIGeneratedGame[]; currentGameId: number }) {
  const poolGameIds = (payload.poolGameIds as string[]) ?? [];
  const candidates = allGames.filter((g) => g.id !== currentGameId && g.engine !== "survival" && g.questions.length > 0);

  function toggle(id: string, checked: boolean) {
    onChange({ ...payload, poolGameIds: checked ? [...poolGameIds, id] : poolGameIds.filter((x) => x !== id) });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Jogos que alimentam o pool de perguntas do modo sobrevivência (só jogos com perguntas):</p>
      <div className="grid gap-1 rounded-control bg-background/50 p-2 shadow-soft max-h-64 overflow-y-auto">
        {candidates.map((g) => {
          const gid = `ai-${g.id}`;
          return (
            <label key={g.id} className="flex items-center gap-2 rounded-control px-2 py-1.5 text-xs hover:bg-muted/60">
              <input type="checkbox" className="h-4 w-4" checked={poolGameIds.includes(gid)} onChange={(e) => toggle(gid, e.target.checked)} />
              {g.name}
            </label>
          );
        })}
        {!candidates.length && <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum outro jogo com perguntas disponível ainda.</p>}
      </div>
    </div>
  );
}

// ── switch ───────────────────────────────────────────────────────────────

export function GamePayloadEditor({
  engine,
  payload,
  onChange,
  allGames,
  currentGameId,
}: {
  engine: string;
  payload: Payload;
  onChange: (p: Payload) => void;
  allGames: AIGeneratedGame[];
  currentGameId: number;
}) {
  switch (engine) {
    case "classify":
      return <ClassifyEditor payload={payload} onChange={onChange} />;
    case "order":
      return <OrderEditor payload={payload} onChange={onChange} />;
    case "fill-blank":
      return <FillBlankEditor payload={payload} onChange={onChange} />;
    case "duel":
      return <DuelEditor payload={payload} onChange={onChange} />;
    case "argument-escalation":
      return <EscalationEditor payload={payload} onChange={onChange} />;
    case "artificiality":
      return <ArtificialityEditor payload={payload} onChange={onChange} />;
    case "corrector":
      return <CorrectorEditor payload={payload} onChange={onChange} />;
    case "essay-collapse":
      return <EssayCollapseEditor payload={payload} onChange={onChange} />;
    case "text-surgery":
      return <TextSurgeryEditor payload={payload} onChange={onChange} />;
    case "survival":
      return <SurvivalEditor payload={payload} onChange={onChange} allGames={allGames} currentGameId={currentGameId} />;
    default:
      return <p className="text-xs text-muted-foreground">Engine &quot;{engine}&quot; sem editor dedicado ainda.</p>;
  }
}
