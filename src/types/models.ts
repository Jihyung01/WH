import type {
  EventCategory,
  MissionType,
  BadgeCategory,
  RarityLevel,
  CosmeticSlot,
  CosmeticEffect,
  UnlockMethod,
  AcquiredVia,
  CharacterMood,
  TitleCategory,
} from './enums';

// ──────────────────────────── Primitives ────────────────────────────

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// ──────────────────────────── DB Row Types ────────────────────────────

/** 온보딩 성격 진단 결과 (profiles.explorer_type JSONB) */
export interface ExplorerTypePayload {
  keywords: string[];
  type_name: string;
  type_code: string;
  recommended_character_type: 'explorer' | 'foodie' | 'artist' | 'socialite';
}

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
  coins: number;
  active_title_id: string | null;
  is_premium?: boolean;
  community_terms_version?: string | null;
  community_terms_accepted_at?: string | null;
  explorer_type?: ExplorerTypePayload | null;
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
  personality_traits: string[] | null;
  mood: string | null;
  total_distance_km: number;
  favorite_district: string | null;
  equipped_title: string | null;
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
  /** UGC events: author profile id (for report / block). */
  creator_id?: string | null;
  /** Hero image for UGC events (public storage URL). */
  cover_image_url?: string | null;
  status?: string | null;
  partner_name: string | null;
  is_active: boolean;
  is_seasonal: boolean;
  season_id: string | null;
  created_at: string;
  expires_at: string | null;
  /** 조건부 노출: weather / time / season 키 (JSON) */
  visibility_conditions?: Record<string, string> | null;
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
  coins_earned: number;
}

export interface CosmeticDropResult {
  id: string;
  name: string;
  rarity: string;
  slot: string;
  preview_emoji: string;
}

export interface CompleteEventResult {
  success: boolean;
  rewards: {
    xp_earned: number;
    coins_earned: number;
    badges_earned: { id: string; name: string; rarity: string }[];
    items_earned: { id: string; name: string; rarity: string }[];
    cosmetics_dropped: CosmeticDropResult[];
    titles_earned: { id: string; name: string; rarity: string }[];
  };
  character: {
    previous_level: number;
    new_level: number;
    level_up: boolean;
    evolution: boolean;
    evolution_stage: number;
    total_xp: number;
    stats_increased: Record<string, number>;
    personality_updated: boolean;
    new_traits: string[] | null;
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

// ──────────────────────────── Cosmetic System ────────────────────────────

export interface Cosmetic {
  id: string;
  name: string;
  description: string | null;
  slot: CosmeticSlot;
  rarity: RarityLevel;
  preview_emoji: string;
  effect_type: CosmeticEffect | null;
  effect_value: number;
  effect_description: string | null;
  unlock_method: UnlockMethod;
  coin_price: number;
  is_premium: boolean;
  character_class_restriction: string[] | null;
  min_level: number;
  is_limited: boolean;
  released_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface UserCosmetic {
  id: string;
  user_id: string;
  cosmetic_id: string;
  acquired_at: string;
  acquired_via: AcquiredVia;
  cosmetic?: Cosmetic; // joined
}

export interface CharacterLoadout {
  id: string;
  user_id: string;
  character_id: string;
  slot: CosmeticSlot;
  cosmetic_id: string;
  equipped_at: string;
  cosmetic?: Cosmetic; // joined
}

export interface CharacterTitle {
  id: string;
  name: string;
  description: string | null;
  rarity: RarityLevel;
  unlock_condition: Record<string, unknown>;
  category: TitleCategory | null;
  icon_emoji: string;
  created_at: string;
}

export interface UserTitle {
  id: string;
  user_id: string;
  title_id: string;
  earned_at: string;
  title?: CharacterTitle; // joined
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
  remaining_coins?: number;
  cosmetic_name?: string;
  required?: number;
  current?: number;
}

export interface EquipResult {
  success: boolean;
  error?: string;
  slot?: string;
  cosmetic_name?: string;
}

export interface TitleCheckResult {
  newly_earned_titles: { id: string; name: string; rarity: string }[];
}

export interface PersonalityResult {
  traits: string[];
  mood: CharacterMood;
  favorite_district: string | null;
}

export interface EquippedEffects {
  xp_boost: number;
  discovery_range: number;
  streak_shield: boolean;
  coin_bonus: number;
}

// ──────────────────────────── Marks (흔적) ────────────────────────────

export type MarkVisibility = 'public' | 'friends' | 'private';

/**
 * Apple Music 카탈로그 첨부 (marks.music_json).
 * community_submissions.music_json과 완전히 동일한 포맷.
 */
export interface MarkMusicAttachment {
  apple_song_id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  preview_url: string | null;
  apple_music_url: string | null;
}

/**
 * 흔적 1건 — 지도 위의 경량 낙서.
 * `get_nearby_marks` RPC는 작성자 JOIN 필드(username/character_emoji/character_class)까지 포함.
 * `get_my_marks` / `create_mark` 응답에서는 JOIN 필드가 생략될 수 있다.
 */
export interface Mark {
  id: string;
  user_id: string;
  content: string;
  photo_url: string;
  /** RPC는 lat/lng를 분리 반환 — 클라이언트에서는 이 구조로 정규화해 사용 */
  location: { lat: number; lng: number };
  district: string | null;
  music_json: MarkMusicAttachment | null;
  emoji_icon: string;
  visibility: MarkVisibility;
  expires_at: string | null;
  created_at: string;

  // ── JOIN 필드 (get_nearby_marks 한정) ──
  username?: string | null;
  character_emoji?: string | null;
  character_class?: string | null;
}

export interface CreateMarkParams {
  content: string;
  photo_url: string;
  lat: number;
  lng: number;
  district?: string;
  music_json?: MarkMusicAttachment | null;
  visibility?: MarkVisibility;
  expires_at?: string | null;
  emoji_icon?: string;
}

export interface CreateMarkResult {
  mark: Mark;
  /** 지급 후 총 누적 XP (profiles.total_xp) */
  xp: number;
  /** 현재 레벨 (profiles.level) */
  level: number;
  /** 오늘 작성한 흔적 개수 (방금 생성분 포함) */
  today_mark_count: number;
  /** 오늘 3개 이상이면 true — 일지 자동생성 트리거 힌트 */
  should_generate_journal: boolean;
}
