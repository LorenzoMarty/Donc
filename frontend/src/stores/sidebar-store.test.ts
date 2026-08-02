import { beforeEach, describe, expect, it } from "vitest";

import { useSidebarStore } from "@/stores/sidebar-store";

beforeEach(() => {
  useSidebarStore.setState({ collapsed: false });
});

describe("useSidebarStore", () => {
  it("começa expandido (collapsed=false) por padrão", () => {
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it("setCollapsed(true) recolhe a sidebar", () => {
    useSidebarStore.getState().setCollapsed(true);
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it("setCollapsed(false) expande a sidebar de volta", () => {
    useSidebarStore.getState().setCollapsed(true);
    useSidebarStore.getState().setCollapsed(false);
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it("persiste o estado colapsado no localStorage sob a chave donk.sidebar-collapsed.v1", () => {
    useSidebarStore.getState().setCollapsed(true);
    const stored = JSON.parse(window.localStorage.getItem("donk.sidebar-collapsed.v1") ?? "{}");
    expect(stored.state.collapsed).toBe(true);
  });
});
