import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MyTickets } from "@/app/(app)/suporte/components/my-tickets";
import type { SupportTicket } from "@/types/api";

const myTickets = vi.fn();
const reply = vi.fn();

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return { ...actual, supportApi: { myTickets: (...args: unknown[]) => myTickets(...args), reply: (...args: unknown[]) => reply(...args) } };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function ticket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 7,
    category: "suggestion",
    subject: "Modo escuro",
    message: "Queria modo escuro nas aulas.",
    status: "open",
    created_at: "2026-10-10T10:00:00Z",
    updated_at: "2026-10-10T10:00:00Z",
    messages: [{ id: 1, author_role: "admin", body: "Boa ideia, vamos avaliar.", created_at: "2026-10-11T10:00:00Z" }],
    ...overrides,
  };
}

describe("MyTickets", () => {
  beforeEach(() => {
    myTickets.mockReset();
    reply.mockReset();
  });

  it("shows the empty state when there are no tickets", async () => {
    myTickets.mockResolvedValue([]);
    render(<MyTickets />);
    expect(await screen.findByText(/ainda não abriu nenhum chamado/i)).toBeInTheDocument();
  });

  it("renders the conversation and marks answered tickets", async () => {
    myTickets.mockResolvedValue([ticket()]);
    render(<MyTickets />);
    expect(await screen.findByText("Boa ideia, vamos avaliar.")).toBeInTheDocument();
    expect(screen.getByText("Respondido")).toBeInTheDocument();
    expect(screen.getByText("Equipe Donc")).toBeInTheDocument();
  });

  it("sends a follow-up and shows the updated thread", async () => {
    myTickets.mockResolvedValue([ticket()]);
    reply.mockResolvedValue(
      ticket({ messages: [...ticket().messages, { id: 2, author_role: "student", body: "Obrigado!", created_at: "2026-10-12T10:00:00Z" }] }),
    );
    const user = userEvent.setup();
    render(<MyTickets />);

    await user.type(await screen.findByLabelText(/responder ao chamado modo escuro/i), "Obrigado!");
    await user.click(screen.getByRole("button", { name: "Responder" }));

    await waitFor(() => expect(reply).toHaveBeenCalledWith(7, "Obrigado!"));
    expect(await screen.findByText("Obrigado!")).toBeInTheDocument();
  });
});
