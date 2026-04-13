import { create } from 'zustand';
import {
  fetchOpenWeatherSnapshot,
  getTimeOfDay,
  type WeatherCondition,
  type TimeOfDay,
} from '../services/weather';

const DEFAULT_WEATHER: WeatherCondition = 'clouds';

interface WeatherState {
  currentWeather: WeatherCondition;
  temperature: number;
  timeOfDay: TimeOfDay;
  lastFetched: number | null;
  /** 캐시/API로 날씨를 한 번이라도 알게 된 뒤 true (조건부 이벤트 weather 필터에 사용) */
  weatherDataAvailable: boolean;
  isLoading: boolean;

  syncTimeOfDay: () => void;
  fetchWeather: (lat: number, lng: number) => Promise<void>;
}

export const useWeatherStore = create<WeatherState>((set, get) => ({
  currentWeather: DEFAULT_WEATHER,
  temperature: 15,
  timeOfDay: getTimeOfDay(),
  lastFetched: null,
  weatherDataAvailable: false,
  isLoading: false,

  syncTimeOfDay: () => set({ timeOfDay: getTimeOfDay() }),

  fetchWeather: async (lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    set({ isLoading: true });
    try {
      const snapshot = await fetchOpenWeatherSnapshot(lat, lng);
      get().syncTimeOfDay();

      if (snapshot) {
        set({
          currentWeather: snapshot.condition,
          temperature: snapshot.temperature,
          lastFetched: snapshot.fetchedAt,
          weatherDataAvailable: true,
          isLoading: false,
        });
        return;
      }

      set((s) => ({
        isLoading: false,
        weatherDataAvailable: s.weatherDataAvailable,
        timeOfDay: getTimeOfDay(),
      }));
    } catch {
      set((s) => ({
        isLoading: false,
        weatherDataAvailable: s.weatherDataAvailable,
        timeOfDay: getTimeOfDay(),
      }));
    }
  },
}));
