import type { ColorMode } from '../../config/theme';

export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4b6878' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64779e' }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4b6878' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#334e87' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#152238' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#1a2d4d' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6f9ba5' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1d2c4d' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#172a3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3C7680' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#304a7d' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#98a5be' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1d2c4d' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2c6675' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#255763' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0d5ce' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#023e58' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#98a5be' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1d2c4d' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry.fill',
    stylers: [{ color: '#283d6a' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#2a3f6f' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1626' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4e6d70' }],
  },
];

export const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#eeeeee' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#d4edda' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4caf50' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#dadada' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#e5e5e5' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#eeeeee' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9e2f3' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
];

/**
 * Manga 톤 paper map style (Phase 2).
 *
 * 디자인 원칙: 종이 (#FFF5DC ~ #FFFEF5) 베이스 + 도로는 따뜻한 모래색 + 공원/물은
 * 옅은 자연색 + 라벨은 잉크색. POI 의 기본 아이콘은 거의 다 숨겨서 (visibility off
 * 또는 투명도 down) 우리 manga 마커에 시선을 몰아준다.
 */
export const MANGA_MAP_STYLE = [
  // base
  { elementType: 'geometry', stylers: [{ color: '#FFF5DC' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5C4525' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFEF5' }] },

  // administrative
  {
    featureType: 'administrative',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5C4525' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },

  // POI: 모든 카테고리 명시적 숨김. WhereHere 의 manga 마커에 시선 집중.
  // (공원만 살림.)
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#C8DEAE' }, { visibility: 'on' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5C7A3C' }],
  },
  // transit station 도 큰 핀 그림 → 숨김
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },

  // 도로 — 모래색 grade
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFEF5' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E5D9B0' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#FFFEF5' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5C4525' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#FFE8A8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D9A93B' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5C4525' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8B7355' }],
  },

  // transit
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#E5D9B0' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#F0E5C0' }],
  },
  {
    featureType: 'transit.station.rail',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5C4525' }],
  },

  // 물
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#A8D5DE' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3F6873' }],
  },

  // landscape
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#FFF5DC' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#FFEFD0' }],
  },
];

/** Manga 모드는 기본 mode 와 별개로 활성화. UI 가 explicit 으로 요청해야 적용. */
export type MapStyleVariant = 'dark' | 'light' | 'manga';

export function getMapStyle(mode: ColorMode | MapStyleVariant) {
  if (mode === 'manga') return MANGA_MAP_STYLE;
  if (mode === 'dark') return DARK_MAP_STYLE;
  return LIGHT_MAP_STYLE;
}
