import { apiFetch } from "@/lib/http-client";
import type { AuthResponse, User } from "@/types/api";

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    apiFetch<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  me: () => apiFetch<User>("/auth/me"),
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
