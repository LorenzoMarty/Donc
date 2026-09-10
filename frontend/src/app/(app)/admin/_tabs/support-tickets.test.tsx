import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SupportTicketsTab } from "@/app/(app)/admin/_tabs/support-tickets";
import type { AdminSupportTicket, AdminSupportTicketListResponse } from "@/types/api";

const listTickets = vi.fn();
const updateStatus = vi.fn();

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return {
    ...actual,
    adminSupportApi: {
      listTickets: (...args: unknown[]) => listTickets(...args),
      updateStatus: (...args: unknown[]) => updateStatus(...args),
    },
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeTicket(overrides: Partial<AdminSupportTicket> = {}): AdminSupportTicket {
  return {
    id: 1,
    category: "billing",
    subject: "Cobranca duplicada",
    message: "Fui cobrado duas vezes.",
    status: "open",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
    user_id: 7,
    user_name: "Aluno Demo",
    user_email: "aluno@demo.com",
    ...overrides,
  };
}

describe("SupportTicketsTab", () => {
  beforeEach(() => {
    listTickets.mockReset();
    updateStatus.mockReset();
  });

  it("lista os chamados retornados pela API", async () => {
    const response: AdminSupportTicketListResponse = { items: [makeTicket()], total: 1 };
    listTickets.mockResolvedValue(response);

    render(<SupportTicketsTab />);

    expect(await screen.findByText("Cobranca duplicada")).toBeInTheDocument();
    expect(screen.getByText("aluno@demo.com")).toBeInTheDocument();
  });

  it("marca um chamado como resolvido e atualiza a linha", async () => {
    const response: AdminSupportTicketListResponse = { items: [makeTicket()], total: 1 };
    listTickets.mockResolvedValue(response);
    updateStatus.mockResolvedValue(makeTicket({ status: "resolved" }));

    const user = userEvent.setup();
    render(<SupportTicketsTab />);

    await screen.findByText("Cobranca duplicada");
    await user.click(screen.getByRole("button", { name: /marcar como resolvido/i }));

    await waitFor(() => expect(updateStatus).toHaveBeenCalledWith(1, "resolved"));
    const table = screen.getByRole("table");
    expect(await within(table).findByText("Resolvido")).toBeInTheDocument();
  });
});
