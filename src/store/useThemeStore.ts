import { create } from 'zustand';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('fahad-erp-theme') as ThemeMode) || 'dark',
  setTheme: (theme) => {
    localStorage.setItem('fahad-erp-theme', theme);
    set({ theme });
  },
}));
