import { apiFetch } from "@/lib/http-client";
import type { AuthResponse, User } from "@/types/api";

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    apiFetch<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
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
  recover: (email: string) =>
    apiFetch<{ message: string }>("/auth/password-recovery", { method: "POST", body: JSON.stringify({ email }) }),
  logout: () => apiFetch<{ message: string }>("/auth/logout", { method: "POST" }),
};
