import { apiFetch } from "@/lib/http-client";
import type { AuthResponse, User } from "@/types/api";

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string, turnstileToken?: string | null) =>
    // O cadastro só envia depois do checkbox de aceite marcado (required na UI).
    apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, accept_terms: true, turnstile_token: turnstileToken ?? undefined }),
    }),
  google: (credential: string, acceptTerms: boolean) =>
    apiFetch<AuthResponse>("/auth/google", { method: "POST", body: JSON.stringify({ credential, accept_terms: acceptTerms }) }),
  me: () => apiFetch<User>("/auth/me"),
  // Reemite o access token (claim `sa` inclusa) — sem isso, virar assinante ativo enquanto o
  // token antigo (sa=false) ainda vale faria o proxy.ts empurrar de volta pro paywall mesmo
  // com o backend já liberando os dados (loop /assinatura <-> /dashboard).
  refreshSession: () => apiFetch<AuthResponse>("/auth/refresh", { method: "POST" }),
  updateMe: (name: string) =>
    apiFetch<User>("/auth/me", { method: "PATCH", body: JSON.stringify({ name }) }),
  changePassword: (current_password: string, new_password: string) =>
    apiFetch<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),
  recover: (email: string, turnstileToken?: string | null) =>
    apiFetch<{ message: string }>("/auth/password-recovery", {
      method: "POST",
      body: JSON.stringify({ email, turnstile_token: turnstileToken ?? undefined }),
    }),
  resetPassword: (token: string, new_password: string) =>
    apiFetch<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password }) }),
  verifyEmail: (token: string) =>
    apiFetch<{ message: string }>("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }),
  resendVerification: () => apiFetch<{ message: string }>("/auth/resend-verification", { method: "POST" }),
  exportData: () => apiFetch<Record<string, unknown>>("/auth/me/export"),
  deleteAccount: (password: string) =>
    apiFetch<{ message: string }>("/auth/delete-account", { method: "POST", body: JSON.stringify({ password }) }),
  updatePreferences: (preferences: { reminders_enabled: boolean }) =>
    apiFetch<User>("/auth/me/preferences", { method: "PATCH", body: JSON.stringify(preferences) }),
  unsubscribeReminders: (token: string) =>
    apiFetch<{ message: string }>("/auth/reminders/unsubscribe", { method: "POST", body: JSON.stringify({ token }) }),
  logout: () => apiFetch<{ message: string }>("/auth/logout", { method: "POST" }),
};
