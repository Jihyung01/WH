import { storage } from '../stores/storage';

const CACHE_KEY = 'weather_cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export type WeatherCondition = 'clear' | 'clouds' | 'rain' | 'snow' | 'mist' | 'unknown';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

interface WeatherData {
  condition: WeatherCondition;
  temperature: number;
  fetchedAt: number;
}

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export async function getCurrentWeather(lat: number, lng: number): Promise<WeatherCondition> {
  try {
    const cached = storage.getString(CACHE_KEY);
    if (cached) {
      const data: WeatherData = JSON.parse(cached);
      if (Date.now() - data.fetchedAt < CACHE_TTL_MS) {
        return data.condition;
      }
    }
  } catch {}

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=demo&units=metric`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!res.ok) return 'unknown';

    const data = await res.json();
    const main = (data?.weather?.[0]?.main ?? '').toLowerCase();

    let condition: WeatherCondition = 'unknown';
    if (main.includes('clear') || main.includes('sun')) condition = 'clear';
    else if (main.includes('cloud')) condition = 'clouds';
    else if (main.includes('rain') || main.includes('drizzle') || main.includes('thunder')) condition = 'rain';
    else if (main.includes('snow')) condition = 'snow';
    else if (main.includes('mist') || main.includes('fog') || main.includes('haze')) condition = 'mist';

    const cacheData: WeatherData = {
      condition,
      temperature: data?.main?.temp ?? 0,
      fetchedAt: Date.now(),
    };
    storage.set(CACHE_KEY, JSON.stringify(cacheData));

    return condition;
  } catch {
    return 'unknown';
  }
}

/**
 * Check if an event's visibility conditions are met.
 * Returns true if the event should be visible.
 */
export function isEventVisible(
  conditions: Record<string, string> | null | undefined,
  currentWeather: WeatherCondition,
): boolean {
  if (!conditions) return true;

  if (conditions.weather && conditions.weather !== currentWeather && currentWeather !== 'unknown') {
    return false;
  }

  if (conditions.time) {
    const currentTime = getTimeOfDay();
    if (conditions.time !== currentTime) return false;
  }

  if (conditions.season) {
    const currentSeason = getCurrentSeason();
    if (conditions.season !== currentSeason) return false;
  }

  return true;
}
