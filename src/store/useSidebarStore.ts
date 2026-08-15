import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: localStorage.getItem('fahad-erp-sidebar-collapsed') === 'true',
  toggleSidebar: () =>
    set((state) => {
      const nextState = !state.isCollapsed;
      localStorage.setItem('fahad-erp-sidebar-collapsed', String(nextState));
      return { isCollapsed: nextState };
    }),
  setCollapsed: (collapsed) => {
    localStorage.setItem('fahad-erp-sidebar-collapsed', String(collapsed));
    set({ isCollapsed: collapsed });
  },
}));
