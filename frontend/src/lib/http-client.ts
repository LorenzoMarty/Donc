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

const ERROR_CODE_MESSAGES: Record<string, string> = {
  not_authenticated: "Faça login para continuar.",
  invalid_token: "Sessão expirada. Faça login novamente.",
  user_not_found: "Usuário não encontrado.",
  admin_required: "Acesso restrito a administradores.",
  essay_not_found: "Redação não encontrada.",
  theme_not_found: "Tema de redação não encontrado.",
  essay_locked: "Esta redação já foi corrigida e não pode ser editada.",
  essay_too_short: "A redação precisa ter pelo menos 80 palavras.",
  edit_required: "Edite o texto antes de corrigir novamente.",
  empty_draft: "Rascunhos vazios não são salvos.",
  duplicate_theme: "Ja existe um tema ativo com esse titulo.",
  invalid_theme_title: "Título do tema precisa ter pelo menos 8 caracteres.",
  invalid_theme_context: "Contexto do tema precisa ter pelo menos 20 caracteres.",
  invalid_supporting_text_type: "Escolha um tipo válido para o texto motivador.",
  invalid_supporting_text: "Revise título e conteúdo dos textos motivadores.",
  missing_supporting_texts: "Adicione pelo menos um texto motivador.",
  too_many_supporting_texts: "Use no máximo 8 textos motivadores por tema.",
  supporting_text_count_mismatch: "A IA não gerou todos os textos solicitados. Tente novamente com menos tipos.",
  invalid_activity_lessons: "Escolha apenas aulas do mesmo módulo para gerar a atividade.",
  activity_not_found: "Atividade não encontrada.",
  module_item_not_found: "Item do módulo não encontrado.",
  ai_job_not_found: "Correção não encontrada.",
  rate_limit_exceeded: "Muitas requisições. Aguarde um momento.",
  password_recovery_not_configured: "Recuperação por e-mail ainda não está configurada.",
};

function errorFromPayload(payload: unknown, status: number) {
  if (isApiEnvelope<unknown>(payload) && payload.success === false) {
    const code = payload.error ?? "api_error";
    const message = ERROR_CODE_MESSAGES[code] ?? payload.message ?? "Erro inesperado.";
    return new ApiClientError(message, status, code, payload);
  }

  if (typeof payload === "object" && payload !== null) {
    const data = payload as { detail?: string; message?: string; code?: string; error?: string };
    const code = data.error ?? data.code ?? "api_error";
    const rawMessage = data.message ?? data.detail ?? "Erro inesperado.";
    const message = ERROR_CODE_MESSAGES[code] ?? rawMessage;
    return new ApiClientError(message, status, code, payload);
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
