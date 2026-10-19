"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Surface } from "@/components/shared/premium-ui";
import { useAuth } from "@/providers/app-providers";
import { ApiClientError, authApi } from "@/services/api";

export function RemindersCard() {
  const { user, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  if (!user) return null;
  const enabled = user.reminders_enabled !== false;

  async function toggle(next: boolean) {
    setSaving(true);
    try {
      await authApi.updatePreferences({ reminders_enabled: next });
      await refresh();
      toast.success(next ? "Lembretes ativados." : "Lembretes desativados.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Não foi possível salvar a preferência.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Surface>
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3" data-testid="reminders-card">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5"
          checked={enabled}
          disabled={saving}
          onChange={(event) => void toggle(event.target.checked)}
        />
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-semibold">
            <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
            Lembretes por e-mail
          </span>
          <span className="block text-sm text-muted-foreground">
            Um e-mail por dia, às 19h, só quando a sua sequência de estudo estiver em risco. Todo e-mail tem um link para parar de receber.
          </span>
        </span>
      </label>
    </Surface>
  );
}
