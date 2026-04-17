import React, { useCallback, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  getCommunityFeed,
  toggleFeedLike,
  addFeedComment,
  getFeedComments,
  type CommunityFeedItem,
  type FeedComment,
  type AppleMusicFeedAttachment,
} from '../../src/lib/api';
import { FeedAppleMusicCard } from '../../src/components/music/FeedAppleMusicCard';
import { MarkCard, MarkShareCard } from '../../src/components/mark';
import { useMarkStore } from '../../src/stores/markStore';
import type { Mark } from '../../src/types/models';
import { shareKakaoFeedCard } from '../../src/services/kakaoShare';
import { useTheme } from '../../src/providers/ThemeProvider';
import { FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS, BRAND } from '../../src/config/theme';
import { formatRelativeDate } from '../../src/utils/format';

const SCREEN_W = Dimensions.get('window').width;
const POST_IMAGE_RATIO = 4 / 5;

function buildCaption(item: CommunityFeedItem): string {
  const parts: string[] = [];
  const ans = item.completion_answer?.trim();
  if (ans) parts.push(ans);
  if (!ans && item.mission_blurb?.trim()) {
    parts.push(item.mission_blurb.trim());
  }
  if (!parts.length && item.mission_title?.trim()) {
    parts.push(`「${item.mission_title.trim()}」 미션을 완료했어요.`);
  }
  if (!parts.length && item.event_title?.trim()) {
    parts.push(item.event_title.trim());
  }
  return parts.join('\n\n');
}

function locationLine(item: CommunityFeedItem): string | null {
  const bits = [item.event_district, item.event_address].filter(
    (s): s is string => !!s && String(s).trim().length > 0,
  );
  if (bits.length === 0) return null;
  return bits.slice(0, 2).join(' · ');
}

