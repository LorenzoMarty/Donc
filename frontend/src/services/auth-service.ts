import { apiFetch } from "@/lib/http-client";
import type { TokenResponse, User } from "@/types/api";

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    apiFetch<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  me: () => apiFetch<User>("/auth/me"),
  recover: (email: string) =>
    apiFetch<{ message: string }>("/auth/password-recovery", { method: "POST", body: JSON.stringify({ email }) }),
};
