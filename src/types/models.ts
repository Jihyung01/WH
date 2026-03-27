import type {
  EventCategory,
  MissionType,
  BadgeCategory,
  RarityLevel,
} from './enums';

// ──────────────────────────── Primitives ────────────────────────────

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// ──────────────────────────── DB Row Types ────────────────────────────

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  total_xp: number;
  level: number;
  login_streak: number;
  push_token: string | null;
}

export interface Character {
  id: string;
  user_id: string;
  name: '도담' | '나래' | '하람' | '별찌';
  character_type: string;
  level: number;
  xp: number;
  evolution_stage: number;
  stat_exploration: number;
  stat_discovery: number;
  stat_knowledge: number;
  stat_connection: number;
  stat_creativity: number;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  narrative: string | null;
  location: unknown; // PostGIS geography — use lat/lng from RPC instead
  address: string | null;
  district: string | null;
  category: EventCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  time_limit_minutes: number | null;
  reward_xp: number;
  creator_type: string;
  partner_name: string | null;
  is_active: boolean;
  is_seasonal: boolean;
  season_id: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface NearbyEvent extends Event {
  distance_meters: number;
  lat: number;
  lng: number;
}

export interface Mission {
  id: string;
  event_id: string;
  step_order: number;
  mission_type: MissionType;
  title: string;
  description: string | null;
  config: Record<string, unknown>;
  required: boolean;
  created_at: string;
}

export interface MissionWithStatus extends Mission {
  is_completed: boolean;
}

export interface CheckIn {
  id: string;
  user_id: string;
  event_id: string;
  location: unknown;
  verified: boolean;
  created_at: string;
}

export interface MissionCompletion {
  id: string;
  user_id: string;
  mission_id: string;
  event_id: string;
  proof_url: string | null;
  answer: string | null;
  completed_at: string;
}

export interface EventCompletion {
  id: string;
  user_id: string;
  event_id: string;
  rewards_earned: Record<string, unknown>;
  xp_earned: number;
  completed_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  category: BadgeCategory;
  rarity: RarityLevel;
  requirement_type: string;
  requirement_value: Record<string, unknown>;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  event_id: string | null;
  badges?: Badge; // joined
}

export interface InventoryItem {
  id: string;
  user_id: string;
  item_type: string;
  item_name: string;
  rarity: RarityLevel;
  quantity: number;
  acquired_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  weekly_xp: number;
  rank: number;
  district: string | null;
}

export interface StarterCharacter {
  name: '도담' | '나래' | '하람' | '별찌';
  character_type: string;
  description: string | null;
  stat_exploration: number;
  stat_discovery: number;
  stat_knowledge: number;
  stat_connection: number;
  stat_creativity: number;
}

// ──────────────────────────── API Response Types ────────────────────────────

export interface CheckInResult {
  success: boolean;
  distance_meters: number;
  message: string;
  checkin_id: string | null;
}

export interface CompleteEventResult {
  success: boolean;
  rewards: {
    xp_earned: number;
    badges_earned: { id: string; name: string; rarity: string }[];
    items_earned: { id: string; name: string; rarity: string }[];
  };
  character: {
    previous_level: number;
    new_level: number;
    level_up: boolean;
    evolution: boolean;
    evolution_stage: number;
    total_xp: number;
    stats_increased: Record<string, number>;
  } | null;
}

export interface NarrativeResult {
  narrative: string;
  cached: boolean;
}

export interface QuizResult {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface UserStats {
  total_xp: number;
  level: number;
  login_streak: number;
  events_completed: number;
  missions_completed: number;
  checkins_count: number;
  badges_count: number;
  districts_visited: string[];
}

export interface VisitedLocation {
  event_id: string;
  title: string;
  district: string | null;
  category: EventCategory;
  lat: number;
  lng: number;
  completed_at: string;
}
