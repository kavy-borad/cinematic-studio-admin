import { create } from 'zustand';

interface UIState {
  collapsed: boolean;
  headerTitle: string;
  headerSubtitle?: string;
  toggleSidebar: () => void;
  setHeaderInfo: (title: string, subtitle?: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  collapsed: false,
  headerTitle: "Aura Admin",
  headerSubtitle: "Cinematic Weddings",
  toggleSidebar: () => set((state) => ({ collapsed: !state.collapsed })),
  setHeaderInfo: (title, subtitle) => set({ headerTitle: title, headerSubtitle: subtitle }),
}));
