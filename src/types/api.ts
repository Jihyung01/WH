// API Response wrapper types

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface NearbyEventsRequest {
  latitude: number;
  longitude: number;
  radius?: number; // meters, default 5000
  category?: string;
  status?: string;
}

export interface CheckInRequest {
  eventId: string;
  latitude: number;
  longitude: number;
}

export interface CreateCharacterRequest {
  name: string;
  characterClass: string;
  appearance: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  statusCode: number;
}
