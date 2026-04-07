import { create } from 'zustand';
import { blockAnotherUser, fetchBlockedUserIds } from '../lib/api';

interface ModerationState {
  blockedUserIds: Set<string>;
  refreshBlockedUsers: () => Promise<void>;
  blockAndRefresh: (userId: string) => Promise<void>;
  clearBlocks: () => void;
}

export const useModerationStore = create<ModerationState>((set, get) => ({
  blockedUserIds: new Set(),

  refreshBlockedUsers: async () => {
    try {
      const ids = await fetchBlockedUserIds();
      set({ blockedUserIds: new Set(ids) });
    } catch {
      set({ blockedUserIds: new Set() });
    }
  },

  blockAndRefresh: async (userId: string) => {
    await blockAnotherUser(userId);
    await get().refreshBlockedUsers();
  },

  clearBlocks: () => set({ blockedUserIds: new Set() }),
}));
