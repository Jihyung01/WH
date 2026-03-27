import { create } from 'zustand';
import type { GeoPoint, NearbyEvent, Event } from '../types/models';
import type { EventCategory } from '../types/enums';
import {
  getNearbyEvents,
  getActiveEvents,
  getRecommendedEvents,
  getSeasonalEvents,
} from '../lib/api';

export interface DailySummary {
  completedToday: number;
  dailyGoal: number;
  loginStreak: number;
  dailyRewardCountdown: number;
}

interface QuestState {
  nearbyEvents: NearbyEvent[];
  activeEvents: Event[];
  recommendedEvents: NearbyEvent[];
  seasonalEvents: Event[];
  dailySummary: DailySummary;
  isLoadingNearby: boolean;
  isLoadingActive: boolean;
  isLoadingRecommended: boolean;
  isLoadingSeasonal: boolean;
  searchQuery: string;
  categoryFilter: EventCategory | null;
  difficultyFilter: number | null;
  distanceFilter: number | null;

  setSearchQuery: (q: string) => void;
  setCategoryFilter: (c: EventCategory | null) => void;
  setDifficultyFilter: (d: number | null) => void;
  setDistanceFilter: (d: number | null) => void;
  resetFilters: () => void;
  fetchNearby: (center: GeoPoint) => Promise<void>;
  fetchActive: () => Promise<void>;
  fetchRecommended: (center: GeoPoint) => Promise<void>;
  fetchSeasonal: () => Promise<void>;
  refreshAll: (center: GeoPoint) => Promise<void>;
}

export const useQuestStore = create<QuestState>((set, get) => ({
  nearbyEvents: [],
  activeEvents: [],
  recommendedEvents: [],
  seasonalEvents: [],
  dailySummary: { completedToday: 3, dailyGoal: 5, loginStreak: 7, dailyRewardCountdown: 14400 },
  isLoadingNearby: false,
  isLoadingActive: false,
  isLoadingRecommended: false,
  isLoadingSeasonal: false,
  searchQuery: '',
  categoryFilter: null,
  difficultyFilter: null,
  distanceFilter: null,

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  setDifficultyFilter: (d) => set({ difficultyFilter: d }),
  setDistanceFilter: (d) => set({ distanceFilter: d }),
  resetFilters: () => set({ categoryFilter: null, difficultyFilter: null, distanceFilter: null, searchQuery: '' }),

  fetchNearby: async (center) => {
    set({ isLoadingNearby: true });
    try {
      const events = await getNearbyEvents(center.latitude, center.longitude, 5);
      set({ nearbyEvents: events });
    } catch (err) {
      console.warn('Failed to fetch nearby events:', err);
    } finally {
      set({ isLoadingNearby: false });
    }
  },

  fetchActive: async () => {
    set({ isLoadingActive: true });
    try {
      const data = await getActiveEvents();
      set({ activeEvents: data.map((d: any) => d.events ?? d) });
    } catch (err) {
      console.warn('Failed to fetch active events:', err);
    } finally {
      set({ isLoadingActive: false });
    }
  },

  fetchRecommended: async (center) => {
    set({ isLoadingRecommended: true });
    try {
      const events = await getRecommendedEvents(center.latitude, center.longitude);
      set({ recommendedEvents: events });
    } catch (err) {
      console.warn('Failed to fetch recommended events:', err);
    } finally {
      set({ isLoadingRecommended: false });
    }
  },

  fetchSeasonal: async () => {
    set({ isLoadingSeasonal: true });
    try {
      const events = await getSeasonalEvents();
      set({ seasonalEvents: events });
    } catch (err) {
      console.warn('Failed to fetch seasonal events:', err);
    } finally {
      set({ isLoadingSeasonal: false });
    }
  },

  refreshAll: async (center) => {
    await Promise.all([
      get().fetchNearby(center),
      get().fetchActive(),
      get().fetchRecommended(center),
      get().fetchSeasonal(),
    ]);
  },
}));
