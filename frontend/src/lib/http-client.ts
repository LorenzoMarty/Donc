import { publicEnv } from "@/lib/env";
import type { ApiEnvelope } from "@/types/api";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("access_token");
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  return typeof payload === "object" && payload !== null && "success" in payload && "message" in payload;
}

async function readJson(response: Response) {
  if (response.status === 204) return null;
  return response.json().catch(() => null) as Promise<unknown>;
}

function buildHeaders(options: RequestInit) {
  const headers = new Headers(options.headers);
  const token = getToken();
  const hasFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body && !hasFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

function errorFromPayload(payload: unknown, status: number) {
  if (isApiEnvelope<unknown>(payload) && payload.success === false) {
    return new ApiClientError(payload.message || "Erro inesperado.", status, payload.error ?? "api_error", payload);
  }

  if (typeof payload === "object" && payload !== null) {
    const data = payload as { detail?: string; message?: string; code?: string; error?: string };
    return new ApiClientError(data.message ?? data.detail ?? "Erro inesperado.", status, data.error ?? data.code ?? "api_error", payload);
  }

  return new ApiClientError("Erro inesperado.", status, "api_error", payload);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${publicEnv.apiUrl}${path}`, {
    ...options,
    headers: buildHeaders(options),
    credentials: "include",
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw errorFromPayload(payload, response.status);
  }

  if (isApiEnvelope<T>(payload)) {
    if (!payload.success) throw errorFromPayload(payload, response.status);
    return payload.data;
  }

  return payload as T;
}
