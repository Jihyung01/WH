import type { GeoPoint } from '../types';

/**
 * Calculate distance between two GPS coordinates using the Haversine formula
 * @returns Distance in meters
 */
export function getDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bounding box for a center point and radius
 */
export function getBoundingBox(center: GeoPoint, radiusMeters: number) {
  const latDelta = (radiusMeters / 111320) * 1.2;
  const lngDelta = (radiusMeters / (111320 * Math.cos((center.latitude * Math.PI) / 180))) * 1.2;

  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  };
}

/**
 * Check if a point is within a given radius of a center point
 */
export function isWithinRadius(userLocation: GeoPoint, target: GeoPoint, radiusMeters: number): boolean {
  return getDistance(userLocation, target) <= radiusMeters;
}

// Default map region: 홍대 area
export const HONGDAE_REGION = {
  latitude: 37.5563,
  longitude: 126.9236,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Seoul district center coordinates
export const DISTRICT_CENTERS: Record<string, GeoPoint> = {
  HONGDAE: { latitude: 37.5563, longitude: 126.9236 },
  SEONGSU: { latitude: 37.5445, longitude: 127.0566 },
  GANGNAM: { latitude: 37.4979, longitude: 127.0276 },
  ITAEWON: { latitude: 37.5340, longitude: 126.9948 },
  JONGNO: { latitude: 37.5704, longitude: 126.9920 },
  SHINCHON: { latitude: 37.5553, longitude: 126.9366 },
  YEOUIDO: { latitude: 37.5219, longitude: 126.9245 },
};
