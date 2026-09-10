import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TicketForm } from "@/app/(app)/suporte/components/ticket-form";

const createTicket = vi.fn();

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return {
    ...actual,
    supportApi: { createTicket: (...args: unknown[]) => createTicket(...args) },
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("TicketForm", () => {
  beforeEach(() => {
    createTicket.mockReset();
  });

  it("bloqueia envio com mensagem curta e não chama a API", async () => {
    const user = userEvent.setup();
    render(<TicketForm />);

    await user.type(screen.getByLabelText(/assunto/i), "Assunto valido");
    await user.type(screen.getByLabelText(/mensagem/i), "curta");
    await user.click(screen.getByRole("button", { name: /enviar chamado/i }));

    expect(createTicket).not.toHaveBeenCalled();
    expect(screen.getByText(/pelo menos 10 caracteres/i)).toBeInTheDocument();
  });

  it("envia o chamado com a categoria escolhida e mostra confirmação", async () => {
    createTicket.mockResolvedValue({ message: "Chamado enviado." });
    const user = userEvent.setup();
    render(<TicketForm />);

    await user.selectOptions(screen.getByLabelText(/categoria/i), "technical_bug");
    await user.type(screen.getByLabelText(/assunto/i), "Editor trava ao salvar");
    await user.type(screen.getByLabelText(/mensagem/i), "O editor de redação trava sempre que tento salvar o rascunho.");
    await user.click(screen.getByRole("button", { name: /enviar chamado/i }));

    await waitFor(() =>
      expect(createTicket).toHaveBeenCalledWith(
        "technical_bug",
        "Editor trava ao salvar",
        "O editor de redação trava sempre que tento salvar o rascunho.",
      ),
    );
    expect(await screen.findByText(/chamado enviado/i)).toBeInTheDocument();
  });
});