function parseAppleMusicAttachment(raw: unknown): AppleMusicFeedAttachment | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.apple_song_id !== 'string' || typeof o.title !== 'string' || typeof o.artist !== 'string') {
    return null;
  }
  return {
    apple_song_id: o.apple_song_id,
    title: o.title,
    artist: o.artist,
    artwork_url: typeof o.artwork_url === 'string' ? o.artwork_url : null,
    preview_url: typeof o.preview_url === 'string' ? o.preview_url : null,
    apple_music_url: typeof o.apple_music_url === 'string' ? o.apple_music_url : null,
  };
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export function FeedPost({
  item,
  colors,
  onOpenEvent,
  onToggleLike,
  onOpenComments,
  onShare,
  onPressAuthor,
}: {
  item: CommunityFeedItem;
  colors: ThemeColors;
  onOpenEvent: (id: string) => void;
  onToggleLike: (item: CommunityFeedItem) => void;
  onOpenComments: (item: CommunityFeedItem) => void;
  onShare: (item: CommunityFeedItem) => void;
  /** 프로필 화면 등에서 작성자 탭 시 */
  onPressAuthor?: (userId: string) => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const caption = useMemo(() => buildCaption(item), [item]);
  const loc = useMemo(() => locationLine(item), [item]);
  const musicAttach = useMemo(() => parseAppleMusicAttachment(item.music_json), [item.music_json]);
  const canOpen = !!item.event_id;

  const typeBadge =
    item.submission_type === 'ugc_event_cover' ? '이벤트 커버' : '미션 인증';

  return (
    <View style={[styles.post, { borderBottomColor: colors.border }]}>
      <View style={styles.postHeader}>
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={styles.avatar}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="person" size={20} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.postHeaderText}>
          <View style={styles.nameRow}>
            {onPressAuthor ? (
              <Pressable onPress={() => onPressAuthor(item.user_id)} hitSlop={6}>
                <Text style={[styles.displayName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.username ?? '탐험가'}
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.displayName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.username ?? '탐험가'}
              </Text>
            )}
            <View style={[styles.miniBadge, { backgroundColor: `${BRAND.primary}14` }]}>
              <Text style={[styles.miniBadgeText, { color: BRAND.primary }]}>{typeBadge}</Text>
            </View>
          </View>
          {loc ? (
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.locText, { color: colors.textMuted }]} numberOfLines={1}>
                {loc}
              </Text>
            </View>
          ) : item.event_title ? (
            <Text style={[styles.locText, { color: colors.textMuted }]} numberOfLines={1}>
              {item.event_title}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
          {formatRelativeDate(item.created_at)}
        </Text>
      </View>

      <Pressable
        onPress={() => item.event_id && onOpenEvent(item.event_id)}
        disabled={!canOpen}
        style={styles.imageWrap}
      >
        {!imgErr ? (
          <Image
            source={{ uri: item.image_url }}
            style={{ width: SCREEN_W, height: SCREEN_W / POST_IMAGE_RATIO }}
            contentFit="cover"
            transition={220}
            cachePolicy="memory-disk"
            onError={() => setImgErr(true)}
          />
        ) : (
          <View style={[styles.imageError, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="image-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.imageErrorText, { color: colors.textMuted }]}>
              이미지를 불러올 수 없어요
            </Text>
          </View>
        )}
      </Pressable>

      {/* ── Action row: like / comment / share ── */}
      <View style={[styles.actionRow, { paddingHorizontal: SPACING.md }]}>
        <Pressable style={styles.actionBtn} onPress={() => onToggleLike(item)} hitSlop={8}>
          <Ionicons
            name={item.liked_by_me ? 'heart' : 'heart-outline'}
            size={26}
            color={item.liked_by_me ? '#ef4444' : colors.textPrimary}
          />
        </Pressable>
        {item.like_count > 0 && (
          <Text style={[styles.countText, { color: colors.textPrimary }]}>{item.like_count}</Text>
        )}

        <Pressable
          style={[styles.actionBtn, { marginLeft: SPACING.md }]}
          onPress={() => onOpenComments(item)}
          hitSlop={8}
        >
          <Ionicons name="chatbubble-outline" size={24} color={colors.textPrimary} />
        </Pressable>
        {item.comment_count > 0 && (
          <Text style={[styles.countText, { color: colors.textPrimary }]}>{item.comment_count}</Text>
        )}

        <Pressable
          style={[styles.actionBtn, { marginLeft: SPACING.md }]}
          onPress={() => onShare(item)}
          hitSlop={8}
        >
          <Ionicons name="paper-plane-outline" size={24} color={colors.textPrimary} />
        </Pressable>

        {canOpen && (
          <Pressable
            style={styles.detailChevron}
            onPress={() => item.event_id && onOpenEvent(item.event_id)}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={[styles.bodyPad, { paddingHorizontal: SPACING.md }]}>
        {caption ? (
          <Text style={[styles.caption, { color: colors.textPrimary }]}>
            <Text style={styles.captionName}>{item.username ?? '탐험가'} </Text>
            {caption}
          </Text>
        ) : null}

        {item.mission_title ? (
          <View style={styles.metaRow}>
            <Ionicons name="flag-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.metaLine, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.mission_title}
              {item.mission_type ? ` · ${item.mission_type}` : ''}
            </Text>
          </View>
        ) : null}

        {musicAttach ? <FeedAppleMusicCard music={musicAttach} /> : null}

        {canOpen ? (
          <Pressable onPress={() => item.event_id && onOpenEvent(item.event_id)}>
            <Text style={[styles.eventLink, { color: BRAND.primary }]}>
              이벤트 상세 보기 →
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/* ── Comment Modal ── */

export function CommentModal({
  visible,
  submissionId,
  colors,
  insets,
  onClose,
  onCommentAdded,
}: {
  visible: boolean;
  submissionId: string | null;
  colors: ThemeColors;
  insets: { bottom: number };
  onClose: () => void;
  onCommentAdded: (submissionId: string) => void;
}) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async (sid: string) => {
    setLoading(true);
    try {
      const data = await getFeedComments(sid);
      setComments(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (visible && submissionId) {
      void load(submissionId);
      setText('');
    }
    if (!visible) {
      setComments([]);
    }
  }, [visible, submissionId, load]);

  const handleSend = useCallback(async () => {
    if (!submissionId || !text.trim() || sending) return;
    setSending(true);
    try {
      const newComment = await addFeedComment(submissionId, text.trim());
      setComments((prev) => [...prev, newComment]);
      setText('');
      onCommentAdded(submissionId);
    } catch {
      /* silent */
    } finally {
      setSending(false);
    }
  }, [submissionId, text, sending, onCommentAdded]);

  const renderComment = useCallback(
    ({ item }: { item: FeedComment }) => (
      <View style={styles.commentRow}>
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={styles.commentAvatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.commentAvatarFallback, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="person" size={14} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.commentBody}>
          <Text style={[styles.commentText, { color: colors.textPrimary }]}>
            <Text style={styles.commentUsername}>{item.username ?? '탐험가'} </Text>
            {item.body}
          </Text>
          <Text style={[styles.commentTime, { color: colors.textMuted }]}>
            {formatRelativeDate(item.created_at)}
          </Text>
        </View>
      </View>
    ),
    [colors],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>댓글</Text>

          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator color={BRAND.primary} />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={[styles.modalEmptyText, { color: colors.textMuted }]}>
                아직 댓글이 없어요. 첫 댓글을 남겨 보세요!
              </Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              renderItem={renderComment}
              style={styles.commentList}
              contentContainerStyle={{ paddingBottom: SPACING.md }}
            />
          )}

          <View
            style={[
              styles.commentInputRow,
              {
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, SPACING.md),
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.commentInput,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="댓글 작성..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              maxLength={500}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={[
                styles.commentSendBtn,
                {
                  opacity: text.trim() && !sending ? 1 : 0.4,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={BRAND.primary} />
              ) : (
                <Ionicons name="arrow-up-circle" size={32} color={BRAND.primary} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── Main Screen ── */

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [items, setItems] = useState<CommunityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commentTarget, setCommentTarget] = useState<string | null>(null);
  const commentModalVisible = commentTarget !== null;
  const [shareMark, setShareMark] = useState<Mark | null>(null);

  /** Mark (흔적) feed — 최근 작성한 내 흔적 (Phase 1) */
  const myTodayMarks = useMarkStore((s) => s.myTodayMarks);
  const nearbyMarks = useMarkStore((s) => s.nearbyMarks);
  const loadMyTodayMarks = useMarkStore((s) => s.loadMyTodayMarks);

  const markFeed = useMemo<Mark[]>(() => {
    const byId = new Map<string, Mark>();
    for (const m of myTodayMarks) byId.set(m.id, m);
    for (const m of nearbyMarks) byId.set(m.id, m);
    return Array.from(byId.values())
      .sort((a, b) => {
        const ta = Date.parse(a.created_at) || 0;
        const tb = Date.parse(b.created_at) || 0;
        return tb - ta;
      })
      .slice(0, 10);
  }, [myTodayMarks, nearbyMarks]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getCommunityFeed(50);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '피드를 불러오지 못했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
      void loadMyTodayMarks();
    }, [load, loadMyTodayMarks]),
  );

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  const openEvent = useCallback(
    (id: string) => {
      router.push(`/event/${id}` as any);
    },
    [router],
  );

  const handleToggleLike = useCallback(async (item: CommunityFeedItem) => {
    const prevLiked = item.liked_by_me;
    const prevCount = item.like_count;

    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? { ...it, liked_by_me: !prevLiked, like_count: prevCount + (prevLiked ? -1 : 1) }
          : it,
      ),
    );

    try {
      const result = await toggleFeedLike(item.id);
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, liked_by_me: result.liked, like_count: result.like_count }
            : it,
        ),
      );
    } catch {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, liked_by_me: prevLiked, like_count: prevCount } : it,
        ),
      );
    }
  }, []);

  const handleOpenComments = useCallback((item: CommunityFeedItem) => {
    setCommentTarget(item.id);
  }, []);

  const handleCommentAdded = useCallback((submissionId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === submissionId ? { ...it, comment_count: it.comment_count + 1 } : it,
      ),
    );
  }, []);

  const handleShare = useCallback(async (item: CommunityFeedItem) => {
    const typeLabel = item.submission_type === 'ugc_event_cover' ? '이벤트 커버' : '미션 인증';
    const title = item.event_title
      ? `${item.event_title} — ${typeLabel}`
      : `WhereHere ${typeLabel}`;
    const description = [
      item.username ? `${item.username}님의 ${typeLabel}` : typeLabel,
      item.event_district ?? '',
      item.mission_title ? `🏁 ${item.mission_title}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const deepLinkParams = item.event_id
      ? { screen: 'event', id: item.event_id }
      : undefined;

    try {
      await shareKakaoFeedCard({
        imageUrl: item.image_url,
        title,
        description,
        buttonTitle: item.event_id ? '이벤트 보기' : '앱 열기',
        linkParams: {
          iosExecutionParams: deepLinkParams,
          androidExecutionParams: deepLinkParams,
        },
      });
    } catch {
      /* cancelled or unavailable */
    }
  }, []);

  const onPressAuthor = useCallback(
    (userId: string) => {
      router.push(`/user/${userId}` as any);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityFeedItem }) => (
      <FeedPost
        item={item}
        colors={colors}
        onOpenEvent={openEvent}
        onToggleLike={handleToggleLike}
        onOpenComments={handleOpenComments}
        onShare={handleShare}
        onPressAuthor={onPressAuthor}
      />
    ),
    [colors, openEvent, handleToggleLike, handleOpenComments, handleShare, onPressAuthor],
  );

  const marksHeader = useMemo(() => {
    if (markFeed.length === 0) return null;
    return (
      <View style={styles.marksSection}>
        <View style={styles.marksHeaderRow}>
          <Text style={[styles.marksHeaderTitle, { color: colors.textPrimary }]}>
            흔적
          </Text>
          <Text style={[styles.marksHeaderSub, { color: colors.textMuted }]}>
            이 순간 여기
          </Text>
        </View>
        {markFeed.map((mark) => (
          <MarkCard
            key={`feed-mark-${mark.id}`}
            mark={mark}
            onPressAuthor={onPressAuthor}
            onPressShare={setShareMark}
          />
        ))}
        <View style={[styles.marksDivider, { backgroundColor: colors.border }]} />
      </View>
    );
  }, [markFeed, colors.textPrimary, colors.textMuted, colors.border, onPressAuthor]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>피드</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          미션 인증 · 이벤트 커버
        </Text>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <Text style={[styles.errorHint, { color: colors.textMuted }]}>
            피드 확장 마이그레이션을 아직 적용하지 않았다면 Supabase에 최신 SQL을 반영한 뒤 다시 시도해 주세요.
          </Text>
          <Pressable style={styles.retryBtn} onPress={() => void load(false)}>
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🌿</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>아직 피드가 비어 있어요</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            미션 사진 인증과 UGC 이벤트 커버가 여기에 모여요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          ListHeaderComponent={marksHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, SPACING.xl) + (Platform.OS === 'ios' ? 8 : 0) },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />
          }
        />
      )}

      <CommentModal
        visible={commentModalVisible}
        submissionId={commentTarget}
        colors={colors}
        insets={{ bottom: insets.bottom }}
        onClose={() => setCommentTarget(null)}
        onCommentAdded={handleCommentAdded}
      />
      <Modal
        visible={shareMark !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setShareMark(null)}
      >
        <View style={styles.markShareOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShareMark(null)} />
          {shareMark ? (
            <MarkShareCard
              mark={shareMark}
              onClose={() => setShareMark(null)}
              downloadUrl="wherehere.app"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    marginTop: 4,
  },
  listContent: {
    paddingTop: 0,
  },
  marksSection: {
    paddingTop: SPACING.sm,
  },
  marksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  marksHeaderTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  marksHeaderSub: {
    fontSize: FONT_SIZE.xs,
  },
  marksDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  markShareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  post: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  displayName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    flexShrink: 1,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.semibold,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locText: {
    fontSize: FONT_SIZE.xs,
    flex: 1,
  },
  timeAgo: {
    fontSize: FONT_SIZE.xs,
    marginLeft: 4,
  },
  imageWrap: {
    backgroundColor: '#0f172a',
  },
  imageError: {
    width: SCREEN_W,
    height: SCREEN_W / POST_IMAGE_RATIO,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  imageErrorText: {
    fontSize: FONT_SIZE.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  actionBtn: {
    padding: 2,
  },
  countText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    marginLeft: 4,
  },
  detailChevron: {
    marginLeft: 'auto',
  },
  bodyPad: {
    gap: SPACING.sm,
    paddingTop: 4,
  },
  caption: {
    fontSize: FONT_SIZE.md,
    lineHeight: FONT_SIZE.md * 1.45,
  },
  captionName: {
    fontWeight: FONT_WEIGHT.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  metaLine: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * 1.5,
  },
  eventLink: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontSize: FONT_SIZE.md,
  },
  errorHint: {
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    lineHeight: FONT_SIZE.xs * 1.5,
    marginBottom: SPACING.md,
  },
  retryBtn: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.md,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    lineHeight: FONT_SIZE.sm * 1.5,
  },

  /* ── Comment Modal ── */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: 280,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    paddingBottom: SPACING.sm,
  },
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  modalEmptyText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  commentList: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  commentRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * 1.5,
  },
  commentUsername: {
    fontWeight: FONT_WEIGHT.bold,
  },
  commentTime: {
    fontSize: FONT_SIZE.xs,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: SPACING.sm,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.sm,
  },
  commentSendBtn: {
    paddingBottom: 4,
  },
});
