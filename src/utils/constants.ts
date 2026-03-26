// App-wide constants

export const APP_NAME = 'WhereHere';

// Check-in
export const CHECK_IN_RADIUS_METERS = 100;
export const DEFAULT_SEARCH_RADIUS_METERS = 5000;

// Character
export const MAX_LEVEL = 100;
export const BASE_XP_REQUIRED = 100;
export const XP_GROWTH_FACTOR = 1.5;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Timer
export const LOCATION_UPDATE_INTERVAL_MS = 3000;
export const LOCATION_UPDATE_DISTANCE_M = 5;
export const MAP_REFETCH_DISTANCE_M = 200;

// Subscription
export const PREMIUM_PRICE_KRW = 4900;

// Limits
export const MAX_SHOWCASE_BADGES = 3;
export const MAX_NICKNAME_LENGTH = 12;
export const MIN_NICKNAME_LENGTH = 2;

// API stale times (ms)
export const STALE_TIME = {
  USER: 5 * 60 * 1000,       // 5 minutes
  EVENTS: 30 * 1000,          // 30 seconds
  EVENT_DETAIL: 2 * 60 * 1000, // 2 minutes
  MISSIONS: 60 * 1000,        // 1 minute
  BADGES: 10 * 60 * 1000,     // 10 minutes
  LEADERBOARD: 5 * 60 * 1000, // 5 minutes
} as const;
