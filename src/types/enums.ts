// Const-object + derived-type pattern so each symbol is usable both as a
// *value* (e.g. EventCategory.ACTIVITY) and as a *type*.

export const EventCategory = {
  EXPLORATION: 'exploration',
  PHOTO: 'photo',
  QUIZ: 'quiz',
  PARTNERSHIP: 'partnership',
  ACTIVITY: 'exploration',
  CULTURE: 'culture',
  HIDDEN_GEM: 'hidden_gem',
  FOOD: 'food',
  CAFE: 'cafe',
  NATURE: 'nature',
  NIGHTLIFE: 'nightlife',
  SHOPPING: 'shopping',
} as const;
export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory];

export const EventStatus = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  UPCOMING: 'upcoming',
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const MissionType = {
  GPS_CHECKIN: 'gps_checkin',
  PHOTO: 'photo',
  QUIZ: 'quiz',
  TEXT: 'text',
  TIMER: 'timer',
} as const;
export type MissionType = (typeof MissionType)[keyof typeof MissionType];

export const BadgeCategory = {
  EXPLORATION: 'exploration',
  REGION: 'region',
  SEASON: 'season',
  ACHIEVEMENT: 'achievement',
} as const;
export type BadgeCategory = (typeof BadgeCategory)[keyof typeof BadgeCategory];

export const RarityLevel = {
  COMMON: 'common',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
} as const;
export type RarityLevel = (typeof RarityLevel)[keyof typeof RarityLevel];

export const ItemRarity = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
} as const;
export type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];

export const CharacterClass = {
  EXPLORER: 'explorer',
  FOODIE: 'foodie',
  ARTIST: 'artist',
  SOCIALITE: 'socialite',
} as const;
export type CharacterClass = (typeof CharacterClass)[keyof typeof CharacterClass];

export const RewardType = {
  XP: 'xp',
  BADGE: 'badge',
  ITEM: 'item',
} as const;
export type RewardType = (typeof RewardType)[keyof typeof RewardType];

export const District = {
  SEONGSU: '성수',
  HONGDAE: '홍대',
  GANGNAM: '강남',
  JONGNO: '종로',
  ITAEWON: '이태원',
  YEOUIDO: '여의도',
} as const;
export type District = (typeof District)[keyof typeof District];

export type EvolutionLabel = 'Baby' | 'Teen' | 'Adult' | 'Legendary';

// ── Cosmetic System ──────────────────────────────────────────────────

export const CosmeticSlot = {
  HAT: 'hat',
  OUTFIT: 'outfit',
  ACCESSORY: 'accessory',
  BACKGROUND: 'background',
  AURA: 'aura',
} as const;
export type CosmeticSlot = (typeof CosmeticSlot)[keyof typeof CosmeticSlot];

export const CosmeticEffect = {
  XP_BOOST: 'xp_boost',
  DISCOVERY_RANGE: 'discovery_range',
  STREAK_SHIELD: 'streak_shield',
  COIN_BONUS: 'coin_bonus',
  COSMETIC_ONLY: 'cosmetic_only',
} as const;
export type CosmeticEffect = (typeof CosmeticEffect)[keyof typeof CosmeticEffect];

export const CharacterMood = {
  HAPPY: 'happy',
  EXCITED: 'excited',
  TIRED: 'tired',
  CURIOUS: 'curious',
  PROUD: 'proud',
  ADVENTUROUS: 'adventurous',
} as const;
export type CharacterMood = (typeof CharacterMood)[keyof typeof CharacterMood];

export const UnlockMethod = {
  QUEST: 'quest',
  PURCHASE: 'purchase',
  ACHIEVEMENT: 'achievement',
  SEASON: 'season',
  EVENT: 'event',
  SPECIAL: 'special',
} as const;
export type UnlockMethod = (typeof UnlockMethod)[keyof typeof UnlockMethod];

export const AcquiredVia = {
  QUEST: 'quest',
  PURCHASE: 'purchase',
  ACHIEVEMENT: 'achievement',
  GIFT: 'gift',
  DROP: 'drop',
  SEASON: 'season',
  EVENT: 'event',
} as const;
export type AcquiredVia = (typeof AcquiredVia)[keyof typeof AcquiredVia];

export const TitleCategory = {
  EXPLORATION: 'exploration',
  DISTRICT: 'district',
  SOCIAL: 'social',
  ACHIEVEMENT: 'achievement',
  SEASON: 'season',
} as const;
export type TitleCategory = (typeof TitleCategory)[keyof typeof TitleCategory];
