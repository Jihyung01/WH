import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';
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
import type { ExplorerTypePayload } from '../types/models';

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

function looksLikeJwtAuthFailure(message: string, rawText: string): boolean {
  const combined = `${message}\n${rawText}`.toLowerCase();
  return (
    combined.includes('jwt') ||
    combined.includes('invalid token') ||
    combined.includes('malformed') ||
    combined.includes('expired')
  );
}

/**
 * Edge Functions 호출 (`verify_jwt` 게이트웨이는 apikey + Bearer user JWT 필요).
 * RN/Expo에서 `supabase.functions.invoke` + 내부 fetch 헤더 병합이 꼬이면 `Invalid JWT`가 날 수 있어
 * 동일 URL로 `fetch`에 apikey·Authorization을 명시해 호출합니다.
 */
async function invokeEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const fnUrl = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${encodeURIComponent(name)}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      if (attempt === 0) {
        const { error: re } = await supabase.auth.refreshSession();
        if (re) {
          throw new AppError('세션이 만료되었습니다. 다시 로그인해 주세요.', 'SESSION_EXPIRED', 401);
        }
        continue;
      }
      throw new AppError('인증이 필요합니다.', 'AUTH_REQUIRED', 401);
    }

    let {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      if (attempt === 0) {
        await supabase.auth.refreshSession();
        continue;
      }
      throw new AppError('세션이 없습니다. 다시 로그인해 주세요.', 'AUTH_REQUIRED', 401);
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const exp = session.expires_at ?? 0;
    if (exp > 0 && exp <= nowSec + 120) {
      const { data: ref, error: refErr } = await supabase.auth.refreshSession();
      if (!refErr && ref.session?.access_token) {
        session = ref.session;
      }
    }

    const accessToken = session.access_token.trim();
    let res: Response;
    try {
      res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AppError(
        'Edge Function에 연결하지 못했습니다. 네트워크와 Supabase 상태를 확인해 주세요.',
        'EDGE_FUNCTION_ERROR',
        502,
      );
    }

    if (res.headers.get('x-relay-error') === 'true') {
      throw new AppError(
        'Edge Function에 연결하지 못했습니다. 네트워크와 Supabase 상태를 확인해 주세요.',
        'EDGE_FUNCTION_ERROR',
        502,
      );
    }

    const rawText = await res.text();
    let parsed: unknown = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      const errMsg = parseEdgeFunctionErrorBody(res.status, res.statusText, rawText, parsed);
      if (
        attempt === 0 &&
        res.status === 401 &&
        looksLikeJwtAuthFailure(errMsg, rawText)
      ) {
        await supabase.auth.refreshSession();
        continue;
      }
      throw new AppError(errMsg, 'EDGE_FUNCTION_ERROR', res.status);
    }

    const data = (parsed ?? {}) as T;
    const raw = data as Record<string, unknown> | null | undefined;
    if (
      raw &&
      typeof raw.error === 'string' &&
      raw.suggested_event === undefined &&
      raw.event_id === undefined
    ) {
      throw new AppError(raw.error, 'EDGE_FUNCTION_ERROR', 400);
    }
    return data;
  }

  throw new AppError('인증에 실패했습니다. 다시 로그인해 주세요.', 'EDGE_FUNCTION_ERROR', 401);
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

/** Bump when community / UGC legal text changes (App Store Guideline 1.2). */
export const COMMUNITY_TERMS_VERSION = '2026-04-08';

export async function getCommunityTermsStatus(): Promise<{
  accepted: boolean;
  version: string | null;
}> {
  const user = await getCurrentUserOrNull();
  if (!user) return { accepted: false, version: null };
  const { data, error } = await supabase
    .from('profiles')
    .select('community_terms_accepted_at, community_terms_version')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return { accepted: false, version: null };
  return {
    accepted: !!data.community_terms_accepted_at,
    version: (data.community_terms_version as string | null) ?? null,
  };
}

