import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SidebarStore = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
};

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    {
      name: "donk.sidebar-collapsed.v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
