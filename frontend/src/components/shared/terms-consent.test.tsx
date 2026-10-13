import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TermsConsent } from "@/components/shared/terms-consent";

describe("TermsConsent", () => {
  it("é obrigatório e linka termos e privacidade", () => {
    render(<TermsConsent checked={false} onChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toBeRequired();
    expect(screen.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute("href", "/termos");
    expect(screen.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("href", "/privacidade");
  });

  it("avisa a mudança ao marcar", async () => {
    const onChange = vi.fn();
    render(<TermsConsent checked={false} onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
