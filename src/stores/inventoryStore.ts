import { create } from 'zustand';
import type { UserBadge, Badge, InventoryItem } from '../types/models';
import { getMyBadges, getAllBadges, getMyInventory } from '../lib/api';

interface InventoryState {
  userBadges: UserBadge[];
  allBadges: Badge[];
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;

  fetchBadges: () => Promise<void>;
  fetchAllBadges: () => Promise<void>;
  fetchItems: () => Promise<void>;
  fetchAll: () => Promise<void>;
  clear: () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  userBadges: [],
  allBadges: [],
  items: [],
  isLoading: false,
  error: null,

  fetchBadges: async () => {
    try {
      const data = await getMyBadges();
      set({ userBadges: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchAllBadges: async () => {
    try {
      const data = await getAllBadges();
      set({ allBadges: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchItems: async () => {
    try {
      const data = await getMyInventory();
      set({ items: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    await Promise.all([get().fetchBadges(), get().fetchAllBadges(), get().fetchItems()]);
    set({ isLoading: false });
  },

  clear: () => set({ userBadges: [], allBadges: [], items: [], error: null }),
}));
