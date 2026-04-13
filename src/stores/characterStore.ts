import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getMyCharacter,
  createCharacter as apiCreateCharacter,
  getMyLoadout,
  getMyCoins,
  equipCosmetic as apiEquipCosmetic,
  unequipCosmetic as apiUnequipCosmetic,
  purchaseCosmetic as apiPurchaseCosmetic,
  updatePersonality as apiUpdatePersonality,
} from '../lib/api';
import type {
  Character,
  CharacterLoadout,
  PurchaseResult,
  EquipResult,
  PersonalityResult,
  EquippedEffects,
} from '../types';
import type { CosmeticSlot, CharacterMood } from '../types/enums';
import { zustandStorage } from './storage';
import {
  getEvolutionStage,
  getCharacterEmoji,
  type EvolutionStage,
  EVOLUTION_STAGES,
} from '../utils/characterAssets';

export type { EvolutionStage };
export { getEvolutionStage, EVOLUTION_STAGES };

export function getEvolutionEmoji(characterType: string, stage: EvolutionStage): string {
  return getCharacterEmoji(characterType, stage);
}

export function getNextEvolutionLevel(level: number): number | null {
  if (level <= 5) return 6;
  if (level <= 15) return 16;
  if (level <= 30) return 31;
  return null;
}

const LEVEL_TITLES: Record<string, Record<EvolutionStage, string>> = {
  explorer: { baby: '새싹 탐험가', teen: '숲의 탐험가', adult: '숲의 수호자', legendary: '전설의 탐험가' },
  foodie: { baby: '바람의 아이', teen: '바람의 여행자', adult: '바람의 길잡이', legendary: '전설의 모험가' },
  artist: { baby: '빛의 씨앗', teen: '태양의 학생', adult: '태양의 수호자', legendary: '전설의 수호자' },
  socialite: { baby: '별의 조각', teen: '별의 수집가', adult: '별의 항해사', legendary: '전설의 항해사' },
};

export function getLevelTitle(characterType: string, level: number): string {
  const stage = getEvolutionStage(level);
  return LEVEL_TITLES[characterType]?.[stage] ?? '탐험가';
}

export function xpForLevel(level: number): number {
  return level * 500;
}

// ─────────────────────────────────────────────────────────────────────────────
// Equipped effects helper
// ─────────────────────────────────────────────────────────────────────────────

