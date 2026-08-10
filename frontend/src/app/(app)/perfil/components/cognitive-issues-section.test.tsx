import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CognitiveIssuesSection } from "@/app/(app)/perfil/components/cognitive-issues-section";
import type { CognitiveIssueRecord } from "@/services/api";

function makeIssue(overrides: Partial<CognitiveIssueRecord> = {}): CognitiveIssueRecord {
  return {
    state: "TRAINING",
    negative_count: 3,
    positive_streak: 0,
    updated_at: "2026-08-01T10:00:00",
    confidence: "medium",
    detected_at: "2026-07-20T10:00:00",
    evidence_count: 4,
    last_evidence_at: "2026-08-05T10:00:00",
    ...overrides,
  };
}

describe("CognitiveIssuesSection — evolução histórica (P2a REQ-23)", () => {
  it("mostra quando o problema foi detectado e quantas evidências foram registradas", () => {
    render(<CognitiveIssuesSection issues={{ C3_LOW: makeIssue() }} />);

    expect(screen.getByText(/detectado/i)).toBeInTheDocument();
    expect(screen.getByText(/4 evidências/i)).toBeInTheDocument();
  });

  it("mostra o nível de confiança do diagnóstico", () => {
    render(<CognitiveIssuesSection issues={{ C3_LOW: makeIssue({ confidence: "high" }) }} />);

    expect(screen.getByText(/confiança alta/i)).toBeInTheDocument();
  });

  it("não quebra quando o issue ainda não tem evidência registrada (estado pré-migração)", () => {
    render(
      <CognitiveIssuesSection
        issues={{ C3_LOW: makeIssue({ detected_at: null, evidence_count: 0, last_evidence_at: null }) }}
      />,
    );

    expect(screen.queryByText(/detectado em/i)).not.toBeInTheDocument();
  });
});
