import { create } from 'zustand';
import type { Event, GeoPoint } from '../types';
import { EventCategory, EventStatus, ItemRarity, RewardType, District } from '../types/enums';
import type { Region } from 'react-native-maps';
import { eventService } from '../services/eventService';

interface MapState {
  region: Region | null;
  selectedEventId: string | null;
  visibleEvents: Event[];
  isFollowingUser: boolean;
  isFetchingEvents: boolean;
  lastFetchCenter: GeoPoint | null;
  activeFilters: {
    categories: string[];
    difficulty: number | null;
    maxDistance: number | null;
  };

  setRegion: (region: Region) => void;
  selectEvent: (eventId: string | null) => void;
  setVisibleEvents: (events: Event[]) => void;
  setFollowingUser: (following: boolean) => void;
  setFilters: (filters: Partial<MapState['activeFilters']>) => void;
  resetFilters: () => void;
  fetchNearbyEvents: (center: GeoPoint, radiusKm?: number) => Promise<void>;
}

const defaultFilters = {
  categories: [],
  difficulty: null,
  maxDistance: null,
};

function generateMockEvents(center: GeoPoint): Event[] {
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 86400000 * 7).toISOString();

  const offsets = [
    { lat: 0.001, lng: 0.001 },
    { lat: -0.0015, lng: 0.002 },
    { lat: 0.002, lng: -0.001 },
    { lat: -0.001, lng: -0.002 },
    { lat: 0.0005, lng: -0.0015 },
    { lat: 0.003, lng: 0.0005 },
    { lat: -0.0025, lng: -0.001 },
    { lat: 0.0018, lng: 0.003 },
    { lat: -0.0008, lng: 0.0025 },
    { lat: 0.0035, lng: -0.002 },
  ];

  const mockData: Array<{
    title: string;
    desc: string;
    cat: EventCategory;
    diff: 1 | 2 | 3 | 4 | 5;
    xp: number;
    coins: number;
  }> = [
    { title: '홍대 벽화 거리 탐험', desc: '홍대의 숨겨진 벽화를 찾아보세요', cat: EventCategory.ACTIVITY, diff: 2, xp: 150, coins: 50 },
    { title: '성수동 카페 인증샷', desc: '성수동 인기 카페에서 인증샷을 남기세요', cat: EventCategory.CAFE, diff: 1, xp: 100, coins: 30 },
    { title: '경복궁 역사 퀴즈', desc: '경복궁에 대한 퀴즈를 풀어보세요', cat: EventCategory.CULTURE, diff: 3, xp: 200, coins: 80 },
    { title: '이태원 맛집 투어', desc: '이태원 숨은 맛집을 발견하세요', cat: EventCategory.FOOD, diff: 2, xp: 120, coins: 40 },
    { title: '한강 자전거 도전', desc: '한강 자전거길 3km 주행 미션', cat: EventCategory.NATURE, diff: 4, xp: 300, coins: 100 },
    { title: '신촌 야경 포인트', desc: '신촌의 아름다운 야경 스팟을 방문하세요', cat: EventCategory.NIGHTLIFE, diff: 2, xp: 130, coins: 45 },
    { title: '가로수길 쇼핑 미션', desc: '가로수길에서 특별 아이템을 찾아보세요', cat: EventCategory.SHOPPING, diff: 1, xp: 80, coins: 25 },
    { title: '비밀의 정원 발견', desc: '도심 속 숨겨진 정원을 찾아보세요', cat: EventCategory.HIDDEN_GEM, diff: 5, xp: 500, coins: 200 },
    { title: '연남동 골목 탐험', desc: '연남동의 감성 골목을 걸어보세요', cat: EventCategory.ACTIVITY, diff: 1, xp: 90, coins: 30 },
    { title: '망원 시장 먹방 투어', desc: '망원시장에서 3가지 간식을 먹어보세요', cat: EventCategory.FOOD, diff: 2, xp: 160, coins: 60 },
  ];

  return mockData.map((m, i) => ({
    id: `mock-event-${i}`,
    title: m.title,
    description: m.desc,
    narrative: null,
    category: m.cat,
    status: i === 7 ? EventStatus.EXPIRED : EventStatus.ACTIVE,
    location: {
      latitude: center.latitude + offsets[i].lat,
      longitude: center.longitude + offsets[i].lng,
    },
    address: '서울시',
    district: District.HONGDAE,
    checkInRadius: 100,
    imageUrl: null,
    thumbnailUrl: null,
    sponsorId: null,
    sponsorName: null,
    maxParticipants: null,
    currentParticipants: Math.floor(Math.random() * 20),
    rewards: i % 3 === 0 ? [{ type: RewardType.ITEM, name: '특별 아이템', rarity: ItemRarity.RARE, dropRate: 0.5 }] : [],
    difficulty: m.diff,
    xpReward: m.xp,
    coinReward: m.coins,
    tags: [],
    startsAt: now,
    endsAt: later,
    createdAt: now,
    updatedAt: now,
  }));
}

export const useMapStore = create<MapState>((set, get) => ({
  region: null,
  selectedEventId: null,
  visibleEvents: [],
  isFollowingUser: true,
  isFetchingEvents: false,
  lastFetchCenter: null,
  activeFilters: { ...defaultFilters },

  setRegion: (region) => set({ region }),
  selectEvent: (eventId) => set({ selectedEventId: eventId }),
  setVisibleEvents: (events) => set({ visibleEvents: events }),
  setFollowingUser: (following) => set({ isFollowingUser: following }),
  setFilters: (filters) =>
    set((state) => ({
      activeFilters: { ...state.activeFilters, ...filters },
    })),
  resetFilters: () => set({ activeFilters: { ...defaultFilters } }),

  fetchNearbyEvents: async (center, radiusKm = 2) => {
    if (get().isFetchingEvents) return;
    set({ isFetchingEvents: true });

    try {
      const events = await eventService.getNearby({
        latitude: center.latitude,
        longitude: center.longitude,
        radius: radiusKm * 1000,
      });
      set({ visibleEvents: events, lastFetchCenter: center });
    } catch {
      if (get().visibleEvents.length === 0) {
        set({ visibleEvents: generateMockEvents(center), lastFetchCenter: center });
      }
    } finally {
      set({ isFetchingEvents: false });
    }
  },
}));
