"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/providers/app-providers";
import { ApiClientError, authApi } from "@/services/api";
import { initials } from "@/utils";

export function AccountCard() {
  const { user, refresh } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <Surface className="bg-primary text-primary-foreground">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-foreground/20 bg-foreground/10 text-2xl font-semibold text-foreground">
          {initials(user?.name ?? "Aluno")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground/62">Aluno Donc</p>
          <h2 className="font-display text-safe text-[28px] font-medium tracking-normal">{user?.name ?? "Aluno"}</h2>
          <p className="text-safe mt-1 text-sm text-foreground/70">{user?.email}</p>
          {user?.created_at ? (
            <p className="mt-1 text-xs text-foreground/55">Membro desde {formatMemberSince(user.created_at)}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="border-white/20 bg-white/15 text-primary-foreground hover:bg-white/25"
              onClick={() => setEditingName(true)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar nome
            </Button>
            <Button
              size="sm"
              className="border-white/20 bg-white/15 text-primary-foreground hover:bg-white/25"
              onClick={() => setChangingPassword(true)}
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Alterar senha
            </Button>
          </div>
        </div>
      </div>

      <EditNameModal
        open={editingName}
        currentName={user?.name ?? ""}
        onClose={() => setEditingName(false)}
        onSaved={async () => {
          await refresh();
          setEditingName(false);
        }}
      />
      <ChangePasswordModal open={changingPassword} onClose={() => setChangingPassword(false)} />
    </Surface>
  );
}

function EditNameModal({
  open,
  currentName,
  onClose,
  onSaved,
}: {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("O nome precisa ter pelo menos 2 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await authApi.updateMe(trimmed);
      toast.success("Perfil atualizado.");
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar nome" icon={Pencil} size="sm">
      <form id="edit-name-form" onSubmit={submit} className="text-foreground">
        <Field label="Nome" error={error} counter={{ value: name.length, max: 120 }}>
          <Input
            value={name}
            maxLength={120}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            placeholder="Seu nome"
          />
        </Field>
      </form>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" form="edit-name-form" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </Modal>
  );
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (next.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("A confirmação não corresponde à nova senha.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await authApi.changePassword(current, next);
      toast.success("Senha alterada.");
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível alterar a senha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Alterar senha"
      icon={KeyRound}
      size="sm"
    >
      <form id="change-password-form" onSubmit={submit} className="grid gap-3 text-foreground">
        <Field label="Senha atual">
          <Input type="password" value={current} autoComplete="current-password" onChange={(event) => setCurrent(event.target.value)} />
        </Field>
        <Field label="Nova senha" error={error && next.length < 8 ? error : null}>
          <Input type="password" value={next} autoComplete="new-password" onChange={(event) => setNext(event.target.value)} />
        </Field>
        <Field label="Confirmar nova senha" error={error && next.length >= 8 ? error : null}>
          <Input type="password" value={confirm} autoComplete="new-password" onChange={(event) => setConfirm(event.target.value)} />
        </Field>
      </form>
      <div className="mt-5 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" form="change-password-form" disabled={saving}>
          {saving ? "Salvando..." : "Alterar senha"}
        </Button>
      </div>
    </Modal>
  );
}

function formatMemberSince(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
