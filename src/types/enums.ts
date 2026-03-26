// ──────────────────────────── Enums ────────────────────────────

export enum UserTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
}

export enum EventCategory {
  FOOD = 'FOOD',
  CAFE = 'CAFE',
  CULTURE = 'CULTURE',
  ACTIVITY = 'ACTIVITY',
  NATURE = 'NATURE',
  NIGHTLIFE = 'NIGHTLIFE',
  SHOPPING = 'SHOPPING',
  HIDDEN_GEM = 'HIDDEN_GEM',
}

export enum EventStatus {
  ACTIVE = 'ACTIVE',
  UPCOMING = 'UPCOMING',
  EXPIRED = 'EXPIRED',
  FULL = 'FULL',
}

export enum MissionType {
  VISIT = 'VISIT',
  PHOTO = 'PHOTO',
  QUIZ = 'QUIZ',
  COLLECT = 'COLLECT',
  SOCIAL = 'SOCIAL',
  REVIEW = 'REVIEW',
  CHAIN = 'CHAIN',
}

export enum MissionStatus {
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum RewardType {
  XP = 'XP',
  COIN = 'COIN',
  ITEM = 'ITEM',
  BADGE = 'BADGE',
  CHARACTER_PART = 'CHARACTER_PART',
  COUPON = 'COUPON',
}

export enum ItemRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export enum CharacterClass {
  EXPLORER = 'EXPLORER',
  FOODIE = 'FOODIE',
  ARTIST = 'ARTIST',
  SOCIALITE = 'SOCIALITE',
}

export enum District {
  HONGDAE = 'HONGDAE',
  SEONGSU = 'SEONGSU',
  GANGNAM = 'GANGNAM',
  ITAEWON = 'ITAEWON',
  JONGNO = 'JONGNO',
  SHINCHON = 'SHINCHON',
  YEOUIDO = 'YEOUIDO',
}
