"use client";

import { useState, type FormEvent } from "react";
import { Download, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiClientError, authApi } from "@/services/api";

export function PrivacyCard() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function downloadData() {
    setExporting(true);
    try {
      const data = await authApi.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "meus-dados-donc.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Não foi possível baixar seus dados.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Surface>
      <h2 className="section-title font-semibold">Privacidade e dados</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Você pode baixar uma cópia dos seus dados ou excluir sua conta quando quiser (LGPD).
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="min-h-11" disabled={exporting} onClick={downloadData}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {exporting ? "Preparando..." : "Baixar meus dados"}
        </Button>
        <Button type="button" variant="ghost" className="min-h-11 text-destructive" onClick={() => setDeleting(true)}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Excluir minha conta
        </Button>
      </div>
      <DeleteAccountModal open={deleting} onClose={() => setDeleting(false)} />
    </Surface>
  );
}

function DeleteAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function close() {
    setPassword("");
    setError(null);
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await authApi.deleteAccount(password);
      window.location.replace("/");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível excluir a conta.");
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Excluir minha conta" icon={ShieldAlert} size="sm">
      <form id="delete-account-form" onSubmit={submit} className="grid gap-3 text-foreground">
        <p className="text-sm text-muted-foreground">
          Isso apaga suas redações, progresso e chamados, cancela sua assinatura e encerra todas as sessões. Não dá para
          desfazer. Registros de pagamento ficam guardados pelo prazo fiscal (5 anos), sem seus dados pessoais.
        </p>
        <Field label="Confirme sua senha" error={error}>
          <Input type="password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
        </Field>
      </form>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          Cancelar
        </Button>
        <Button type="submit" form="delete-account-form" variant="destructive" disabled={saving || password.length === 0}>
          {saving ? "Excluindo..." : "Excluir definitivamente"}
        </Button>
      </div>
    </Modal>
  );
}
