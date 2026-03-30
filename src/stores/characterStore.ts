import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getMyCharacter, createCharacter as apiCreateCharacter } from '../lib/api';
import type { Character } from '../types';
import { zustandStorage } from './storage';

// ─────────────────────────────────────────────────────────────────────────────
// Evolution helpers
// ─────────────────────────────────────────────────────────────────────────────

export type EvolutionStage = 'baby' | 'teen' | 'adult' | 'legendary';

export function getEvolutionStage(level: number): EvolutionStage {
  if (level <= 5) return 'baby';
  if (level <= 15) return 'teen';
  if (level <= 30) return 'adult';
  return 'legendary';
}

const EVOLUTION_MAP: Record<string, Record<EvolutionStage, string>> = {
  pathfinder: { baby: '🌱', teen: '🌿', adult: '🌳', legendary: '🏔️' },
  observer: { baby: '🍃', teen: '💨', adult: '🌊', legendary: '🌪️' },
  scholar: { baby: '🌤️', teen: '☀️', adult: '🔥', legendary: '💎' },
  connector: { baby: '✨', teen: '⭐', adult: '🌟', legendary: '💫' },
};

export function getEvolutionEmoji(characterType: string, stage: EvolutionStage): string {
  return EVOLUTION_MAP[characterType]?.[stage] ?? '🧑‍🚀';
}

export function getNextEvolutionLevel(level: number): number | null {
  if (level <= 5) return 6;
  if (level <= 15) return 16;
  if (level <= 30) return 31;
  return null;
}

const LEVEL_TITLES: Record<string, Record<EvolutionStage, string>> = {
  pathfinder: { baby: '새싹 탐험가', teen: '숲의 탐험가', adult: '숲의 수호자', legendary: '전설의 탐험가' },
  observer: { baby: '바람의 아이', teen: '바람의 여행자', adult: '바람의 길잡이', legendary: '전설의 모험가' },
  scholar: { baby: '빛의 씨앗', teen: '태양의 학생', adult: '태양의 수호자', legendary: '전설의 수호자' },
  connector: { baby: '별의 조각', teen: '별의 수집가', adult: '별의 항해사', legendary: '전설의 항해사' },
};

export function getLevelTitle(characterType: string, level: number): string {
  const stage = getEvolutionStage(level);
  return LEVEL_TITLES[characterType]?.[stage] ?? '탐험가';
}

export function xpForLevel(level: number): number {
  return level * 500;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

interface CharacterState {
  character: Character | null;
  isLoading: boolean;
  error: string | null;

  fetchCharacter: () => Promise<void>;
  createNewCharacter: (
    name: '도담' | '나래' | '하람' | '별찌',
    characterType: string,
  ) => Promise<void>;
  clear: () => void;
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set) => ({
      character: null,
      isLoading: false,
      error: null,

      fetchCharacter: async () => {
        try {
          set({ isLoading: true, error: null });
          const character = await getMyCharacter();
          set({ character });
        } catch (err) {
          const message = err instanceof Error ? err.message : '캐릭터 정보를 불러오지 못했습니다.';
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      createNewCharacter: async (name, characterType) => {
        try {
          set({ isLoading: true, error: null });
          const character = await apiCreateCharacter(name, characterType);
          set({ character });
        } catch (err) {
          const message = err instanceof Error ? err.message : '캐릭터 생성에 실패했습니다.';
          set({ error: message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      clear: () => set({ character: null, isLoading: false, error: null }),
    }),
    {
      name: 'wherehere-character',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        character: state.character,
      }),
    },
  ),
);
