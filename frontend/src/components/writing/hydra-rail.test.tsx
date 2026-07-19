import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HydraRail } from "@/components/writing/hydra-rail";

describe("HydraRail", () => {
  it("mostra o D da marca e o placeholder da Hydra", () => {
    render(<HydraRail />);
    expect(screen.getByTitle("Donc")).toBeInTheDocument();
  });
});
