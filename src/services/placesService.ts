export type PlacesPriceLevel =
  | 'PRICE_LEVEL_UNSPECIFIED'
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

export interface PlacePhoto {
  /** Example: "places/ChIJ.../photos/..." */
  name: string;
  widthPx?: number;
  heightPx?: number;
}

export interface PlaceOpeningHours {
  openNow?: boolean;
  weekdayDescriptions?: string[];
}

export interface PlaceSummary {
  id: string;
  displayName: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  primaryType?: string;
  photos?: PlacePhoto[];
  regularOpeningHours?: PlaceOpeningHours;
  priceLevel?: PlacesPriceLevel;
}

export interface PlaceDetails extends PlaceSummary {
  websiteUri?: string;
  internationalPhoneNumber?: string;
}

type NearbyType =
  | 'cafe'
  | 'restaurant'
  | 'tourist_attraction'
  | 'park'
  | 'museum'
  | 'shopping_mall'
  | 'convenience_store';

const PLACES_API_KEY = (process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '').trim();
const BASE = 'https://places.googleapis.com/v1';

function requireKey() {
  if (!PLACES_API_KEY) {
    throw new Error('GOOGLE_PLACES_KEY_MISSING');
  }
}

function headers(fieldMask: string) {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': PLACES_API_KEY,
    'X-Goog-FieldMask': fieldMask,
  };
}

function mapPlace(p: any): PlaceSummary {
  return {
    id: String(p?.id ?? ''),
    displayName: String(p?.displayName?.text ?? p?.displayName ?? ''),
    formattedAddress: typeof p?.formattedAddress === 'string' ? p.formattedAddress : undefined,
    location: p?.location?.latitude != null && p?.location?.longitude != null
      ? { latitude: Number(p.location.latitude), longitude: Number(p.location.longitude) }
      : undefined,
    rating: typeof p?.rating === 'number' ? p.rating : undefined,
    userRatingCount: typeof p?.userRatingCount === 'number' ? p.userRatingCount : undefined,
    googleMapsUri: typeof p?.googleMapsUri === 'string' ? p.googleMapsUri : undefined,
    primaryType: typeof p?.primaryType === 'string' ? p.primaryType : undefined,
    photos: Array.isArray(p?.photos)
      ? p.photos
        .map((ph: any) => ({
          name: String(ph?.name ?? ''),
          widthPx: typeof ph?.widthPx === 'number' ? ph.widthPx : undefined,
          heightPx: typeof ph?.heightPx === 'number' ? ph.heightPx : undefined,
        }))
        .filter((ph: PlacePhoto) => !!ph.name)
      : undefined,
    regularOpeningHours: p?.regularOpeningHours
      ? {
        openNow: typeof p.regularOpeningHours.openNow === 'boolean'
          ? p.regularOpeningHours.openNow
          : undefined,
        weekdayDescriptions: Array.isArray(p.regularOpeningHours.weekdayDescriptions)
          ? p.regularOpeningHours.weekdayDescriptions.filter((s: any) => typeof s === 'string')
          : undefined,
      }
      : undefined,
    priceLevel: typeof p?.priceLevel === 'string' ? p.priceLevel : undefined,
  };
}

export function getPlacePhotoUrl(photoName: string, maxWidthPx = 1200): string {
  // New Places API photo media endpoint
  // https://places.googleapis.com/v1/{photoName}/media?maxWidthPx=...&key=...
  const safe = encodeURIComponent(photoName);
  return `${BASE}/${safe}/media?maxWidthPx=${encodeURIComponent(String(maxWidthPx))}&key=${encodeURIComponent(PLACES_API_KEY)}`;
}

export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMeters: number,
  type?: NearbyType,
): Promise<PlaceSummary[]> {
  requireKey();

  const url = `${BASE}/places:searchNearby`;
  const body: any = {
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.max(1, Math.min(50000, radiusMeters)),
      },
    },
    maxResultCount: 10,
  };

  if (type) {
    body.includedTypes = [type];
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: headers(
      [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.googleMapsUri',
        'places.primaryType',
        'places.photos',
        'places.regularOpeningHours',
        'places.priceLevel',
      ].join(','),
    ),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PLACES_NEARBY_FAILED:${res.status}:${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { places?: any[] };
  const list = Array.isArray(data.places) ? data.places : [];
  return list.map(mapPlace).filter((p) => p.id && p.displayName);
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  requireKey();
  const url = `${BASE}/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: headers(
      [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'googleMapsUri',
        'primaryType',
        'photos',
        'regularOpeningHours',
        'priceLevel',
        'websiteUri',
        'internationalPhoneNumber',
      ].join(','),
    ),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PLACE_DETAILS_FAILED:${res.status}:${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return mapPlace(data) as PlaceDetails;
}

export interface AutocompleteSuggestion {
  placeId: string;
  text: string;
  secondaryText?: string;
}

export async function autocompletePlaces(
  input: string,
  opts?: { lat?: number; lng?: number; radiusMeters?: number },
): Promise<AutocompleteSuggestion[]> {
  requireKey();
  const q = input.trim();
  if (q.length < 2) return [];

  const url = `${BASE}/places:autocomplete`;
  const body: any = {
    input: q,
    languageCode: 'ko',
    regionCode: 'KR',
  };

  const lat = opts?.lat;
  const lng = opts?.lng;
  if (lat != null && lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.max(100, Math.min(50000, opts?.radiusMeters ?? 20000)),
      },
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: headers(
      [
        'suggestions.placePrediction.placeId',
        'suggestions.placePrediction.text',
        'suggestions.placePrediction.structuredFormat',
      ].join(','),
    ),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PLACES_AUTOCOMPLETE_FAILED:${res.status}:${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as any;
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
  return suggestions
    .map((s: any) => {
      const p = s?.placePrediction;
      const placeId = typeof p?.placeId === 'string' ? p.placeId : '';
      const text = typeof p?.text?.text === 'string'
        ? p.text.text
        : typeof p?.text === 'string'
          ? p.text
          : '';
      const secondaryText = typeof p?.structuredFormat?.secondaryText?.text === 'string'
        ? p.structuredFormat.secondaryText.text
        : undefined;
      return { placeId, text, secondaryText } as AutocompleteSuggestion;
    })
    .filter((s: AutocompleteSuggestion) => !!s.placeId && !!s.text);
}

