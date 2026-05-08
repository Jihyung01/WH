import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  createGroupChatRoom,
  getFriends,
  type FriendInfo,
} from '../../src/lib/api';
import { MANGA, MANGA_BORDER, MANGA_RADIUS, FONT_FAMILY, SPACING } from '../../src/config/theme';
import { MangaAvatar } from '../../src/components/ui';

const EMOJIS = ['👥', '⚡', '🌿', '🍜', '📸', '⭐', '🎒', '💬', '🔥', '🎨', '☕', '🧭'] as const;

export default function NewGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState<string>('👥');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    getFriends()
      .then((result) => {
        if (alive) setFriends(result.friends ?? []);
      })
      .catch(() => {
        if (alive) setFriends([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const canSubmit = title.trim().length >= 2 && selectedIds.length > 0 && !submitting;

  const toggleFriend = useCallback((userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const roomId = await createGroupChatRoom({
        memberIds: selectedIds,
        title: title.trim(),
        emoji,
      });
      router.replace(`/chat/${roomId}` as never);
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '그룹을 만들지 못했어요.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, emoji, router, selectedIds, title]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={MANGA.ink} />
        </Pressable>
        <Text style={styles.headerTitle} allowFontScaling={false}>그룹 만들기</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.card}>
          <Text style={styles.label} allowFontScaling={false}>그룹 이름</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="예: 정자 산책단"
            placeholderTextColor="rgba(26,22,18,0.42)"
            style={styles.input}
            maxLength={24}
            allowFontScaling={false}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label} allowFontScaling={false}>이모지</Text>
          <View style={styles.emojiGrid}>
            {EMOJIS.map((item) => (
              <Pressable
                key={item}
                onPress={() => setEmoji(item)}
                style={[styles.emojiButton, emoji === item && styles.emojiButtonActive]}
              >
                <Text style={styles.emojiText} allowFontScaling={false}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle} allowFontScaling={false}>초대할 친구</Text>
        {loading ? (
          <ActivityIndicator color={MANGA.ink} style={{ marginTop: 24 }} />
        ) : friends.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText} allowFontScaling={false}>아직 초대할 친구가 없어요.</Text>
          </View>
        ) : (
          <View style={styles.friendList}>
            {friends.map((friend) => {
              const active = selected.has(friend.user_id);
              return (
                <Pressable
                  key={friend.user_id}
                  onPress={() => toggleFriend(friend.user_id)}
                  style={[styles.friendRow, active && styles.friendRowActive]}
                >
                  <MangaAvatar name={friend.username} size={42} />
                  <View style={styles.friendText}>
                    <Text style={styles.friendName} numberOfLines={1} allowFontScaling={false}>
                      {friend.username}
                    </Text>
                    <Text style={styles.friendMeta} allowFontScaling={false}>
                      Lv.{friend.level ?? 1}
                    </Text>
                  </View>
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={MANGA.ink}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={[styles.submit, !canSubmit && styles.submitDisabled]}
        >
          <Text style={styles.submitText} allowFontScaling={false}>
            {submitting ? '만드는 중' : `그룹 열기 (${selectedIds.length})`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MANGA.paper2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: MANGA_BORDER.width,
    borderBottomColor: MANGA.ink,
    backgroundColor: MANGA.paper,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: MANGA.ink, fontSize: 18, fontFamily: FONT_FAMILY.primaryBold },
  content: { padding: SPACING.lg, gap: SPACING.md },
  card: {
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
    backgroundColor: MANGA.paper,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  label: { color: MANGA.ink, fontSize: 13, fontFamily: FONT_FAMILY.primaryBold },
  input: {
    minHeight: 46,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.card,
    backgroundColor: MANGA.paper2,
    color: MANGA.ink,
    fontSize: 15,
    fontFamily: FONT_FAMILY.primaryBold,
    paddingHorizontal: SPACING.md,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: MANGA.ink,
    backgroundColor: MANGA.paper2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonActive: { backgroundColor: MANGA.y },
  emojiText: { fontSize: 22 },
  sectionTitle: { color: MANGA.ink, fontSize: 15, fontFamily: FONT_FAMILY.primaryBold, marginTop: SPACING.sm },
  friendList: { gap: SPACING.sm },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.card,
    backgroundColor: MANGA.paper,
    padding: SPACING.md,
  },
  friendRowActive: { backgroundColor: MANGA.b },
  friendText: { flex: 1, minWidth: 0 },
  friendName: { color: MANGA.ink, fontSize: 14, fontFamily: FONT_FAMILY.primaryBold },
  friendMeta: { color: MANGA.ink, opacity: 0.6, fontSize: 12, fontFamily: FONT_FAMILY.primary, marginTop: 2 },
  emptyCard: {
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
    backgroundColor: MANGA.paper,
  },
  emptyText: { color: MANGA.ink, opacity: 0.55, fontSize: 14, fontFamily: FONT_FAMILY.primaryBold },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: MANGA_BORDER.width,
    borderTopColor: MANGA.ink,
    backgroundColor: MANGA.paper,
  },
  submit: {
    height: 52,
    borderRadius: MANGA_RADIUS.card,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA.ink,
    backgroundColor: MANGA.y,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.45 },
  submitText: { color: MANGA.ink, fontSize: 15, fontFamily: FONT_FAMILY.primaryBold },
});
