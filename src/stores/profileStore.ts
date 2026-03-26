import { create } from 'zustand';
import type { GeoPoint } from '../types';
import { District } from '../types/enums';

export interface UserStats {
  totalEvents: number;
  totalDistanceKm: number;
  totalBadges: number;
  explorationDays: number;
  totalSteps: number;
  totalPhotos: number;
  quizzesCorrect: number;
  longestStreak: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  target: number;
}

export interface FriendEntry {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  level: number;
  lastDistrict: string;
  lastActiveAt: string;
  recentActivity: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  level: number;
  weeklyXp: number;
  isMe: boolean;
}

export interface VisitedLocation {
  id: string;
  location: GeoPoint;
  visitedAt: string;
  eventTitle: string;
}

interface ProfileState {
  stats: UserStats;
  achievements: Achievement[];
  friends: FriendEntry[];
  leaderboard: LeaderboardEntry[];
  leaderboardScope: 'weekly' | 'district';
  leaderboardDistrict: District | null;
  visitedLocations: VisitedLocation[];
  myRank: number | null;
  isLoadingStats: boolean;
  isLoadingFriends: boolean;
  isLoadingLeaderboard: boolean;

  fetchStats: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
  fetchFriends: () => Promise<void>;
  fetchLeaderboard: (scope: 'weekly' | 'district', district?: District) => Promise<void>;
  fetchVisitedLocations: () => Promise<void>;
  initializeMockData: () => void;
}

function mockStats(): UserStats {
  return {
    totalEvents: 47,
    totalDistanceKm: 128.3,
    totalBadges: 23,
    explorationDays: 34,
    totalSteps: 189420,
    totalPhotos: 67,
    quizzesCorrect: 31,
    longestStreak: 12,
  };
}

function mockAchievements(): Achievement[] {
  return [
    { id: 'a1', name: '첫 탐험', description: '첫 번째 이벤트 완료', emoji: '🎯', isUnlocked: true, unlockedAt: '2026-01-15T10:00:00Z', progress: 1, target: 1 },
    { id: 'a2', name: '동네 전문가', description: '한 지역에서 10개 이벤트 완료', emoji: '🏘️', isUnlocked: true, unlockedAt: '2026-02-20T14:00:00Z', progress: 10, target: 10 },
    { id: 'a3', name: '만보기', description: '하루에 10,000보 걷기', emoji: '🚶', isUnlocked: true, unlockedAt: '2026-02-28T18:00:00Z', progress: 10000, target: 10000 },
    { id: 'a4', name: '초기 탐험가', description: '베타 기간 중 가입', emoji: '⭐', isUnlocked: true, unlockedAt: '2026-01-10T09:00:00Z', progress: 1, target: 1 },
    { id: 'a5', name: '7일 연속', description: '7일 연속 로그인', emoji: '🔥', isUnlocked: true, unlockedAt: '2026-03-05T08:00:00Z', progress: 7, target: 7 },
    { id: 'a6', name: '사진 마스터', description: '사진 미션 50개 완료', emoji: '📸', isUnlocked: false, unlockedAt: null, progress: 34, target: 50 },
    { id: 'a7', name: '퀴즈왕', description: '퀴즈 100문제 정답', emoji: '🧠', isUnlocked: false, unlockedAt: null, progress: 31, target: 100 },
    { id: 'a8', name: '서울 정복자', description: '서울 전 지역 탐험', emoji: '👑', isUnlocked: false, unlockedAt: null, progress: 4, target: 7 },
  ];
}

