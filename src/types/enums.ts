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
