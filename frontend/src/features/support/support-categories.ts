import type { SupportTicketCategory } from "@/types/api";

export const SUPPORT_TICKET_CATEGORIES: { value: SupportTicketCategory; label: string }[] = [
  { value: "billing", label: "Cobrança" },
  { value: "technical_bug", label: "Bug técnico" },
  { value: "correction_question", label: "Dúvida sobre correção" },
  { value: "account_access", label: "Conta e acesso" },
  { value: "other", label: "Outro" },
];

export function supportCategoryLabel(value: SupportTicketCategory): string {
  return SUPPORT_TICKET_CATEGORIES.find((option) => option.value === value)?.label ?? value;
}
