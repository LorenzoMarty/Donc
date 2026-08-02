import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, ApiClientError } from "@/lib/http-client";

describe("apiFetch", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("traduz falha de rede (fetch rejeitado) em mensagem amigável em pt-BR, não o erro cru do browser", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiFetch("/essays")).rejects.toMatchObject({
      message: "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
    });
  });

  it("lança ApiClientError com o código mapeado quando a API responde com erro conhecido", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: "erro", error: "essay_not_found" }), { status: 404 }),
    );

    await expect(apiFetch("/essays/1")).rejects.toMatchObject({
      message: "Redação não encontrada.",
      code: "essay_not_found",
    });
  });

  it("retorna os dados desempacotados quando a resposta é bem-sucedida", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: "ok", data: { id: 1 } }), { status: 200 }),
    );

    await expect(apiFetch("/essays/1")).resolves.toEqual({ id: 1 });
  });

  it("é uma instância de ApiClientError com status/code em erro de rede", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError("Failed to fetch"));

    try {
      await apiFetch("/essays");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).code).toBe("network_error");
    }
  });
});
