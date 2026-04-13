import * as Location from 'expo-location';

const cache = new Map<string, string>();
const CACHE_MAX = 200;

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * GPS → 동/구 단위 라벨 (정확한 좌표 노출 없음). expo-location reverse geocode.
 */
export async function reverseGeocodeToDistrict(latitude: number, longitude: number): Promise<string> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '위치 불명';

  const key = cacheKey(latitude, longitude);
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const r = results[0];
    if (!r) {
      cache.set(key, '위치 불명');
      return '위치 불명';
    }

    const sub = (r as { subLocality?: string | null }).subLocality?.trim();
    const district = (r as { district?: string | null }).district?.trim();
    const city = (r as { city?: string | null }).city?.trim();
    const region = (r as { region?: string | null }).region?.trim();

    let label = sub || district || '';
    if (!label && city) label = city;
    if (!label && region) label = region;
    if (!label) label = '서울 근처';

    if (cache.size >= CACHE_MAX) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    cache.set(key, label);
    return label;
  } catch {
    return '위치 불명';
  }
}
