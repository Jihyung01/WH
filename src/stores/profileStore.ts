import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserStats, LeaderboardEntry, VisitedLocation } from '../types/models';
import { getUserStats, getLeaderboard, getVisitedLocations } from '../lib/api';
import { zustandStorage } from './storage';

interface ProfileState {
  stats: UserStats | null;
  leaderboard: LeaderboardEntry[];
  leaderboardDistrict: string | null;
  visitedLocations: VisitedLocation[];
  myRank: number | null;
  isLoadingStats: boolean;
  isLoadingLeaderboard: boolean;

  fetchStats: () => Promise<void>;
  fetchLeaderboard: (district?: string) => Promise<void>;
  fetchVisitedLocations: () => Promise<void>;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      stats: null,
      leaderboard: [],
      leaderboardDistrict: null,
      visitedLocations: [],
      myRank: null,
      isLoadingStats: false,
      isLoadingLeaderboard: false,

      fetchStats: async () => {
        set({ isLoadingStats: true });
        try {
          const data = await getUserStats();
          set({ stats: data });
        } catch (err) {
          console.warn('Failed to fetch stats:', err);
        } finally {
          set({ isLoadingStats: false });
        }
      },

      fetchLeaderboard: async (district) => {
        set({ isLoadingLeaderboard: true, leaderboardDistrict: district ?? null });
        try {
          const data = await getLeaderboard(district);
          set({ leaderboard: data, myRank: null });
        } catch (err) {
          console.warn('Failed to fetch leaderboard:', err);
        } finally {
          set({ isLoadingLeaderboard: false });
        }
      },

      fetchVisitedLocations: async () => {
        try {
          const data = await getVisitedLocations();
          set({ visitedLocations: data });
        } catch (err) {
          console.warn('Failed to fetch visited locations:', err);
        }
      },

      clear: () => set({ stats: null, leaderboard: [], visitedLocations: [], myRank: null }),
    }),
    {
      name: 'wherehere-profile',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        stats: state.stats,
        leaderboard: state.leaderboard,
        visitedLocations: state.visitedLocations,
      }),
    },
  ),
);
