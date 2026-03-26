import { create } from 'zustand';
import type { InventoryItem, Badge } from '../types';

interface InventoryState {
  items: InventoryItem[];
  badges: Badge[];
  isLoading: boolean;

  // Actions
  setItems: (items: InventoryItem[]) => void;
  addItem: (item: InventoryItem) => void;
  removeItem: (itemId: string) => void;
  setBadges: (badges: Badge[]) => void;
  addBadge: (badge: Badge) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  items: [],
  badges: [],
  isLoading: false,

  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (itemId) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),
  setBadges: (badges) => set({ badges }),
  addBadge: (badge) => set((state) => ({ badges: [...state.badges, badge] })),
  setLoading: (loading) => set({ isLoading: loading }),
  clear: () => set({ items: [], badges: [] }),
}));