function computeEquippedEffects(loadout: CharacterLoadout[]): EquippedEffects {
  const effects: EquippedEffects = {
    xp_boost: 0,
    discovery_range: 0,
    streak_shield: false,
    coin_bonus: 0,
  };
  for (const item of loadout) {
    const cosmetic = item.cosmetic;
    if (!cosmetic) continue;
    switch (cosmetic.effect_type) {
      case 'xp_boost':
        effects.xp_boost += cosmetic.effect_value;
        break;
      case 'discovery_range':
        effects.discovery_range += cosmetic.effect_value;
        break;
      case 'streak_shield':
        effects.streak_shield = true;
        break;
      case 'coin_bonus':
        effects.coin_bonus += cosmetic.effect_value;
        break;
    }
  }
  return effects;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export interface EvolutionCelebrationPayload {
  prevStage: EvolutionStage;
  nextStage: EvolutionStage;
  characterType: string;
  characterName: string;
  newLevel: number;
  favoriteDistrict: string | null;
}

interface CharacterState {
  character: Character | null;
  isLoading: boolean;
  error: string | null;

  evolutionCelebration: EvolutionCelebrationPayload | null;
  clearEvolutionCelebration: () => void;

  // Cosmetic state
  loadout: CharacterLoadout[];
  equippedEffects: EquippedEffects;
  coins: number;

  // Personality state
  mood: CharacterMood;
  personalityTraits: string[];
  favoriteDistrict: string | null;
  activeTitle: string | null;

  // Core actions
  fetchCharacter: (opts?: { skipEvolutionCelebration?: boolean }) => Promise<void>;
  createNewCharacter: (
    name: '도담' | '나래' | '하람' | '별찌',
    characterType: string,
  ) => Promise<void>;
  clear: () => void;
  /** Local optimistic XP after missions (server is authoritative on next fetch). */
  addXp: (amount: number) => void;

  // Cosmetic actions
  fetchLoadout: () => Promise<void>;
  fetchCoins: () => Promise<void>;
  equipItem: (cosmeticId: string, slot: CosmeticSlot) => Promise<EquipResult>;
  unequipItem: (slot: CosmeticSlot) => Promise<EquipResult>;
  purchaseItem: (cosmeticId: string) => Promise<PurchaseResult>;

  // Personality actions
  refreshPersonality: () => Promise<PersonalityResult | null>;
}

const INITIAL_EFFECTS: EquippedEffects = {
  xp_boost: 0,
  discovery_range: 0,
  streak_shield: false,
  coin_bonus: 0,
};

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      character: null,
      isLoading: false,
      error: null,

      evolutionCelebration: null,
      clearEvolutionCelebration: () => set({ evolutionCelebration: null }),

      // Cosmetic initial state
      loadout: [],
      equippedEffects: INITIAL_EFFECTS,
      coins: 0,

      // Personality initial state
      mood: 'happy' as CharacterMood,
      personalityTraits: [],
      favoriteDistrict: null,
      activeTitle: null,

      // ── Core actions ────────────────────────────────────────────────

      fetchCharacter: async (opts) => {
        try {
          set({ isLoading: true, error: null });
          const previous = get().character;
          const character = await getMyCharacter();
          set({
            character,
            mood: (character?.mood as CharacterMood) ?? 'happy',
            personalityTraits: Array.isArray(character?.personality_traits)
              ? (character.personality_traits as string[])
              : [],
            favoriteDistrict: (character?.favorite_district as string) ?? null,
            activeTitle: (character?.equipped_title as string) ?? null,
          });

          if (
            !opts?.skipEvolutionCelebration &&
            previous &&
            character &&
            previous.id === character.id
          ) {
            const prevStage = getEvolutionStage(previous.level);
            const nextStage = getEvolutionStage(character.level);
            if (prevStage !== nextStage && character.level >= previous.level) {
              set({
                evolutionCelebration: {
                  prevStage,
                  nextStage,
                  characterType: character.character_type,
                  characterName: character.name,
                  newLevel: character.level,
                  favoriteDistrict: character.favorite_district ?? null,
                },
              });
            }
          }
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

      clear: () => set({
        character: null,
        isLoading: false,
        error: null,
        loadout: [],
        equippedEffects: INITIAL_EFFECTS,
        coins: 0,
        mood: 'happy' as CharacterMood,
        personalityTraits: [],
        favoriteDistrict: null,
        activeTitle: null,
      }),

      addXp: (amount: number) => {
        set((state) => {
          if (!state.character) return state;
          return {
            character: {
              ...state.character,
              xp: Math.max(0, state.character.xp + amount),
            },
          };
        });
      },

      // ── Cosmetic actions ────────────────────────────────────────────

      fetchLoadout: async () => {
        try {
          const loadout = await getMyLoadout();
          set({ loadout, equippedEffects: computeEquippedEffects(loadout) });
        } catch {
          // 실패해도 기존 상태 유지
        }
      },

      fetchCoins: async () => {
        try {
          const coins = await getMyCoins();
          set({ coins });
        } catch {
          // 실패해도 기존 상태 유지
        }
      },

      equipItem: async (cosmeticId, slot) => {
        const previousLoadout = get().loadout;
        // 낙관적 업데이트: 슬롯에 해당 아이템 반영
        const optimistic = previousLoadout.filter((l) => l.slot !== slot);
        optimistic.push({
          id: 'temp',
          user_id: '',
          character_id: '',
          slot,
          cosmetic_id: cosmeticId,
          equipped_at: new Date().toISOString(),
        });
        set({ loadout: optimistic, equippedEffects: computeEquippedEffects(optimistic) });

        try {
          const result = await apiEquipCosmetic(cosmeticId, slot);
          if (!result.success) {
            set({ loadout: previousLoadout, equippedEffects: computeEquippedEffects(previousLoadout) });
          } else {
            // 서버 데이터로 갱신
            const freshLoadout = await getMyLoadout();
            set({ loadout: freshLoadout, equippedEffects: computeEquippedEffects(freshLoadout) });
          }
          return result;
        } catch {
          set({ loadout: previousLoadout, equippedEffects: computeEquippedEffects(previousLoadout) });
          return { success: false, error: '장착에 실패했어요.' };
        }
      },

      unequipItem: async (slot) => {
        const previousLoadout = get().loadout;
        const optimistic = previousLoadout.filter((l) => l.slot !== slot);
        set({ loadout: optimistic, equippedEffects: computeEquippedEffects(optimistic) });

        try {
          const result = await apiUnequipCosmetic(slot);
          if (!result.success) {
            set({ loadout: previousLoadout, equippedEffects: computeEquippedEffects(previousLoadout) });
          }
          return result;
        } catch {
          set({ loadout: previousLoadout, equippedEffects: computeEquippedEffects(previousLoadout) });
          return { success: false, error: '해제에 실패했어요.' };
        }
      },

      purchaseItem: async (cosmeticId) => {
        const previousCoins = get().coins;
        try {
          const result = await apiPurchaseCosmetic(cosmeticId);
          if (result.success && result.remaining_coins !== undefined) {
            set({ coins: result.remaining_coins });
          }
          return result;
        } catch {
          set({ coins: previousCoins });
          return { success: false, error: '구매에 실패했어요.' };
        }
      },

      // ── Personality actions ──────────────────────────────────────────

      refreshPersonality: async () => {
        try {
          const result = await apiUpdatePersonality();
          set({
            personalityTraits: result.traits,
            mood: result.mood,
            favoriteDistrict: result.favorite_district,
          });
          return result;
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'wherehere-character',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        character: state.character,
        loadout: state.loadout,
        coins: state.coins,
        mood: state.mood,
        personalityTraits: state.personalityTraits,
        favoriteDistrict: state.favoriteDistrict,
        activeTitle: state.activeTitle,
      }),
    },
  ),
);
