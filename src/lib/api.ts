import { supabase } from '../config/supabase';
import type {
  NearbyEvent,
  Event,
  MissionWithStatus,
  CheckInResult,
  MissionCompletion,
  CompleteEventResult,
  NarrativeResult,
  QuizResult,
  Character,
  StarterCharacter,
  Profile,
  UserStats,
  LeaderboardEntry,
  UserBadge,
  Badge,
  InventoryItem,
  VisitedLocation,
  EventCategory,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Error
// ─────────────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN',
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function throwIfError(error: unknown, fallback = '요청 처리에 실패했습니다.') {
  if (!error) return;
  const msg =
    typeof error === 'object' && error !== null && 'message' in error
      ? (error as { message: string }).message
      : fallback;
  throw new AppError(msg, 'SUPABASE_ERROR', 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new AppError('인증이 필요합니다.', 'AUTH_REQUIRED', 401);
  return user;
}

async function getCurrentUserOrNull() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token)
    throw new AppError('세션이 만료되었습니다.', 'SESSION_EXPIRED', 401);
  return session.access_token;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

function parseEdgeFunctionErrorBody(
  status: number,
  statusText: string,
  rawText: string,
  parsed: unknown,
): string {
  const o = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  const errStr =
    (o && typeof o.error === 'string' && o.error) ||
    (o && typeof o.message === 'string' && o.message) ||
    (o && typeof o.msg === 'string' && o.msg) ||
    '';
  if (errStr) return errStr;
  if (rawText && rawText.length > 0 && rawText.length < 500 && !rawText.trim().startsWith('<')) {
    return rawText.trim();
  }
  if (status === 401 || status === 403) {
    return '인증이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.';
  }
  if (status === 404) {
    return `Edge Function을 찾을 수 없습니다. Supabase에 배포했는지 확인하세요. (${status})`;
  }
  return `서버 오류 (${status}${statusText ? ` ${statusText}` : ''})`;
}

async function invokeEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new AppError(
      'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다.',
      'EDGE_CONFIG',
      500,
    );
  }

  const token = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  let parsed: unknown = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    throw new AppError(
      parseEdgeFunctionErrorBody(res.status, res.statusText, rawText, parsed),
      'EDGE_FUNCTION_ERROR',
      res.status,
    );
  }

  return (parsed ?? {}) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Events
// ─────────────────────────────────────────────────────────────────────────────

export async function getNearbyEvents(
  lat: number,
  lng: number,
  radiusKm = 2,
  category?: EventCategory,
): Promise<NearbyEvent[]> {
  const { data, error } = await supabase.rpc('get_nearby_events', {
    user_lat: lat,
    user_lng: lng,
    radius_km: radiusKm,
    category_filter: category ?? null,
  });
  throwIfError(error, '주변 이벤트를 불러오지 못했습니다.');
  return (data ?? []) as NearbyEvent[];
}

export async function getEvent(eventId: string): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();
  throwIfError(error, '이벤트를 찾을 수 없습니다.');
  return data as Event;
}

export async function getEventMissions(eventId: string): Promise<MissionWithStatus[]> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('get_event_missions', {
    p_user_id: user.id,
    p_event_id: eventId,
  });
  throwIfError(error, '미션 목록을 불러오지 못했습니다.');
  return (data ?? []) as MissionWithStatus[];
}

export async function getActiveEvents(): Promise<(Event & { event_id: string })[]> {
  const user = await getCurrentUserOrNull();
  if (!user) return [];

  const { data: completedRows } = await supabase
    .from('event_completions')
    .select('event_id')
    .eq('user_id', user.id);

  const completedIds = (completedRows ?? []).map((r) => r.event_id);

  let query = supabase
    .from('checkins')
    .select('event_id, events(*)')
    .eq('user_id', user.id)
    .eq('verified', true);

  if (completedIds.length > 0) {
    query = query.not('event_id', 'in', `(${completedIds.join(',')})`);
  }

  const { data, error } = await query;
  throwIfError(error, '진행중인 이벤트를 불러오지 못했습니다.');
  return (data ?? []) as any;
}

