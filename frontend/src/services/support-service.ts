import { apiFetch } from "@/lib/http-client";
import type { AdminSupportTicket, AdminSupportTicketListResponse, SupportTicketCategory, SupportTicketStatus } from "@/types/api";

export const supportApi = {
  createTicket: (category: SupportTicketCategory, subject: string, message: string) =>
    apiFetch<{ message: string }>("/support/tickets", {
      method: "POST",
      body: JSON.stringify({ category, subject, message }),
    }),
};

export const adminSupportApi = {
  listTickets: (params: { limit?: number; offset?: number; status?: string; category?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.limit) search.set("limit", String(params.limit));
    if (params.offset) search.set("offset", String(params.offset));
    if (params.status) search.set("status", params.status);
    if (params.category) search.set("category", params.category);
    const query = search.toString();
    return apiFetch<AdminSupportTicketListResponse>(`/admin/support-tickets${query ? `?${query}` : ""}`);
  },
  updateStatus: (id: number, status: SupportTicketStatus) =>
    apiFetch<AdminSupportTicket>(`/admin/support-tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