export async function acceptCommunityTerms(version: string): Promise<void> {
  const user = await getCurrentUser();
  const { error } = await supabase
    .from('profiles')
    .update({
      community_terms_version: version,
      community_terms_accepted_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  throwIfError(error, '약관 동의 저장에 실패했습니다.');
}

export async function fetchBlockedUserIds(): Promise<string[]> {
  const user = await getCurrentUserOrNull();
  if (!user) return [];
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id);
  if (error) return [];
  return (data ?? []).map((r: { blocked_id: string }) => r.blocked_id);
}

export async function blockAnotherUser(blockedUserId: string): Promise<void> {
  const { error } = await supabase.rpc('block_user', { p_blocked_user_id: blockedUserId });
  throwIfError(error, '사용자를 차단하지 못했습니다.');
}

export async function submitContentReport(params: {
  contentType: 'event' | 'journal' | 'chat' | 'profile' | 'other';
  contentId?: string;
  reportedUserId?: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const user = await getCurrentUser();
  const { error } = await supabase.from('content_reports').insert({
    reporter_id: user.id,
    content_type: params.contentType,
    content_id: params.contentId ?? null,
    reported_user_id: params.reportedUserId ?? null,
    reason: params.reason,
    details: params.details ?? null,
  });
  throwIfError(error, '신고 접수에 실패했습니다.');
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

export async function profileNeedsPersonalityQuiz(): Promise<boolean> {
  const user = await getCurrentUserOrNull();
  if (!user) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('explorer_type')
    .eq('id', user.id)
    .maybeSingle();
  if (error) return false;
  return data?.explorer_type == null;
}

export async function updateProfile(
  updates: Partial<Pick<Profile, 'username' | 'avatar_url' | 'explorer_type'>>,
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
  return getUserStatsForUser(user.id);
}

export async function getUserStatsForUser(userId: string): Promise<UserStats> {
  await getCurrentUser();
  const { data, error } = await supabase.rpc('get_user_stats', {
    p_user_id: userId,
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

function detectMime(uri: string): { mime: string; ext: string } {
  const lower = uri.toLowerCase();
  if (lower.includes('.heic') || lower.includes('.heif')) return { mime: 'image/heic', ext: 'heic' };
  if (lower.includes('.png')) return { mime: 'image/png', ext: 'png' };
  if (lower.includes('.webp')) return { mime: 'image/webp', ext: 'webp' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

async function uriToUploadBody(imageUri: string): Promise<{ body: FormData; ext: string }> {
  const { mime, ext } = detectMime(imageUri);
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: `photo.${ext}`,
    type: mime,
  } as unknown as Blob);
  return { body: formData, ext };
}

export async function uploadMissionPhoto(
  missionId: string,
  imageUri: string,
): Promise<string> {
  const user = await getCurrentUser();
  const { body, ext } = await uriToUploadBody(imageUri);
  const fileName = `${user.id}/${missionId}/${Date.now()}.${ext}`;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/mission-photos/${fileName}`;
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('Storage upload failed:', res.status, errText);
    throw new AppError('사진 업로드에 실패했습니다.', 'UPLOAD_ERROR', 500);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('mission-photos').getPublicUrl(fileName);

  return publicUrl;
}

export async function uploadUGCCoverPhoto(imageUri: string): Promise<string> {
  const user = await getCurrentUser();
  const { body, ext } = await uriToUploadBody(imageUri);
  const fileName = `ugc-covers/${user.id}/${Date.now()}.${ext}`;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/mission-photos/${fileName}`;
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('Cover upload failed:', res.status, errText);
    throw new AppError('커버 이미지 업로드에 실패했습니다.', 'UPLOAD_ERROR', 500);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('mission-photos').getPublicUrl(fileName);

  return publicUrl;
}

export async function createCommunitySubmissionMissionPhoto(
  missionCompletionId: string,
  imageUrl: string,
  visibility: 'public' | 'friends' | 'private' = 'public',
): Promise<string> {
  const { data, error } = await supabase.rpc('create_community_submission_mission_photo', {
    p_mission_completion_id: missionCompletionId,
    p_image_url: imageUrl,
    p_visibility: visibility,
  });
  throwIfError(error, '커뮤니티 피드 등록에 실패했습니다.');
  return data as string;
}

/** Apple Music 카탈로그 첨부 (Edge `apple-music-search` + DB `music_json`) */
export interface AppleMusicFeedAttachment {
  apple_song_id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  preview_url: string | null;
  apple_music_url: string | null;
}

export async function searchAppleMusicTracks(query: string): Promise<AppleMusicFeedAttachment[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await invokeEdgeFunction<{ tracks: AppleMusicFeedAttachment[] }>('apple-music-search', {
    q,
  });
  return Array.isArray(res.tracks) ? res.tracks : [];
}

export async function updateCommunitySubmissionMusic(
  submissionId: string,
  music: AppleMusicFeedAttachment | null,
): Promise<void> {
  const { error } = await supabase.rpc('update_community_submission_music', {
    p_submission_id: submissionId,
    p_music: music,
  });
  throwIfError(error, '음악 정보를 저장하지 못했습니다.');
}

export interface CommunityFeedItem {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url?: string | null;
  submission_type: 'mission_photo' | 'ugc_event_cover';
  image_url: string;
  event_id: string | null;
  event_title: string | null;
  event_address?: string | null;
  event_district?: string | null;
  mission_title?: string | null;
  mission_type?: string | null;
  mission_blurb?: string | null;
  completion_answer?: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  /** Apple Music 메타; 없으면 null */
  music_json?: AppleMusicFeedAttachment | null;
  created_at: string;
}

export interface FeedComment {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  body: string;
  created_at: string;
}

function parseCommunityFeedRpcPayload(raw: unknown): CommunityFeedItem[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as CommunityFeedItem[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as CommunityFeedItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function getCommunityFeed(limit = 40): Promise<CommunityFeedItem[]> {
  const user = await getCurrentUserOrNull();
  if (!user) return [];

  const { data, error } = await supabase.rpc('get_community_feed', {
    p_limit: limit,
  });
  throwIfError(error, '커뮤니티 피드를 불러오지 못했습니다.');
  return parseCommunityFeedRpcPayload(data as unknown);
}

export interface PublicProfileCharacter {
  name: string;
  character_type: string;
  level: number;
  xp: number;
  equipped_title: string | null;
}

export interface PublicProfileLocation {
  latitude: number;
  longitude: number;
  last_seen_at: string;
}

export type PublicProfileResult =
  | {
      success: true;
      user_id: string;
      username: string | null;
      avatar_url: string | null;
      explorer_type: ExplorerTypePayload | null;
      character: PublicProfileCharacter | null;
      location: PublicProfileLocation | null;
      exploration_days: number;
    }
  | { success: false; error: string };

export async function getPublicProfile(targetUserId: string): Promise<PublicProfileResult> {
  await getCurrentUser();
  const { data, error } = await supabase.rpc('get_public_profile', {
    p_target_user_id: targetUserId,
  });
  throwIfError(error, '프로필을 불러오지 못했습니다.');
  const row = data as Record<string, unknown> | null;
  if (!row || row.success !== true) {
    return { success: false, error: String(row?.error ?? 'unknown') };
  }
  return row as unknown as Extract<PublicProfileResult, { success: true }>;
}

export async function getUserCommunityFeed(userId: string, limit = 30): Promise<CommunityFeedItem[]> {
  await getCurrentUser();
  const { data, error } = await supabase.rpc('get_user_community_feed', {
    p_user_id: userId,
    p_limit: limit,
  });
  throwIfError(error, '피드를 불러오지 못했습니다.');
  return parseCommunityFeedRpcPayload(data as unknown);
}

export interface UserEventActivityItem {
  event_id: string;
  event_title: string;
  district: string | null;
  address: string | null;
  completed_at: string;
}

export async function getUserRecentEventActivity(
  userId: string,
  limit = 10,
): Promise<UserEventActivityItem[]> {
  await getCurrentUser();
  const { data, error } = await supabase.rpc('get_user_recent_event_activity', {
    p_user_id: userId,
    p_limit: limit,
  });
  throwIfError(error, '활동 기록을 불러오지 못했습니다.');
  const raw = data as unknown;
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as UserEventActivityItem[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as UserEventActivityItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export type GiftCosmeticResult =
  | {
      success: true;
      cosmetic_name: string;
      coins_spent: number;
      remaining_coins: number;
      receiver_id: string;
      sender_username: string;
    }
  | {
      success: false;
      error: string;
      required?: number;
      current?: number;
    };

export async function giftCosmetic(receiverUserId: string, cosmeticId: string): Promise<GiftCosmeticResult> {
  await getCurrentUser();
  const { data, error } = await supabase.rpc('gift_cosmetic', {
    p_receiver_id: receiverUserId,
    p_cosmetic_id: cosmeticId,
  });
  throwIfError(error, '선물 처리에 실패했습니다.');
  return data as unknown as GiftCosmeticResult;
}

/** 수신자 푸시 (실패해도 선물은 유지) */
export async function sendPushToUser(userId: string, title: string, body: string): Promise<void> {
  try {
    await invokeEdgeFunction<{ success?: boolean }>('send-notification', {
      user_id: userId,
      title,
      body,
    });
  } catch {
    /* optional */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 13-B. Feed social: like / comment / share
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleFeedLike(
  submissionId: string,
): Promise<{ liked: boolean; like_count: number }> {
  const { data, error } = await supabase.rpc('toggle_feed_like', {
    p_submission_id: submissionId,
  });
  throwIfError(error, '좋아요 처리에 실패했습니다.');
  return data as { liked: boolean; like_count: number };
}

export async function addFeedComment(
  submissionId: string,
  body: string,
): Promise<FeedComment> {
  const { data, error } = await supabase.rpc('add_feed_comment', {
    p_submission_id: submissionId,
    p_body: body,
  });
  throwIfError(error, '댓글 작성에 실패했습니다.');
  return data as unknown as FeedComment;
}

export async function getFeedComments(
  submissionId: string,
  limit = 50,
): Promise<FeedComment[]> {
  const { data, error } = await supabase.rpc('get_feed_comments', {
    p_submission_id: submissionId,
    p_limit: limit,
  });
  throwIfError(error, '댓글을 불러오지 못했습니다.');

  const raw = data as unknown;
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as FeedComment[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as FeedComment[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. Daily Rewards & Streak
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyRewardResult {
  already_claimed: boolean;
  reward_id?: string;
  streak_day?: number;
  xp_earned?: number;
  coins_earned?: number;
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

export interface SaveUGCEventResult {
  event_id: string;
  /** 커버 이미지가 있을 때만 피드 행이 생기며, Apple Music 첨부 시트에 사용 */
  feed_submission_id: string | null;
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
  cover_image_url?: string | null;
}): Promise<SaveUGCEventResult> {
  return invokeEdgeFunction<SaveUGCEventResult>('generate-ugc-event', {
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

/** Matches `add_season_xp` / season pass RPCs (200 XP per level, cap 30). */
export const SEASON_XP_PER_LEVEL = 200;
export const SEASON_MAX_LEVEL = 30;

export interface SeasonPassData {
  id: string;
  is_premium: boolean;
  current_level: number;
  season_xp: number;
  /** jsonb from DB: array of claimed level keys and/or object keys */
  claimed_rewards: unknown;
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
  /** 친구 프로필의 실시간 위치 공유 설정 (소셜 탭 표시용) */
  location_sharing?: boolean;
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

export async function respondFriendRequest(
  friendshipId: string,
  accept: boolean,
  requesterId?: string,
): Promise<{ success: boolean }> {
  const { data, error } = await supabase.rpc('respond_friend_request', {
    p_friendship_id: friendshipId,
    p_accept: accept,
  });
  throwIfError(error, '친구 요청을 처리하지 못했습니다.');
  const result = data as { success: boolean };

  if (result.success && accept && requesterId) {
    try {
      await grantReferralCoins(requesterId);
    } catch {
      // non-critical — duplicate or self-referral will silently fail
    }
  }

  return result;
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

// ─────────────────────────────────────────────────────────────────────────────
// 22. Account Deletion
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteAccount(): Promise<{ success: boolean }> {
  return invokeEdgeFunction<{ success: boolean }>('delete-account', {});
}

// ─────────────────────────────────────────────────────────────────────────────
// 23. Cosmetics
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Cosmetic,
  UserCosmetic,
  CharacterLoadout,
  CharacterTitle,
  UserTitle,
  PurchaseResult,
  EquipResult,
  TitleCheckResult,
  PersonalityResult,
} from '../types/models';
import type { CosmeticSlot } from '../types/enums';

export async function getAllCosmetics(slot?: CosmeticSlot): Promise<Cosmetic[]> {
  let query = supabase.from('character_cosmetics').select('*').order('slot').order('rarity');
  if (slot) query = query.eq('slot', slot);
  const { data, error } = await query;
  if (error) throw new AppError(error.message, 'COSMETICS_FETCH_FAILED');
  return (data ?? []) as Cosmetic[];
}

export async function getMyCosmetics(): Promise<UserCosmetic[]> {
  const { data, error } = await supabase
    .from('user_cosmetics')
    .select('*, cosmetic:character_cosmetics(*)')
    .order('acquired_at', { ascending: false });
  if (error) throw new AppError(error.message, 'USER_COSMETICS_FETCH_FAILED');
  return (data ?? []) as UserCosmetic[];
}

export async function getMyLoadout(): Promise<CharacterLoadout[]> {
  const { data, error } = await supabase
    .from('character_loadout')
    .select('*, cosmetic:character_cosmetics(*)');
  if (error) throw new AppError(error.message, 'LOADOUT_FETCH_FAILED');
  return (data ?? []) as CharacterLoadout[];
}

export async function purchaseCosmetic(cosmeticId: string): Promise<PurchaseResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('purchase_cosmetic', {
    p_user_id: user.id,
    p_cosmetic_id: cosmeticId,
  });
  if (error) throw new AppError(error.message, 'PURCHASE_FAILED');
  return data as PurchaseResult;
}

export async function equipCosmetic(cosmeticId: string, slot: CosmeticSlot): Promise<EquipResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('equip_cosmetic', {
    p_user_id: user.id,
    p_cosmetic_id: cosmeticId,
    p_slot: slot,
  });
  if (error) throw new AppError(error.message, 'EQUIP_FAILED');
  return data as EquipResult;
}

export async function unequipCosmetic(slot: CosmeticSlot): Promise<EquipResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('unequip_cosmetic', {
    p_user_id: user.id,
    p_slot: slot,
  });
  if (error) throw new AppError(error.message, 'UNEQUIP_FAILED');
  return data as EquipResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// 24. Titles
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllTitles(): Promise<CharacterTitle[]> {
  const { data, error } = await supabase
    .from('character_titles')
    .select('*')
    .order('rarity')
    .order('category');
  if (error) throw new AppError(error.message, 'TITLES_FETCH_FAILED');
  return (data ?? []) as CharacterTitle[];
}

export async function getMyTitles(): Promise<UserTitle[]> {
  const { data, error } = await supabase
    .from('user_titles')
    .select('*, title:character_titles(*)')
    .order('earned_at', { ascending: false });
  if (error) throw new AppError(error.message, 'USER_TITLES_FETCH_FAILED');
  return (data ?? []) as UserTitle[];
}

export async function setActiveTitle(titleId: string | null): Promise<void> {
  const user = await getCurrentUser();
  const { error } = await supabase
    .from('profiles')
    .update({ active_title_id: titleId })
    .eq('id', user.id);
  if (error) throw new AppError(error.message, 'SET_TITLE_FAILED');
}

export async function checkAndGrantTitles(): Promise<TitleCheckResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('check_and_grant_titles', {
    p_user_id: user.id,
  });
  if (error) throw new AppError(error.message, 'TITLE_CHECK_FAILED');
  return data as TitleCheckResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// 25. Character Personality & Coins
// ─────────────────────────────────────────────────────────────────────────────

export async function updatePersonality(): Promise<PersonalityResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('update_character_personality', {
    p_user_id: user.id,
  });
  if (error) throw new AppError(error.message, 'PERSONALITY_UPDATE_FAILED');
  return data as PersonalityResult;
}

export async function getMyCoins(): Promise<number> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', user.id)
    .single();
  if (error) throw new AppError(error.message, 'COINS_FETCH_FAILED');
  return (data?.coins as number) ?? 0;
}

export async function grantQuizCoins(): Promise<void> {
  const user = await getCurrentUser();
  const { error } = await supabase.rpc('grant_quiz_coins', {
    p_user_id: user.id,
  });
  if (error) console.warn('Failed to grant quiz coins:', error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// 26. Coin Economy & In-App Purchases
// ─────────────────────────────────────────────────────────────────────────────

export interface CoinProduct {
  id: string;
  coins: number;
  price_krw: number;
  label: string;
  badge: string | null;
  sort_order: number;
}

export async function getCoinProducts(): Promise<CoinProduct[]> {
  const { data, error } = await supabase
    .from('coin_products')
    .select('*')
    .order('sort_order');
  if (error) throw new AppError(error.message, 'COIN_PRODUCTS_FETCH_FAILED');
  return (data ?? []) as CoinProduct[];
}

export interface VerifyPurchaseResult {
  success: boolean;
  coins_granted?: number;
  total_coins?: number;
  error?: string;
}

export async function verifyAndGrantCoinPurchase(
  productId: string,
  transactionId?: string,
  platform?: string,
): Promise<VerifyPurchaseResult> {
  return invokeEdgeFunction<VerifyPurchaseResult>('verify-purchase', {
    product_id: productId,
    transaction_id: transactionId,
    platform,
    type: 'coins',
  });
}

export async function verifyAndActivatePremium(
  productId: string,
  transactionId?: string,
  platform?: string,
): Promise<{ success: boolean }> {
  return invokeEdgeFunction<{ success: boolean }>('verify-purchase', {
    product_id: productId,
    transaction_id: transactionId,
    platform,
    type: 'premium',
  });
}

export async function grantCheckinCoins(): Promise<{ total_coins: number }> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('grant_checkin_coins', {
    p_user_id: user.id,
  });
  if (error) throw new AppError(error.message, 'CHECKIN_COINS_FAILED');
  return data as { total_coins: number };
}

export async function grantReferralCoins(inviteeId: string): Promise<VerifyPurchaseResult> {
  const user = await getCurrentUser();
  const { data, error } = await supabase.rpc('grant_referral_coins', {
    p_inviter_id: user.id,
    p_invitee_id: inviteeId,
  });
  if (error) throw new AppError(error.message, 'REFERRAL_COINS_FAILED');
  return data as VerifyPurchaseResult;
}

export async function getCoinPurchaseHistory(): Promise<
  { product_id: string; coins_granted: number; created_at: string }[]
> {
  const { data, error } = await supabase
    .from('coin_purchases')
    .select('product_id, coins_granted, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new AppError(error.message, 'PURCHASE_HISTORY_FAILED');
  return (data ?? []) as { product_id: string; coins_granted: number; created_at: string }[];
}
