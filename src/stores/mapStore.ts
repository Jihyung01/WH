import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Region } from 'react-native-maps';
import type { GeoPoint, NearbyEvent } from '../types/models';
import { getNearbyEvents } from '../lib/api';
import { zustandStorage } from './storage';
import { useModerationStore } from './moderationStore';
import { filterByBlockedCreators } from '../utils/moderationFilters';
import { isEventVisible } from '../services/weather';
import { useWeatherStore } from './weatherStore';

function filterEventsByWeatherVisibility(events: NearbyEvent[]): NearbyEvent[] {
  const { currentWeather, weatherDataAvailable } = useWeatherStore.getState();
  return events.filter((e) =>
    isEventVisible(e.visibility_conditions, currentWeather, {
      weatherKnown: weatherDataAvailable,
    }),
  );
}

interface MapState {
  region: Region | null;
  selectedEventId: string | null;
  /** 차단 필터 후 전체(날씨 필터 전) — 날씨 갱신 시 재적용용 */
  nearbyEventsBuffered: NearbyEvent[];
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
  /** Pass a new list, or an updater `(prev) => next` (Zustand-style). */
  setVisibleEvents: (
    events: NearbyEvent[] | ((prev: NearbyEvent[]) => NearbyEvent[]),
  ) => void;
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
      nearbyEventsBuffered: [],
      visibleEvents: [],
      isFollowingUser: true,
      isFetchingEvents: false,
      lastFetchCenter: null,
      lastFetchTimestamp: null,
      activeFilters: { ...defaultFilters },

      setRegion: (region) => set({ region }),
      selectEvent: (eventId) => set({ selectedEventId: eventId }),
      setVisibleEvents: (events) =>
        set((state) => {
          const prev = Array.isArray(state.visibleEvents) ? state.visibleEvents : [];
          const next =
            typeof events === 'function'
              ? (events as (p: NearbyEvent[]) => NearbyEvent[])(prev)
              : events;
          return { visibleEvents: Array.isArray(next) ? next : prev };
        }),
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
          let events = await getNearbyEvents(center.latitude, center.longitude, radiusKm);
          events = filterByBlockedCreators(
            events,
            useModerationStore.getState().blockedUserIds,
          );
          const visible = filterEventsByWeatherVisibility(events);
          set({
            nearbyEventsBuffered: events,
            visibleEvents: visible,
            lastFetchCenter: center,
            lastFetchTimestamp: Date.now(),
          });
        } catch (err) {
          console.warn('Failed to fetch nearby events:', err);
        } finally {
          set({ isFetchingEvents: false });
        }
      },

      applyWeatherToBufferedEvents: () => {
        const buf = get().nearbyEventsBuffered;
        if (!Array.isArray(buf) || buf.length === 0) return;
        set({ visibleEvents: filterEventsByWeatherVisibility(buf) });
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
      merge: (persisted, current) => {
        const p = persisted as Partial<MapState> | undefined;
        const vis = p?.visibleEvents;
        return {
          ...current,
          ...p,
          visibleEvents: Array.isArray(vis) ? vis : current.visibleEvents,
        };
      },
    },
  ),
);
