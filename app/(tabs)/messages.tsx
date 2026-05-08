/**
 * 메시지 탭 — Phase 5 본문 (Spec §6).
 *
 * 디자인 (WhereHere_Manga.html):
 *   - "매:시지" BagelFatOne 헤드라인
 *   - LIVE 단체영상통화 배너 (오렌지 그라디언트 + 참여 버튼) — 진행 중 방 있을 때만
 *   - 4 빠른 액션 (그룹 만들기 / 단체 영상 / 번개 약속 / 위치 공유)
 *   - 세그먼트 (전체 / 그룹 / DM)
 *   - 그룹 채팅방 + 개인 메시지 섹션 (최근 메시지 미리보기 + 미확인 카운트)
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { listMyChatRooms, type ChatRoomSummary } from '../../src/lib/api';
import { MANGA, MANGA_BORDER, MANGA_RADIUS, FONT_FAMILY } from '../../src/config/theme';
import { InkCard, MangaAvatar, showToast } from '../../src/components/ui';

type Segment = 'all' | 'group' | 'dm';

export default function MessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [segment, setSegment] = useState<Segment>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await listMyChatRooms(40);
      setRooms(r);
    } catch {
      // 마이그레이션 미적용 시 RPC not found — 조용히 빈 상태 유지
      setRooms([]);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filteredRooms = useMemo(() => {
    let list = rooms;
    if (segment === 'group') list = list.filter((r) => r.type !== '1on1');
    if (segment === 'dm') list = list.filter((r) => r.type === '1on1');
    const q = search.trim();
    if (q) {
      list = list.filter((r) =>
        (r.title ?? '').includes(q) ||
        (r.last_message_text ?? '').includes(q) ||
        (r.last_message_sender ?? '').includes(q),
      );
    }
    return list;
  }, [rooms, segment, search]);

  const groupRooms = useMemo(() => filteredRooms.filter((r) => r.type !== '1on1'), [filteredRooms]);
  const dmRooms = useMemo(() => filteredRooms.filter((r) => r.type === '1on1'), [filteredRooms]);
  const liveRoom = useMemo(() => rooms.find((r) => r.live_video_started_at), [rooms]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MANGA.ink} />}
    >
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <Text style={styles.h1} allowFontScaling={false}>매:시지</Text>
        <Pressable
          onPress={() => showToast('알림', { tone: 'paper', icon: '🔔' })}
          style={({ pressed }) => [styles.bellWrap, pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] }]}
        >
          <View style={[styles.bellShadow, { top: 2, left: 2 }]} />
          <View style={styles.bellBody}>
            <Ionicons name="notifications-outline" size={20} color={MANGA.ink} />
          </View>
        </Pressable>
      </View>

      {/* 검색 */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchShadow, { top: 2, left: 2 }]} />
        <View style={styles.searchBody}>
          <Ionicons name="search" size={18} color={MANGA.ink} style={{ marginRight: 8, opacity: 0.5 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="이름·메시지 검색"
            placeholderTextColor="rgba(26,22,18,0.4)"
            style={styles.searchInput}
            allowFontScaling={false}
          />
        </View>
      </View>

      {/* LIVE 단체영상통화 배너 — 진행 중 방 있을 때만 */}
      {liveRoom ? (
        <Pressable
          onPress={() => router.push(`/chat/${liveRoom.room_id}` as never)}
          style={({ pressed }) => [styles.liveWrap, pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] }]}
        >
          <View style={[styles.liveShadow, { top: 3, left: 3 }]} />
          <View style={styles.liveBody}>
            <View style={styles.liveAvatars}>
              <MangaAvatar name="정" size={32} borderWidth={2} />
              <MangaAvatar name="주" size={32} borderWidth={2} style={{ marginLeft: -10 }} />
              <MangaAvatar name="하" size={32} borderWidth={2} style={{ marginLeft: -10 }} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.liveTitle} allowFontScaling={false} numberOfLines={1}>
                  {liveRoom.title ?? '그룹 영상통화'}
                </Text>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText} allowFontScaling={false}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.liveSub} allowFontScaling={false} numberOfLines={1}>
                단체 영상통화 진행 중 · {liveRoom.member_count}명 참여
              </Text>
            </View>
            <View style={styles.liveJoin}>
              <Text style={styles.liveJoinText} allowFontScaling={false}>참여</Text>
            </View>
          </View>
        </Pressable>
      ) : null}

      {/* 4 빠른 액션 */}
      <View style={styles.quickGrid}>
        <QuickAction
          emoji="👥"
          label="그룹 만들기"
          background={MANGA.b}
          onPress={() => showToast('곧 추가됩니다', { tone: 'paper' })}
        />
        <QuickAction
          emoji="🎥"
          label="단체 영상"
          background={MANGA.r}
          onPress={() => showToast('곧 추가됩니다', { tone: 'paper' })}
        />
        <QuickAction
          emoji="⚡"
          label="번개 약속"
          background={MANGA.y}
          onPress={() => showToast('곧 추가됩니다', { tone: 'paper' })}
        />
        <QuickAction
          emoji="📍"
          label="위치 공유"
          background={MANGA.g}
          onPress={() => showToast('곧 추가됩니다', { tone: 'paper' })}
        />
      </View>

      {/* 세그먼트 */}
      <View style={styles.segWrap}>
        {(['all', 'group', 'dm'] as Segment[]).map((s) => (
          <Pressable key={s} onPress={() => setSegment(s)} style={[styles.segItem, segment === s && styles.segItemActive]}>
            <Text style={[styles.segText, segment === s && styles.segTextActive]} allowFontScaling={false}>
              {s === 'all' ? '전체' : s === 'group' ? '그룹' : 'DM'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 그룹 채팅방 섹션 */}
      {(segment === 'all' || segment === 'group') && groupRooms.length > 0 ? (
        <View style={{ marginTop: 14 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>그룹 채팅방</Text>
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText} allowFontScaling={false}>{groupRooms.length}</Text>
            </View>
          </View>
          <View style={{ gap: 10 }}>
            {groupRooms.map((r) => (
              <RoomRow key={r.room_id} room={r} onPress={() => router.push(`/chat/${r.room_id}` as never)} />
            ))}
          </View>
        </View>
      ) : null}

      {/* 개인 메시지 섹션 */}
      {(segment === 'all' || segment === 'dm') && dmRooms.length > 0 ? (
        <View style={{ marginTop: 18 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>개인 메시지</Text>
            <Text style={styles.archiveLink} allowFontScaling={false}>보관함 ›</Text>
          </View>
          <View style={{ gap: 10 }}>
            {dmRooms.map((r) => (
              <RoomRow key={r.room_id} room={r} onPress={() => router.push(`/chat/${r.room_id}` as never)} />
            ))}
          </View>
        </View>
      ) : null}

      {/* 빈 상태 */}
      {filteredRooms.length === 0 && !refreshing ? (
        <InkCard radius="cardLg" shadow="md" pad={20} style={{ marginTop: 24 }}>
          <Text style={styles.emptyTitle} allowFontScaling={false}>아직 채팅이 없어요</Text>
          <Text style={styles.emptySub} allowFontScaling={false}>
            친구 프로필에서 메시지 보내거나 크루를 만들면 여기에 모여요.
          </Text>
        </InkCard>
      ) : null}
    </ScrollView>
  );
}

// ── components ──

function QuickAction({
  emoji, label, background, onPress,
}: { emoji: string; label: string; background: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [styles.qa, pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] }]}
    >
      <View style={[styles.qaShadow, { top: 2, left: 2 }]} />
      <View style={[styles.qaBody, { backgroundColor: background }]}>
        <Text style={styles.qaEmoji} allowFontScaling={false}>{emoji}</Text>
        <Text style={styles.qaLabel} allowFontScaling={false}>{label}</Text>
      </View>
    </Pressable>
  );
}

function RoomRow({ room, onPress }: { room: ChatRoomSummary; onPress: () => void }) {
  const isGroup = room.type !== '1on1';
  const title = room.title ?? (isGroup ? '그룹 채팅' : room.last_message_sender ?? '대화');
  const preview = room.last_message_text ?? (isGroup ? '아직 메시지가 없어요' : '');

  // 시간 — 1시간 전 / 12분 전 / 방금
  const now = Date.now();
  const last = new Date(room.last_message_at).getTime();
  const diffM = Math.floor((now - last) / 60000);
  const timeLabel = diffM < 1 ? '방금' : diffM < 60 ? `${diffM}분 전` : diffM < 1440 ? `${Math.floor(diffM/60)}시간 전` : `${Math.floor(diffM/1440)}일 전`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.roomWrap, pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] }]}
    >
      <View style={[styles.roomShadow, { top: 2, left: 2 }]} />
      <View style={styles.roomBody}>
        {isGroup ? (
          <View style={styles.groupAvatar}>
            <Text style={styles.groupAvatarEmoji} allowFontScaling={false}>{room.emoji ?? '👥'}</Text>
            {room.member_count > 1 ? (
              <View style={styles.groupCount}>
                <Text style={styles.groupCountText} allowFontScaling={false}>{room.member_count}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <MangaAvatar name={title} size={48} />
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={styles.roomTitle} allowFontScaling={false} numberOfLines={1}>{title}</Text>
            {isGroup && room.crew_id ? (
              <View style={styles.crewChip}>
                <Text style={styles.crewChipText} allowFontScaling={false}>크루</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.roomPreview} allowFontScaling={false} numberOfLines={1}>
            {room.last_message_sender ? `${room.last_message_sender}: ${preview}` : preview}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={styles.roomTime} allowFontScaling={false}>{timeLabel}</Text>
          {room.unread_count > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText} allowFontScaling={false}>{room.unread_count > 99 ? '99+' : room.unread_count}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MANGA.paper2 },
  content: { paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: {
    fontFamily: FONT_FAMILY.display,
    fontSize: 36,
    color: MANGA.ink,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  // bell
  bellWrap: { width: 40, height: 40, position: 'relative' },
  bellShadow: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: MANGA.ink },
  bellBody: { width: 40, height: 40, borderRadius: 20, backgroundColor: MANGA.paper, borderWidth: MANGA_BORDER.width, borderColor: MANGA_BORDER.color, alignItems: 'center', justifyContent: 'center' },
  // search
  searchWrap: { marginTop: 12, height: 44, position: 'relative' },
  searchShadow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: MANGA.ink, borderRadius: 999 },
  searchBody: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: MANGA.paper, borderRadius: 999, borderWidth: MANGA_BORDER.width, borderColor: MANGA_BORDER.color, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: MANGA.ink, fontSize: 14, fontFamily: FONT_FAMILY.primary, paddingVertical: 0, includeFontPadding: false },
  // live banner
  liveWrap: { marginTop: 14, height: 84, position: 'relative' },
  liveShadow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: MANGA.ink, borderRadius: MANGA_RADIUS.cardLg },
  liveBody: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFB36B', borderRadius: MANGA_RADIUS.cardLg, borderWidth: MANGA_BORDER.width, borderColor: MANGA_BORDER.color, paddingHorizontal: 14, gap: 10 },
  liveAvatars: { flexDirection: 'row' },
  liveTitle: { color: MANGA.ink, fontSize: 15, fontFamily: FONT_FAMILY.primaryBold, letterSpacing: -0.3, flexShrink: 1 },
  liveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1.5, borderColor: MANGA.ink, backgroundColor: MANGA.r },
  liveBadgeText: { color: MANGA.paper, fontSize: 9, fontFamily: FONT_FAMILY.primaryBold, fontWeight: '900', letterSpacing: 0.5 },
  liveSub: { color: MANGA.ink, opacity: 0.75, fontSize: 12, fontFamily: FONT_FAMILY.primary, marginTop: 2 },
  liveJoin: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: MANGA.paper, borderRadius: 999, borderWidth: 2, borderColor: MANGA.ink },
  liveJoinText: { color: MANGA.ink, fontSize: 13, fontFamily: FONT_FAMILY.primaryBold, letterSpacing: -0.2 },
  // quick actions 4
  quickGrid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  qa: { flex: 1, position: 'relative', aspectRatio: 1 },
  qaShadow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: MANGA.ink, borderRadius: MANGA_RADIUS.cardLg },
  qaBody: { flex: 1, borderRadius: MANGA_RADIUS.cardLg, borderWidth: MANGA_BORDER.width, borderColor: MANGA_BORDER.color, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 },
  qaEmoji: { fontSize: 24 },
  qaLabel: { color: MANGA.ink, fontSize: 11, fontFamily: FONT_FAMILY.primaryBold, letterSpacing: -0.2, textAlign: 'center' },
  // segment
  segWrap: { flexDirection: 'row', backgroundColor: MANGA.paper, borderRadius: 12, borderWidth: 2, borderColor: MANGA.ink, marginTop: 14, padding: 4 },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segItemActive: { backgroundColor: MANGA.b, borderWidth: 1.5, borderColor: MANGA.ink },
  segText: { color: MANGA.ink, opacity: 0.55, fontSize: 13, fontFamily: FONT_FAMILY.primaryBold, letterSpacing: -0.2 },
  segTextActive: { opacity: 1 },
  // section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { color: MANGA.ink, fontSize: 13, fontFamily: FONT_FAMILY.primaryBold, letterSpacing: -0.2 },
  sectionCount: { width: 22, height: 22, borderRadius: 11, backgroundColor: MANGA.b, borderWidth: 1.5, borderColor: MANGA.ink, alignItems: 'center', justifyContent: 'center' },
  sectionCountText: { color: MANGA.ink, fontSize: 11, fontFamily: FONT_FAMILY.display, includeFontPadding: false },
  archiveLink: { color: MANGA.r, fontSize: 12, fontFamily: FONT_FAMILY.primaryBold, letterSpacing: -0.2 },
  // room row
  roomWrap: { position: 'relative', height: 72 },
  roomShadow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: MANGA.ink, borderRadius: MANGA_RADIUS.cardLg },
  roomBody: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: MANGA.paper, borderRadius: MANGA_RADIUS.cardLg, borderWidth: MANGA_BORDER.width, borderColor: MANGA_BORDER.color, padding: 12, gap: 10 },
  groupAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: MANGA.paper2, borderWidth: MANGA_BORDER.width, borderColor: MANGA_BORDER.color, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  groupAvatarEmoji: { fontSize: 22 },
  groupCount: { position: 'absolute', bottom: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: MANGA.b, borderWidth: 1.5, borderColor: MANGA.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  groupCountText: { color: MANGA.ink, fontSize: 10, fontFamily: FONT_FAMILY.display, includeFontPadding: false },
  roomTitle: { color: MANGA.ink, fontSize: 14, fontFamily: FONT_FAMILY.primaryBold, letterSpacing: -0.3 },
  crewChip: { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: MANGA.b, borderRadius: 5, borderWidth: 1, borderColor: MANGA.ink },
  crewChipText: { color: MANGA.ink, fontSize: 9, fontFamily: FONT_FAMILY.primaryBold, letterSpacing: -0.2 },
  roomPreview: { color: MANGA.ink, opacity: 0.6, fontSize: 12, fontFamily: FONT_FAMILY.primary },
  roomTime: { color: MANGA.ink, opacity: 0.5, fontSize: 11, fontFamily: FONT_FAMILY.mono },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: MANGA.r, borderWidth: 1.5, borderColor: MANGA.ink, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: MANGA.paper, fontSize: 11, fontFamily: FONT_FAMILY.primaryBold, fontWeight: '900' },
  emptyTitle: { color: MANGA.ink, fontSize: 16, fontFamily: FONT_FAMILY.primaryBold, letterSpacing: -0.3 },
  emptySub: { color: MANGA.ink, opacity: 0.6, fontSize: 13, fontFamily: FONT_FAMILY.primary, marginTop: 4, lineHeight: 19 },
});
