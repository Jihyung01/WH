import { create } from 'zustand';
import type { GeoPoint } from '../types';

interface LocationState {
  currentPosition: GeoPoint | null;
  heading: number | null;
  speed: number | null;
  locationPermission: 'undetermined' | 'granted' | 'denied';
  isTracking: boolean;

  // Actions
  setPosition: (position: GeoPoint) => void;
  setHeading: (heading: number) => void;
  setSpeed: (speed: number) => void;
  setPermission: (permission: 'undetermined' | 'granted' | 'denied') => void;
  setTracking: (tracking: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentPosition: null,
  heading: null,
  speed: null,
  locationPermission: 'undetermined',
  isTracking: false,

  setPosition: (position) => set({ currentPosition: position }),
  setHeading: (heading) => set({ heading }),
  setSpeed: (speed) => set({ speed }),
  setPermission: (permission) => set({ locationPermission: permission }),
  setTracking: (tracking) => set({ isTracking: tracking }),
}));
