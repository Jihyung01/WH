import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Region } from 'react-native-maps';
import type { GeoPoint, NearbyEvent } from '../types/models';
import { getNearbyEvents } from '../lib/api';
import { zustandStorage } from './storage';

interface MapState {
  region: Region | null;
  selectedEventId: string | null;
  visibleEvents: NearbyEvent[];
  isFollowingUser: boolean;
  isFetchingEvents: boolean;
  lastFetchCenter: GeoPoint | null;
  lastFetchTimestamp: number | null;
  activeFilters: {
    categories: string[];
    difficulty: number | null;
    maxDistance: number | null;
  };

  setRegion: (region: Region) => void;
  selectEvent: (eventId: string | null) => void;
  setVisibleEvents: (events: NearbyEvent[]) => void;
  setFollowingUser: (following: boolean) => void;
  setFilters: (filters: Partial<MapState['activeFilters']>) => void;
  resetFilters: () => void;
  fetchNearbyEvents: (center: GeoPoint, radiusKm?: number) => Promise<void>;
}

const defaultFilters = {
  categories: [],
  difficulty: null,
  maxDistance: null,
};

export const useMapStore = create<MapState>()(
  persist(
    (set, get) => ({
      region: null,
      selectedEventId: null,
      visibleEvents: [],
      isFollowingUser: true,
      isFetchingEvents: false,
      lastFetchCenter: null,
      lastFetchTimestamp: null,
      activeFilters: { ...defaultFilters },

      setRegion: (region) => set({ region }),
      selectEvent: (eventId) => set({ selectedEventId: eventId }),
      setVisibleEvents: (events) => set({ visibleEvents: events }),
      setFollowingUser: (following) => set({ isFollowingUser: following }),
      setFilters: (filters) =>
        set((state) => ({
          activeFilters: { ...state.activeFilters, ...filters },
        })),
      resetFilters: () => set({ activeFilters: { ...defaultFilters } }),

      fetchNearbyEvents: async (center, radiusKm = 2) => {
        if (get().isFetchingEvents) return;
        set({ isFetchingEvents: true });
        try {
          const events = await getNearbyEvents(center.latitude, center.longitude, radiusKm);
          set({
            visibleEvents: events,
            lastFetchCenter: center,
            lastFetchTimestamp: Date.now(),
          });
        } catch (err) {
          console.warn('Failed to fetch nearby events:', err);
        } finally {
          set({ isFetchingEvents: false });
        }
      },
    }),
    {
      name: 'wherehere-map',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        visibleEvents: state.visibleEvents,
        lastFetchCenter: state.lastFetchCenter,
        lastFetchTimestamp: state.lastFetchTimestamp,
        activeFilters: state.activeFilters,
      }),
    },
  ),
);
