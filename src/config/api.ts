export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? 'https://wherehere-api.railway.app',
  API_VERSION: '/api/v1',
  TIMEOUT: 15000, // 15 seconds
} as const;

export const getApiUrl = (path: string) =>
  `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${path}`;
