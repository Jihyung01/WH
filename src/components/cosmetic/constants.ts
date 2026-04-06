import { RARITY } from '../../config/theme';
import type { CosmeticSlot } from '../../types/enums';

export const RARITY_COLORS: Record<string, string> = {
  common: RARITY.common,
  rare: RARITY.rare,
  epic: RARITY.epic,
  legendary: RARITY.legendary,
};

export const RARITY_LABELS: Record<string, string> = {
  common: '일반',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
};

export const SLOT_CONFIG: { key: CosmeticSlot; emoji: string; label: string }[] = [
  { key: 'hat', emoji: '🎩', label: '모자' },
  { key: 'outfit', emoji: '👕', label: '의상' },
  { key: 'accessory', emoji: '🧭', label: '악세' },
  { key: 'background', emoji: '🖼️', label: '배경' },
  { key: 'aura', emoji: '✨', label: '오라' },
];

export const UNLOCK_METHOD_LABELS: Record<string, string> = {
  quest: '퀘스트로 획득',
  purchase: '코인으로 구매',
  achievement: '업적 달성',
  season: '시즌 보상',
  event: '이벤트 보상',
  special: '특별 보상',
};

export const MOOD_DISPLAY: Record<string, { emoji: string; label: string }> = {
  happy: { emoji: '😊', label: '행복한' },
  excited: { emoji: '🤩', label: '신나는' },
  tired: { emoji: '😴', label: '피곤한' },
  curious: { emoji: '🧐', label: '호기심 가득' },
  proud: { emoji: '😤', label: '뿌듯한' },
  adventurous: { emoji: '🤠', label: '모험적인' },
};