function mockFriends(): FriendEntry[] {
  return [
    { id: 'f1', nickname: '하늘별', avatarUrl: null, level: 12, lastDistrict: '성수동', lastActiveAt: new Date(Date.now() - 1800000).toISOString(), recentActivity: '성수동 카페 인증샷 완료' },
    { id: 'f2', nickname: '도시탐험러', avatarUrl: null, level: 9, lastDistrict: '홍대', lastActiveAt: new Date(Date.now() - 7200000).toISOString(), recentActivity: '홍대 벽화 거리 탐험 중' },
    { id: 'f3', nickname: '맛집요정', avatarUrl: null, level: 15, lastDistrict: '이태원', lastActiveAt: new Date(Date.now() - 14400000).toISOString(), recentActivity: '이태원 맛집 투어 완료' },
    { id: 'f4', nickname: '걷기왕', avatarUrl: null, level: 6, lastDistrict: '여의도', lastActiveAt: new Date(Date.now() - 86400000).toISOString(), recentActivity: null },
    { id: 'f5', nickname: '퀴즈마스터', avatarUrl: null, level: 11, lastDistrict: '종로', lastActiveAt: new Date(Date.now() - 3600000).toISOString(), recentActivity: '경복궁 퀴즈 챌린지 완료' },
  ];
}

function mockLeaderboard(): LeaderboardEntry[] {
  const names = ['맵러버', '하늘별', '도시탐험러', '맛집요정', '탐험가', '걷기왕', '퀴즈마스터', '별빛여행', '서울왕', '카페왕', '숲의요정', '바람나그네', '별찌러버', '나래팬', '모험왕자', '길찾기왕', '빛의전사', '달빛탐험', '하람덕후', '전설탐험'];
  return names.map((name, i) => ({
    rank: i + 1,
    userId: `user-${i}`,
    nickname: name,
    avatarUrl: null,
    level: Math.max(1, 20 - i + Math.floor(Math.random() * 3)),
    weeklyXp: Math.max(100, 5000 - i * 220 + Math.floor(Math.random() * 100)),
    isMe: i === 4,
  }));
}

function mockVisitedLocations(): VisitedLocation[] {
  const base = { latitude: 37.5665, longitude: 126.978 };
  return Array.from({ length: 23 }, (_, i) => ({
    id: `vl-${i}`,
    location: {
      latitude: base.latitude + (Math.random() - 0.5) * 0.06,
      longitude: base.longitude + (Math.random() - 0.5) * 0.08,
    },
    visitedAt: new Date(Date.now() - i * 86400000 * 1.5).toISOString(),
    eventTitle: `탐험 ${i + 1}`,
  }));
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  stats: mockStats(),
  achievements: [],
  friends: [],
  leaderboard: [],
  leaderboardScope: 'weekly',
  leaderboardDistrict: null,
  visitedLocations: [],
  myRank: null,
  isLoadingStats: false,
  isLoadingFriends: false,
  isLoadingLeaderboard: false,

  fetchStats: async () => {
    set({ isLoadingStats: true });
    try {
      // const { data } = await api.get('/users/me/stats');
      // set({ stats: data.data });
      set({ stats: mockStats() });
    } catch {
      set({ stats: mockStats() });
    } finally {
      set({ isLoadingStats: false });
    }
  },

  fetchAchievements: async () => {
    try {
      set({ achievements: mockAchievements() });
    } catch {
      set({ achievements: mockAchievements() });
    }
  },

  fetchFriends: async () => {
    set({ isLoadingFriends: true });
    try {
      set({ friends: mockFriends() });
    } catch {
      set({ friends: mockFriends() });
    } finally {
      set({ isLoadingFriends: false });
    }
  },

  fetchLeaderboard: async (scope, district) => {
    set({ isLoadingLeaderboard: true, leaderboardScope: scope, leaderboardDistrict: district ?? null });
    try {
      const lb = mockLeaderboard();
      const me = lb.find((e) => e.isMe);
      set({ leaderboard: lb, myRank: me?.rank ?? null });
    } catch {
      set({ leaderboard: mockLeaderboard(), myRank: 5 });
    } finally {
      set({ isLoadingLeaderboard: false });
    }
  },

  fetchVisitedLocations: async () => {
    try {
      set({ visitedLocations: mockVisitedLocations() });
    } catch {
      set({ visitedLocations: mockVisitedLocations() });
    }
  },

  initializeMockData: () => {
    const { achievements } = get();
    if (achievements.length > 0) return;
    set({
      stats: mockStats(),
      achievements: mockAchievements(),
      friends: mockFriends(),
      leaderboard: mockLeaderboard(),
      visitedLocations: mockVisitedLocations(),
      myRank: 5,
    });
  },
}));
