export interface NearbyEventsRequest {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  category?: string;
}

export interface CheckInRequest {
  eventId: string;
  latitude: number;
  longitude: number;
}

export interface CreateCharacterRequest {
  name: '도담' | '나래' | '하람' | '별찌';
  characterType: string;
}

export interface CompleteMissionRequest {
  missionId: string;
  eventId: string;
  answer?: string;
  proofUrl?: string;
}
