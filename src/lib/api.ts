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

async function invokeEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new AppError(
      data?.error ?? '서버 오류가 발생했습니다.',
      'EDGE_FUNCTION_ERROR',
      res.status,
    );
  }

  return data as T;
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
// 7. Character
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyCharacter(): Promise<Character | null> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', user.id)
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
    .single();
  throwIfError(error, '프로필을 불러오지 못했습니다.');
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
