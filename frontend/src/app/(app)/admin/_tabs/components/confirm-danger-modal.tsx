"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export type ImpactRow = { label: string; value: string | number };

/**
 * Confirmação de ação destrutiva com preview de impacto — substitui `window.confirm` genérico
 * nas telas de admin (excluir aluno/tema/módulo/jogo). Sem isso, o admin decide "às cegas": o
 * texto do confirm não diz quantas redações/tentativas/aulas dependem do que vai ser apagado,
 * mesmo esse dado já estando disponível na tela (auditoria de UX, achado #5.2/#6.1/#7.1/#9.2).
 */
export function ConfirmDangerModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  impact,
  confirmLabel = "Excluir",
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  impact: ImpactRow[];
  confirmLabel?: string;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={AlertTriangle}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-foreground">{description}</p>
      {impact.length > 0 && (
        <div className="mt-4 grid gap-1.5 rounded-control bg-warning/10 p-3">
          {impact.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold text-foreground">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