export async function getRecommendedEvents(
  lat: number,
  lng: number,
): Promise<NearbyEvent[]> {
  const user = await getCurrentUserOrNull();
  if (!user) return [];
  const { data, error } = await supabase.rpc('get_recommended_events', {
    p_user_id: user.id,
    p_lat: lat,
    p_lng: lng,
    // Disambiguate when DB has both 3-arg and 4-arg overloads of this RPC
    p_limit: 20,
  });
  throwIfError(error, '추천 이벤트를 불러오지 못했습니다.');
  return (data ?? []) as NearbyEvent[];
}

export async function getSeasonalEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_seasonal', true)
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString());
  throwIfError(error, '시즌 이벤트를 불러오지 못했습니다.');
  return (data ?? []) as Event[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Check-in
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyCheckin(
  eventId: string,
  lat: number,
  lng: number,
): Promise<CheckInResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('verify_and_create_checkin', {
    p_user_id: user.id,
    p_event_id: eventId,
    p_lat: lat,
    p_lng: lng,
  });
  throwIfError(error, '체크인에 실패했습니다.');
  return data as CheckInResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Mission completion
// ─────────────────────────────────────────────────────────────────────────────

export async function completeMission(
  missionId: string,
  eventId: string,
  answer?: string,
  proofUrl?: string,
): Promise<MissionCompletion> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('mission_completions')
    .insert({
      user_id: user.id,
      mission_id: missionId,
      event_id: eventId,
      answer: answer ?? null,
      proof_url: proofUrl ?? null,
    })
    .select()
    .single();
  throwIfError(error, '미션 완료 기록에 실패했습니다.');
  return data as MissionCompletion;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Event completion (Edge Function)
// ─────────────────────────────────────────────────────────────────────────────

export async function completeEvent(eventId: string): Promise<CompleteEventResult> {
  return invokeEdgeFunction<CompleteEventResult>('complete-event', { event_id: eventId });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. AI Narrative (Edge Function)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateNarrative(eventId: string): Promise<NarrativeResult> {
  return invokeEdgeFunction<NarrativeResult>('generate-narrative', { event_id: eventId });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. AI Quiz (Edge Function)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateQuiz(eventId: string): Promise<QuizResult> {
  return invokeEdgeFunction<QuizResult>('generate-quiz', { event_id: eventId });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6-B. AI Batch Event Generation (Edge Function)
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchGenerateRequest {
  district: string;
  count?: number;
  categories?: EventCategory[];
  difficulty_range?: [number, number];
  partner_name?: string;
  creator_type?: string;
}

export interface BatchGenerateResult {
  success: boolean;
  district: string;
  requested: number;
  generated: number;
  inserted: number;
  event_ids: string[];
}

export async function generateEventsBatch(
  params: BatchGenerateRequest,
): Promise<BatchGenerateResult> {
  return invokeEdgeFunction<BatchGenerateResult>('generate-events-batch', params as Record<string, unknown>);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Character
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyCharacter(): Promise<Character | null> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error, '캐릭터 정보를 불러오지 못했습니다.');
  return data as Character | null;
}

export async function createCharacter(
  name: '도담' | '나래' | '하람' | '별찌',
  characterType: string,
): Promise<Character> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('characters')
    .insert({
      user_id: user.id,
      name,
      character_type: characterType,
    })
    .select()
    .single();
  throwIfError(error, '캐릭터 생성에 실패했습니다.');
  return data as Character;
}

export async function getStarterCharacters(): Promise<StarterCharacter[]> {
  const { data, error } = await supabase
    .from('starter_character_catalog')
    .select('*');
  throwIfError(error, '스타터 캐릭터를 불러오지 못했습니다.');
  return (data ?? []) as StarterCharacter[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Profile / Stats
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<Profile> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  throwIfError(error, '프로필을 불러오지 못했습니다.');
  if (!data) {
    throw new AppError('프로필이 없습니다. 다시 로그인해 주세요.', 'PROFILE_MISSING', 404);
  }
  return data as Profile;
}

export async function updateProfile(
  updates: Partial<Pick<Profile, 'username' | 'avatar_url'>>,
): Promise<Profile> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  throwIfError(error, '프로필 수정에 실패했습니다.');
  return data as Profile;
}

export async function getUserStats(): Promise<UserStats> {
  const user = await getCurrentUserOrNull();
  if (!user) throw new AppError('인증이 필요합니다.', 'AUTH_REQUIRED', 401);
  const { data, error } = await supabase.rpc('get_user_stats', {
    p_user_id: user.id,
  });
  throwIfError(error, '통계를 불러오지 못했습니다.');
  return data as UserStats;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Leaderboard
// ─────────────────────────────────────────────────────────────────────────────

export async function getLeaderboard(district?: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
    p_district: district ?? null,
  });
  throwIfError(error, '리더보드를 불러오지 못했습니다.');
  return (data ?? []) as LeaderboardEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Badges / Inventory
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyBadges(): Promise<UserBadge[]> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badges(*)')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false });
  throwIfError(error, '배지를 불러오지 못했습니다.');
  return (data ?? []) as UserBadge[];
}

export async function getAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('category');
  throwIfError(error, '배지 목록을 불러오지 못했습니다.');
  return (data ?? []) as Badge[];
}

