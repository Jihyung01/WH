import { create } from 'zustand';
import type { Event, GeoPoint } from '../types';
import { EventCategory, EventStatus, ItemRarity, RewardType, District } from '../types/enums';
import { eventService } from '../services/eventService';

export interface ActiveQuest {
  event: Event;
  startedAt: string;
  completedSteps: number;
  totalSteps: number;
  timeRemaining: number | null;
  nextStepDistance: number | null;
}

export interface DailySummary {
  completedToday: number;
  dailyGoal: number;
  loginStreak: number;
  dailyRewardCountdown: number;
}

interface QuestState {
  nearbyEvents: Event[];
  activeQuests: ActiveQuest[];
  recommendedEvents: Event[];
  seasonalEvents: Event[];
  dailySummary: DailySummary;
  isLoadingNearby: boolean;
  isLoadingActive: boolean;
  isLoadingRecommended: boolean;
  isLoadingSeasonal: boolean;
  searchQuery: string;
  categoryFilter: EventCategory | null;
  difficultyFilter: number | null;
  distanceFilter: number | null;

  setSearchQuery: (q: string) => void;
  setCategoryFilter: (c: EventCategory | null) => void;
  setDifficultyFilter: (d: number | null) => void;
  setDistanceFilter: (d: number | null) => void;
  resetFilters: () => void;
  fetchNearby: (center: GeoPoint) => Promise<void>;
  fetchActive: () => Promise<void>;
  fetchRecommended: () => Promise<void>;
  fetchSeasonal: () => Promise<void>;
  refreshAll: (center: GeoPoint) => Promise<void>;
}

const MOCK_CENTER: GeoPoint = { latitude: 37.5665, longitude: 126.978 };

function makeEvent(
  idx: number,
  overrides: Partial<Event> & { title: string; description: string; category: EventCategory; difficulty: Event['difficulty']; xpReward: number },
  center: GeoPoint = MOCK_CENTER,
): Event {
  const now = new Date().toISOString();
  const offsets = [
    { lat: 0.0012, lng: 0.0008 }, { lat: -0.0018, lng: 0.0022 },
    { lat: 0.0025, lng: -0.0012 }, { lat: -0.0008, lng: -0.0025 },
    { lat: 0.0004, lng: -0.0018 }, { lat: 0.003, lng: 0.0004 },
    { lat: -0.0028, lng: -0.0009 }, { lat: 0.0016, lng: 0.0032 },
    { lat: -0.001, lng: 0.003 }, { lat: 0.004, lng: -0.0022 },
    { lat: 0.0008, lng: 0.001 }, { lat: -0.002, lng: 0.0015 },
  ];
  const off = offsets[idx % offsets.length];
  return {
    id: `quest-${idx}`,
    title: overrides.title,
    description: overrides.description,
    narrative: null,
    category: overrides.category,
    status: overrides.status ?? EventStatus.ACTIVE,
    location: { latitude: center.latitude + off.lat, longitude: center.longitude + off.lng },
    address: overrides.address ?? '서울시 마포구',
    district: overrides.district ?? District.HONGDAE,
    checkInRadius: 100,
    imageUrl: null,
    thumbnailUrl: null,
    sponsorId: null,
    sponsorName: overrides.sponsorName ?? null,
    maxParticipants: null,
    currentParticipants: Math.floor(Math.random() * 30),
    rewards: overrides.rewards ?? [],
    difficulty: overrides.difficulty,
    xpReward: overrides.xpReward,
    coinReward: overrides.coinReward ?? Math.floor(overrides.xpReward * 0.4),
    tags: overrides.tags ?? [],
    startsAt: now,
    endsAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    createdAt: now,
    updatedAt: now,
  };
}

function generateNearbyMock(center: GeoPoint): Event[] {
  return [
    makeEvent(0, { title: '홍대 벽화 골목 탐험', description: '알려지지 않은 홍대 벽화 골목을 걸어보세요', category: EventCategory.ACTIVITY, difficulty: 2, xpReward: 150 }, center),
    makeEvent(1, { title: '성수동 루프탑 카페 인증', description: '성수동 인기 루프탑 카페에서 인증샷 남기기', category: EventCategory.CAFE, difficulty: 1, xpReward: 100, district: District.SEONGSU }, center),
    makeEvent(2, { title: '경복궁 역사 퀴즈 챌린지', description: '조선 시대 역사를 테스트해보세요', category: EventCategory.CULTURE, difficulty: 3, xpReward: 200, district: District.JONGNO, address: '서울시 종로구' }, center),
    makeEvent(3, { title: '이태원 숨은 맛집 투어', description: '이태원 주민만 아는 맛집 3곳 방문하기', category: EventCategory.FOOD, difficulty: 2, xpReward: 130, district: District.ITAEWON, address: '서울시 용산구' }, center),
    makeEvent(4, { title: '한강 자전거 3km 도전', description: '한강변을 따라 자전거를 타세요', category: EventCategory.NATURE, difficulty: 4, xpReward: 300 }, center),
    makeEvent(5, { title: '신촌 야경 포토 스팟', description: '신촌에서 가장 아름다운 야경을 찍어보세요', category: EventCategory.NIGHTLIFE, difficulty: 2, xpReward: 120, district: District.SHINCHON }, center),
    makeEvent(6, { title: '가로수길 보물찾기', description: '가로수길에 숨겨진 특별 아이템을 찾으세요', category: EventCategory.SHOPPING, difficulty: 1, xpReward: 80, district: District.GANGNAM, address: '서울시 강남구', rewards: [{ type: RewardType.ITEM, name: '한정판 스티커', rarity: ItemRarity.UNCOMMON, dropRate: 1 }] }, center),
    makeEvent(7, { title: '비밀의 옥상 정원', description: '도심 한복판 비밀 정원을 발견하세요', category: EventCategory.HIDDEN_GEM, difficulty: 5, xpReward: 500, rewards: [{ type: RewardType.BADGE, name: '비밀 탐험가', rarity: ItemRarity.LEGENDARY, dropRate: 1 }] }, center),
  ];
}

