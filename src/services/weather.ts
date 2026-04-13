import { storage } from '../stores/storage';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export type WeatherCondition =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'snow'
  | 'thunderstorm'
  | 'mist'
  | 'drizzle';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface WeatherSnapshot {
  condition: WeatherCondition;
  temperature: number;
  fetchedAt: number;
  lat: number;
  lng: number;
}

export type VisibilityConditions = {
  weather?: string;
  time?: TimeOfDay | string;
  season?: Season | string;
};

function cacheKey(lat: number, lng: number): string {
  const rLat = Math.round(lat * 10) / 10;
  const rLng = Math.round(lng * 10) / 10;
  return `weather_cache_${rLat}_${rLng}`;
}

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

export function getCurrentSeason(date = new Date()): Season {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function getOpenWeatherApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY?.trim() || undefined;
}

/** Map Open-Weather `weather[].main` to our condition set */
export function mapOpenWeatherMain(main: string): WeatherCondition {
  const m = (main ?? '').toLowerCase();
  if (m === 'clear') return 'clear';
  if (m.includes('thunder')) return 'thunderstorm';
  if (m.includes('drizzle')) return 'drizzle';
  if (m.includes('rain')) return 'rain';
  if (m.includes('snow')) return 'snow';
  if (m.includes('mist') || m.includes('fog') || m.includes('haze') || m === 'smoke' || m === 'dust')
    return 'mist';
  if (m.includes('cloud')) return 'clouds';
  return 'clouds';
}

/** DB `visibility_conditions.weather` 값과 현재 조건이 맞는지 */
export function weatherMatchesVisibility(expected: string, current: WeatherCondition): boolean {
  const e = expected.toLowerCase();
  if (e === current) return true;
  if (e === 'rain') {
    return current === 'rain' || current === 'drizzle' || current === 'thunderstorm';
  }
  return false;
}

function readCache(lat: number, lng: number): WeatherSnapshot | null {
  try {
    const raw = storage.getString(cacheKey(lat, lng));
    if (!raw) return null;
    const data = JSON.parse(raw) as WeatherSnapshot;
    if (Date.now() - data.fetchedAt > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(snapshot: WeatherSnapshot): void {
  try {
    storage.set(cacheKey(snapshot.lat, snapshot.lng), JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

/**
 * 캐시가 유효하면 네트워크 생략. API 키 없으면 null 반환.
 */
export async function fetchOpenWeatherSnapshot(lat: number, lng: number): Promise<WeatherSnapshot | null> {
  const cached = readCache(lat, lng);
  if (cached) return cached;

  const apiKey = getOpenWeatherApiKey();
  if (!apiKey) {
    return null;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${encodeURIComponent(
    apiKey,
  )}&units=metric&lang=kr`;

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    weather?: { main?: string }[];
    main?: { temp?: number };
  };
  const main = data?.weather?.[0]?.main ?? 'Clouds';
  const condition = mapOpenWeatherMain(main);
  const temperature = typeof data?.main?.temp === 'number' ? data.main.temp : 0;

  const snapshot: WeatherSnapshot = {
    condition,
    temperature,
    fetchedAt: Date.now(),
    lat,
    lng,
  };
  writeCache(snapshot);
  return snapshot;
}

/**
 * 이벤트 표시 여부. `weatherKnown === false`이면 weather 키는 통과(아직 동기화 전).
 */
export function isEventVisible(
  conditions: VisibilityConditions | Record<string, string> | null | undefined,
  currentWeather: WeatherCondition,
  options?: { weatherKnown?: boolean },
): boolean {
  if (!conditions || typeof conditions !== 'object') return true;

  const weatherKnown = options?.weatherKnown ?? true;
  const w = conditions.weather;
  if (w && weatherKnown && !weatherMatchesVisibility(String(w), currentWeather)) {
    return false;
  }

  if (conditions.time) {
    const currentTime = getTimeOfDay();
    if (String(conditions.time) !== currentTime) return false;
  }

  if (conditions.season) {
    const currentSeason = getCurrentSeason();
    if (String(conditions.season) !== currentSeason) return false;
  }

  return true;
}

export function getConditionalEventTag(
  conditions: VisibilityConditions | Record<string, unknown> | null | undefined,
): string | null {
  if (!conditions || typeof conditions !== 'object') return null;
  const w = conditions.weather != null ? String(conditions.weather) : '';
  const t = conditions.time != null ? String(conditions.time) : '';
  const s = conditions.season != null ? String(conditions.season) : '';

  if (w === 'rain') return '🌧️ 비 오는 날 한정';
  if (w === 'snow') return '❄️ 눈 오는 날 한정';
  if (w === 'clear') return '☀️ 맑은 날 한정';
  if (w === 'clouds') return '☁️ 흐린 날 한정';
  if (t === 'night') return '🌙 야간 한정';
  if (t === 'morning') return '🌅 아침 한정';
  if (t === 'afternoon') return '☀️ 오후 한정';
  if (t === 'evening') return '🌆 저녁 한정';
  if (s === 'spring') return '🌸 봄 한정';
  if (s === 'summer') return '☀️ 여름 한정';
  if (s === 'autumn') return '🍂 가을 한정';
  if (s === 'winter') return '⛄ 겨울 한정';
  return '✨ 조건부 이벤트';
}
