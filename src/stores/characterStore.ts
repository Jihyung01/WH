import { create } from 'zustand';
import type { Character } from '../types';
import { CharacterClass } from '../types/enums';

export interface GrowthStats {
  exploration: number;
  discovery: number;
  knowledge: number;
  connection: number;
  creativity: number;
}

export interface XpGainEntry {
  id: string;
  amount: number;
  source: string;
  timestamp: string;
}

export interface WeekActivity {
  date: string;
  count: number;
}

export type EvolutionStage = 'baby' | 'teen' | 'adult' | 'legendary';

export function getEvolutionStage(level: number): EvolutionStage {
  if (level <= 5) return 'baby';
  if (level <= 15) return 'teen';
  if (level <= 30) return 'adult';
  return 'legendary';
}

export function getEvolutionEmoji(charClass: CharacterClass, stage: EvolutionStage): string {
  const map: Record<CharacterClass, Record<EvolutionStage, string>> = {
    [CharacterClass.EXPLORER]: { baby: '🌱', teen: '🌿', adult: '🌳', legendary: '🏔️' },
    [CharacterClass.FOODIE]:   { baby: '🍃', teen: '💨', adult: '🌊', legendary: '🌪️' },
    [CharacterClass.ARTIST]:   { baby: '🌤️', teen: '☀️', adult: '🔥', legendary: '💎' },
    [CharacterClass.SOCIALITE]: { baby: '✨', teen: '⭐', adult: '🌟', legendary: '💫' },
  };
  return map[charClass]?.[stage] ?? '🧑‍🚀';
}

export function getNextEvolutionLevel(level: number): number | null {
  if (level <= 5) return 6;
  if (level <= 15) return 16;
  if (level <= 30) return 31;
  return null;
}

export function getLevelTitle(charClass: CharacterClass, level: number): string {
  const stage = getEvolutionStage(level);
  const titles: Record<CharacterClass, Record<EvolutionStage, string>> = {
    [CharacterClass.EXPLORER]: { baby: '새싹 탐험가', teen: '숲의 탐험가', adult: '숲의 수호자', legendary: '전설의 탐험가' },
    [CharacterClass.FOODIE]:   { baby: '바람의 아이', teen: '바람의 여행자', adult: '바람의 길잡이', legendary: '전설의 모험가' },
    [CharacterClass.ARTIST]:   { baby: '빛의 씨앗', teen: '태양의 학생', adult: '태양의 수호자', legendary: '전설의 수호자' },
    [CharacterClass.SOCIALITE]: { baby: '별의 조각', teen: '별의 수집가', adult: '별의 항해사', legendary: '전설의 항해사' },
  };
  return titles[charClass]?.[stage] ?? '탐험가';
}

function xpForLevel(level: number): number {
  return level * 500;
}

interface CharacterState {
  character: Character | null;
  growthStats: GrowthStats;
  recentXpGains: XpGainEntry[];
  weekActivity: WeekActivity[];
  isLoading: boolean;
  levelUpPending: boolean;

  setCharacter: (character: Character) => void;
  addXp: (xp: number, source?: string) => void;
  addStat: (stat: keyof GrowthStats, amount?: number) => void;
  setLoading: (loading: boolean) => void;
  clearLevelUp: () => void;
  initializeMockCharacter: () => void;
  clear: () => void;
}

function generateWeekActivity(): WeekActivity[] {
  const activities: WeekActivity[] = [];
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    activities.push({
      date: d.toISOString().split('T')[0],
      count: Math.random() > 0.4 ? Math.floor(Math.random() * 5) + 1 : 0,
    });
  }
  return activities;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  character: null,
  growthStats: { exploration: 12, discovery: 8, knowledge: 5, connection: 3, creativity: 7 },
  recentXpGains: [],
  weekActivity: generateWeekActivity(),
  isLoading: false,
  levelUpPending: false,

  setCharacter: (character) => set({ character }),

  addXp: (xp, source) => {
    set((state) => {
      if (!state.character) return state;

      const newEntry: XpGainEntry = {
        id: Date.now().toString(),
        amount: xp,
        source: source ?? '활동',
        timestamp: new Date().toISOString(),
      };

      let { currentXp, level, requiredXp } = state.character;
      currentXp += xp;
      let leveledUp = false;

      while (currentXp >= requiredXp) {
        currentXp -= requiredXp;
        level += 1;
        requiredXp = xpForLevel(level);
        leveledUp = true;
      }

      return {
        character: { ...state.character, currentXp, level, requiredXp },
        recentXpGains: [newEntry, ...state.recentXpGains].slice(0, 20),
        levelUpPending: leveledUp,
      };
    });
  },

  addStat: (stat, amount = 1) => {
    set((state) => ({
      growthStats: { ...state.growthStats, [stat]: state.growthStats[stat] + amount },
    }));
  },

  setLoading: (loading) => set({ isLoading: loading }),
  clearLevelUp: () => set({ levelUpPending: false }),

  initializeMockCharacter: () => {
    const existing = get().character;
    if (existing) return;

    set({
      character: {
        id: 'mock-char-1',
        userId: 'mock-user-1',
        name: '탐험가',
        characterClass: CharacterClass.EXPLORER,
        level: 7,
        currentXp: 1240,
        requiredXp: xpForLevel(7),
        stats: { exploration: 12, charm: 5, stamina: 8, luck: 3 },
        appearance: {
          bodyType: 1, hairStyle: 1, hairColor: '#00D68F',
          outfit: 'default', accessory: null, expression: 1,
        },
        equippedBadgeIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      recentXpGains: [
        { id: '1', amount: 150, source: '성수동 골목 탐험가 완료', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: '2', amount: 100, source: '홍대 벽화 거리 인증', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', amount: 50, source: '카페 사진 미션', timestamp: new Date(Date.now() - 172800000).toISOString() },
        { id: '4', amount: 30, source: '경복궁 퀴즈 정답', timestamp: new Date(Date.now() - 259200000).toISOString() },
      ],
    });
  },

  clear: () => set({
    character: null,
    growthStats: { exploration: 0, discovery: 0, knowledge: 0, connection: 0, creativity: 0 },
    recentXpGains: [],
    levelUpPending: false,
  }),
}));