function generateActiveMock(): ActiveQuest[] {
  const center = MOCK_CENTER;
  return [
    {
      event: makeEvent(10, { title: '연남동 골목 탐험', description: '연남동 감성 골목 5곳 방문하기', category: EventCategory.ACTIVITY, difficulty: 2, xpReward: 180 }, center),
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedSteps: 2,
      totalSteps: 5,
      timeRemaining: null,
      nextStepDistance: 320,
    },
    {
      event: makeEvent(11, { title: '망원 시장 먹방 투어', description: '망원시장에서 3가지 간식을 먹어보세요', category: EventCategory.FOOD, difficulty: 2, xpReward: 160 }, center),
      startedAt: new Date(Date.now() - 7200000).toISOString(),
      completedSteps: 1,
      totalSteps: 3,
      timeRemaining: 1800,
      nextStepDistance: 150,
    },
  ];
}

function generateRecommendedMock(center: GeoPoint): Event[] {
  return [
    makeEvent(20, { title: '을지로 레트로 투어', description: 'AI 추천: 당신의 탐험 스타일에 딱 맞는 코스', category: EventCategory.CULTURE, difficulty: 2, xpReward: 200, tags: ['AI추천', '레트로'] }, center),
    makeEvent(21, { title: '북촌 한옥마을 산책', description: '한옥의 아름다움을 사진에 담아보세요', category: EventCategory.CULTURE, difficulty: 1, xpReward: 120, district: District.JONGNO, tags: ['AI추천', '한옥'] }, center),
    makeEvent(22, { title: '합정 카페 골목 도장깨기', description: '합정역 주변 인기 카페 5곳 방문하기', category: EventCategory.CAFE, difficulty: 2, xpReward: 180, tags: ['AI추천', '카페'] }, center),
  ];
}

function generateSeasonalMock(center: GeoPoint): Event[] {
  return [
    makeEvent(30, {
      title: '🌸 봄맞이 벚꽃 탐험', description: '벚꽃 명소 5곳을 방문하고 인증하세요',
      category: EventCategory.NATURE, difficulty: 3, xpReward: 400, tags: ['시즌', '봄', '벚꽃'],
      rewards: [{ type: RewardType.BADGE, name: '봄의 탐험가', rarity: ItemRarity.EPIC, dropRate: 1 }],
    }, center),
    makeEvent(31, {
      title: '🌸 여의도 벚꽃길 미션', description: '여의도 벚꽃 축제 특별 미션',
      category: EventCategory.ACTIVITY, difficulty: 2, xpReward: 250, district: District.YEOUIDO, address: '서울시 영등포구',
      tags: ['시즌', '봄', '여의도'],
    }, center),
  ];
}

export const useQuestStore = create<QuestState>((set, get) => ({
  nearbyEvents: [],
  activeQuests: [],
  recommendedEvents: [],
  seasonalEvents: [],
  dailySummary: { completedToday: 3, dailyGoal: 5, loginStreak: 7, dailyRewardCountdown: 14400 },
  isLoadingNearby: false,
  isLoadingActive: false,
  isLoadingRecommended: false,
  isLoadingSeasonal: false,
  searchQuery: '',
  categoryFilter: null,
  difficultyFilter: null,
  distanceFilter: null,

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  setDifficultyFilter: (d) => set({ difficultyFilter: d }),
  setDistanceFilter: (d) => set({ distanceFilter: d }),
  resetFilters: () => set({ categoryFilter: null, difficultyFilter: null, distanceFilter: null, searchQuery: '' }),

  fetchNearby: async (center) => {
    set({ isLoadingNearby: true });
    try {
      const events = await eventService.getNearby({ latitude: center.latitude, longitude: center.longitude, radius: 5000 });
      set({ nearbyEvents: events });
    } catch {
      set({ nearbyEvents: generateNearbyMock(center) });
    } finally {
      set({ isLoadingNearby: false });
    }
  },

  fetchActive: async () => {
    set({ isLoadingActive: true });
    try {
      const response = await eventService.getList({ status: 'IN_PROGRESS' });
      const events = 'items' in response ? response.items : [];
      set({ activeQuests: events.map((e) => ({ event: e, startedAt: new Date().toISOString(), completedSteps: 0, totalSteps: 3, timeRemaining: null, nextStepDistance: null })) });
    } catch {
      set({ activeQuests: generateActiveMock() });
    } finally {
      set({ isLoadingActive: false });
    }
  },

  fetchRecommended: async () => {
    set({ isLoadingRecommended: true });
    try {
      const events = await eventService.getTrending();
      set({ recommendedEvents: events });
    } catch {
      set({ recommendedEvents: generateRecommendedMock(get().nearbyEvents[0]?.location ?? MOCK_CENTER) });
    } finally {
      set({ isLoadingRecommended: false });
    }
  },

  fetchSeasonal: async () => {
    set({ isLoadingSeasonal: true });
    try {
      const events = await eventService.getTrending();
      set({ seasonalEvents: events });
    } catch {
      set({ seasonalEvents: generateSeasonalMock(get().nearbyEvents[0]?.location ?? MOCK_CENTER) });
    } finally {
      set({ isLoadingSeasonal: false });
    }
  },

  refreshAll: async (center) => {
    await Promise.all([
      get().fetchNearby(center),
      get().fetchActive(),
      get().fetchRecommended(),
      get().fetchSeasonal(),
    ]);
  },
}));