export async function getMyInventory(): Promise<InventoryItem[]> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('user_id', user.id)
    .order('acquired_at', { ascending: false });
  throwIfError(error, '인벤토리를 불러오지 못했습니다.');
  return (data ?? []) as InventoryItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Visited locations
// ─────────────────────────────────────────────────────────────────────────────

export async function getVisitedLocations(): Promise<VisitedLocation[]> {
  const user = await getCurrentUserOrNull();
  if (!user) return [];
  const { data, error } = await supabase.rpc('get_visited_locations', {
    p_user_id: user.id,
  });
  throwIfError(error, '방문 기록을 불러오지 못했습니다.');
  return (data ?? []) as VisitedLocation[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Push token
// ─────────────────────────────────────────────────────────────────────────────

export async function savePushToken(token: string): Promise<void> {
  const user = await getCurrentUser();
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', user.id);
  throwIfError(error, '푸시 토큰 저장에 실패했습니다.');
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Photo upload (Supabase Storage)
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadMissionPhoto(
  missionId: string,
  imageUri: string,
): Promise<string> {
  const user = await getCurrentUser();
  const fileName = `${user.id}/${missionId}/${Date.now()}.jpg`;

  const response = await fetch(imageUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('mission-photos')
    .upload(fileName, blob, { contentType: 'image/jpeg' });

  if (error) throw new AppError('사진 업로드에 실패했습니다.', 'UPLOAD_ERROR', 500);

  const {
    data: { publicUrl },
  } = supabase.storage.from('mission-photos').getPublicUrl(fileName);

  return publicUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. Daily Rewards & Streak
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyRewardResult {
  already_claimed: boolean;
  reward_id?: string;
  streak_day?: number;
  xp_earned?: number;
  base_xp?: number;
  streak_bonus?: number;
  bonus_type?: string | null;
  message: string;
}

export interface StreakInfo {
  current_streak: number;
  claimed_today: boolean;
  total_days: number;
  weekly_progress: number;
  next_milestone: number;
  next_milestone_bonus: number;
  days_until_milestone: number;
}

export async function claimDailyReward(): Promise<DailyRewardResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('claim_daily_reward', {
    p_user_id: user.id,
  });
  throwIfError(error, '일일 보상을 받지 못했습니다.');
  return data as DailyRewardResult;
}

export async function getStreakInfo(): Promise<StreakInfo> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('get_streak_info', {
    p_user_id: user.id,
  });
  throwIfError(error, '출석 정보를 불러오지 못했습니다.');
  return data as StreakInfo;
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. Journals
// ─────────────────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  journal_date: string;
  journal_text: string;
  share_card: {
    character_name: string;
    places_visited: string[];
    xp_earned: number;
    badges_earned: string[];
  };
  events_completed: unknown[];
  created_at: string;
}

export interface GenerateJournalResult {
  journal_text: string;
  share_card: JournalEntry['share_card'];
  cached: boolean;
}

export async function generateJournal(date?: string): Promise<GenerateJournalResult> {
  return invokeEdgeFunction<GenerateJournalResult>('generate-journal', {
    date: date ?? new Date().toISOString().split('T')[0],
  });
}

export async function getJournals(limit = 30): Promise<JournalEntry[]> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', user.id)
    .order('journal_date', { ascending: false })
    .limit(limit);
  throwIfError(error, '탐험 일지를 불러오지 못했습니다.');
  return (data ?? []) as JournalEntry[];
}

export async function getJournalByDate(date: string): Promise<JournalEntry | null> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', user.id)
    .eq('journal_date', date)
    .maybeSingle();
  throwIfError(error, '탐험 일지를 불러오지 못했습니다.');
  return data as JournalEntry | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. Character Chat
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  character_type: string;
  user_message: string;
  ai_reply: string;
  created_at: string;
}

export interface ChatReply {
  reply: string;
  remaining_chats_today: number;
}

export async function sendCharacterChat(message: string): Promise<ChatReply> {
  return invokeEdgeFunction<ChatReply>('character-chat', { message });
}

export async function getChatHistory(limit = 50): Promise<ChatMessage[]> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('character_chats')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(limit);
  throwIfError(error, '대화 기록을 불러오지 못했습니다.');
  return (data ?? []) as ChatMessage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 17. UGC Events
// ─────────────────────────────────────────────────────────────────────────────

export interface UGCSuggestedEvent {
  title: string;
  narrative: string;
  missions: Array<{
    step_order: number;
    mission_type: string;
    title: string;
    description: string;
    config?: Record<string, unknown>;
  }>;
  difficulty: number;
  reward_xp: number;
}

export interface GenerateUGCResult {
  suggested_event: UGCSuggestedEvent;
}

export async function generateUGCEvent(params: {
  location_name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  description?: string;
}): Promise<GenerateUGCResult> {
  return invokeEdgeFunction<GenerateUGCResult>('generate-ugc-event', params);
}

export async function saveUGCEvent(params: {
  title: string;
  narrative: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  district: string;
  category: string;
  difficulty: number;
  reward_xp: number;
  missions: UGCSuggestedEvent['missions'];
}): Promise<{ event_id: string }> {
  return invokeEdgeFunction<{ event_id: string }>('generate-ugc-event', {
    action: 'save',
    event_data: params,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 18. Season Pass
// ─────────────────────────────────────────────────────────────────────────────

export interface SeasonInfo {
  id: string;
  name: string;
  description: string;
  theme_color: string;
  start_date: string;
  end_date: string;
  reward_track: SeasonReward[];
  premium_reward_track: SeasonReward[];
}

export interface SeasonReward {
  level: number;
  type: 'xp' | 'badge' | 'skin';
  xp?: number;
  badge_name?: string;
  skin_id?: string;
  label: string;
}

export interface SeasonPassData {
  id: string;
  is_premium: boolean;
  current_level: number;
  season_xp: number;
  claimed_rewards: string[];
}

export interface ActiveSeasonResult {
  has_active_season: boolean;
  season?: SeasonInfo;
  pass?: SeasonPassData;
  days_remaining?: number;
}

export interface SeasonXPResult {
  success: boolean;
  season_xp?: number;
  current_level?: number;
  leveled_up?: boolean;
  xp_to_next?: number;
  reason?: string;
}

export async function getActiveSeason(): Promise<ActiveSeasonResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('get_active_season', { p_user_id: user.id });
  throwIfError(error, '시즌 정보를 불러오지 못했습니다.');
  return data as ActiveSeasonResult;
}

export async function addSeasonXP(xp: number): Promise<SeasonXPResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('add_season_xp', { p_user_id: user.id, p_xp: xp });
  throwIfError(error, '시즌 XP를 추가하지 못했습니다.');
  return data as SeasonXPResult;
}

export async function claimSeasonReward(level: number): Promise<{ success: boolean; reward?: SeasonReward; reason?: string }> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('claim_season_reward', { p_user_id: user.id, p_level: level });
  throwIfError(error, '보상을 수령하지 못했습니다.');
  return data as { success: boolean; reward?: SeasonReward; reason?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// 19. Friends & Crews
// ─────────────────────────────────────────────────────────────────────────────

export interface FriendInfo {
  friendship_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  level?: number;
  character_type?: string;
}

export interface FriendsResult {
  friends: FriendInfo[];
  pending_requests: Array<FriendInfo & { created_at: string }>;
}

export interface CrewInfo {
  id: string;
  name: string;
  description: string | null;
  icon_emoji: string;
  home_district: string | null;
  total_xp: number;
  weekly_xp: number;
  invite_code: string;
  member_count: number;
  max_members: number;
}

export interface CrewMember {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: 'leader' | 'officer' | 'member';
  contribution_xp: number;
  level?: number;
  character_type?: string;
  joined_at: string;
}

export interface MyCrewResult {
  has_crew: boolean;
  crew?: CrewInfo;
  members?: CrewMember[];
}

export async function sendFriendRequest(username: string): Promise<{ success: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc('send_friend_request', { p_username: username });
  throwIfError(error, '친구 요청을 보내지 못했습니다.');
  return data as { success: boolean; reason?: string };
}

export async function respondFriendRequest(friendshipId: string, accept: boolean): Promise<{ success: boolean }> {
  const { data, error } = await supabase.rpc('respond_friend_request', {
    p_friendship_id: friendshipId,
    p_accept: accept,
  });
  throwIfError(error, '친구 요청을 처리하지 못했습니다.');
  return data as { success: boolean };
}

export async function getFriends(): Promise<FriendsResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('get_friends', { p_user_id: user.id });
  throwIfError(error, '친구 목록을 불러오지 못했습니다.');
  return data as FriendsResult;
}

export async function createCrew(name: string, description?: string, emoji?: string, district?: string): Promise<{ success: boolean; crew_id?: string; reason?: string }> {
  const { data, error } = await supabase.rpc('create_crew', {
    p_name: name,
    p_description: description ?? null,
    p_emoji: emoji ?? '⚔️',
    p_district: district ?? null,
  });
  throwIfError(error, '크루를 생성하지 못했습니다.');
  return data as { success: boolean; crew_id?: string; reason?: string };
}

export async function joinCrew(inviteCode: string): Promise<{ success: boolean; crew_id?: string; crew_name?: string; reason?: string }> {
  const { data, error } = await supabase.rpc('join_crew', { p_invite_code: inviteCode });
  throwIfError(error, '크루에 가입하지 못했습니다.');
  return data as { success: boolean; crew_id?: string; crew_name?: string; reason?: string };
}

export async function getMyCrew(): Promise<MyCrewResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('get_my_crew', { p_user_id: user.id });
  throwIfError(error, '크루 정보를 불러오지 못했습니다.');
  return data as MyCrewResult;
}

export async function leaveCrew(): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  const { error } = await supabase
    .from('crew_members')
    .delete()
    .eq('user_id', user.id);
  throwIfError(error, '크루 탈퇴에 실패했습니다.');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 20. AI Personalized Recommendations
// ─────────────────────────────────────────────────────────────────────────────

export async function getPersonalizedRecommendations(): Promise<(Event & { event_id: string; score: number })[]> {
  return invokeEdgeFunction<(Event & { event_id: string; score: number })[]>('recommend-events', {});
}

// ─────────────────────────────────────────────────────────────────────────────
// 21. Friend Locations
// ─────────────────────────────────────────────────────────────────────────────

export async function updateMyLocation(lat: number, lng: number): Promise<void> {
  const { error } = await supabase.rpc('update_my_location', { p_lat: lat, p_lng: lng });
  if (error) console.warn('Failed to update location:', error);
}

export async function toggleLocationSharing(enabled: boolean): Promise<void> {
  const { error } = await supabase.rpc('toggle_location_sharing', { p_enabled: enabled });
  if (error) console.warn('Failed to toggle location sharing:', error);
}
