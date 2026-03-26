import {
  UserTier,
  EventCategory,
  EventStatus,
  MissionType,
  MissionStatus,
  RewardType,
  ItemRarity,
  CharacterClass,
  District,
} from './enums';

// ──────────────────────────── Primitives ────────────────────────────

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// ──────────────────────────── Core Models ────────────────────────────

export interface User {
  id: string;
  kakaoId: string;
  nickname: string;
  email: string | null;
  avatarUrl: string | null;
  tier: UserTier;
  premiumExpiresAt: string | null;
  totalXp: number;
  level: number;
  coins: number;
  checkInCount: number;
  missionCompleteCount: number;
  currentStreak: number;
  longestStreak: number;
  homeDistrict: District | null;
  pushToken: string | null;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  characterClass: CharacterClass;
  level: number;
  currentXp: number;
  requiredXp: number;
  stats: {
    exploration: number;
    charm: number;
    stamina: number;
    luck: number;
  };
  appearance: {
    bodyType: number;
    hairStyle: number;
    hairColor: string;
    outfit: string;
    accessory: string | null;
    expression: number;
  };
  equippedBadgeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  narrative: string | null;
  category: EventCategory;
  status: EventStatus;
  location: GeoPoint;
  address: string;
  district: District;
  checkInRadius: number;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  sponsorId: string | null;
  sponsorName: string | null;
  maxParticipants: number | null;
  currentParticipants: number;
  rewards: RewardSummary[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  xpReward: number;
  coinReward: number;
  tags: string[];
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Mission {
  id: string;
  eventId: string;
  title: string;
  description: string;
  type: MissionType;
  status: MissionStatus;
  objectives: MissionObjective[];
  timeLimit: number | null;
  xpReward: number;
  coinReward: number;
  bonusRewards: RewardSummary[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  isDaily: boolean;
  isWeekly: boolean;
  requiredLevel: number;
  createdAt: string;
}

export interface MissionObjective {
  id: string;
  description: string;
  type: 'GPS' | 'PHOTO' | 'QUIZ' | 'TAP' | 'TIMER';
  targetValue: number;
  currentValue: number;
  isCompleted: boolean;
  metadata: Record<string, unknown>;
}

export interface Reward {
  id: string;
  userId: string;
  type: RewardType;
  name: string;
  description: string;
  value: number;
  itemId: string | null;
  badgeId: string | null;
  sourceEventId: string | null;
  sourceMissionId: string | null;
  claimedAt: string;
  expiresAt: string | null;
}

export interface RewardSummary {
  type: RewardType;
  name: string;
  rarity: ItemRarity;
  dropRate: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: 'DISTRICT' | 'MISSION' | 'STREAK' | 'COLLECTION' | 'SPECIAL';
  rarity: ItemRarity;
  requirement: {
    type: string;
    target: number;
    district: District | null;
  };
  xpBonus: number;
  unlockedAt: string | null;
}

export interface CheckIn {
  id: string;
  userId: string;
  eventId: string;
  location: GeoPoint;
  distance: number;
  isValid: boolean;
  missionId: string | null;
  checkedInAt: string;
}

export interface InventoryItem {
  id: string;
  userId: string;
  itemId: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: ItemRarity;
  category: 'CONSUMABLE' | 'EQUIPMENT' | 'COSMETIC' | 'COUPON';
  quantity: number;
  isEquipped: boolean;
  metadata: Record<string, unknown>;
  acquiredAt: string;
  expiresAt: string | null;
}
