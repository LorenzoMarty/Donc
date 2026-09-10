import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FaqAccordion } from "@/app/(app)/suporte/components/faq-accordion";

const ITEMS = [
  { question: "Pergunta um?", answer: "Resposta um." },
  { question: "Pergunta dois?", answer: "Resposta dois." },
];

describe("FaqAccordion", () => {
  it("esconde as respostas por padrão e mostra ao clicar na pergunta", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion items={ITEMS} />);

    expect(screen.queryByText("Resposta um.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pergunta um?" }));

    expect(screen.getByText("Resposta um.")).toBeInTheDocument();
    expect(screen.queryByText("Resposta dois.")).not.toBeInTheDocument();
  });

  it("fecha de novo ao clicar na mesma pergunta", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion items={ITEMS} />);

    const button = screen.getByRole("button", { name: "Pergunta um?" });
    await user.click(button);
    await user.click(button);

    expect(screen.queryByText("Resposta um.")).not.toBeInTheDocument();
  });
});
