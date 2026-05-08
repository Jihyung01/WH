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
  createLightningMeetup,
  getFriends,
  type FriendInfo,
} from '../../src/lib/api';
import { useLocationStore } from '../../src/stores/locationStore';
import { reverseGeocodeToDistrict } from '../../src/utils/reverseGeocodeDistrict';
import { MANGA, MANGA_BORDER, MANGA_RADIUS, FONT_FAMILY, SPACING } from '../../src/config/theme';
import { MangaAvatar } from '../../src/components/ui';

const HOUR_OPTIONS = [1, 2, 3, 6, 12] as const;

export default function CreateMeetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentPosition = useLocationStore((s) => s.currentPosition);
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [title, setTitle] = useState('번개 약속');
  const [placeLabel, setPlaceLabel] = useState('');
  const [hourOffset, setHourOffset] = useState<number>(1);
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

  useEffect(() => {
    if (!currentPosition || placeLabel.trim()) return;
    reverseGeocodeToDistrict(currentPosition.latitude, currentPosition.longitude)
      .then((label) => setPlaceLabel(label ?? '현재 위치 근처'))
      .catch(() => setPlaceLabel('현재 위치 근처'));
  }, [currentPosition, placeLabel]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const canSubmit = title.trim().length >= 2 && placeLabel.trim().length >= 2 && selectedIds.length > 0 && !submitting;

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
      const scheduledAt = new Date(Date.now() + hourOffset * 60 * 60 * 1000).toISOString();
      const roomId = await createLightningMeetup({
        title: title.trim(),
        placeLabel: placeLabel.trim(),
        lat: currentPosition?.latitude ?? null,
        lng: currentPosition?.longitude ?? null,
        scheduledAt,
        inviteeIds: selectedIds,
      });
      router.replace(`/chat/${roomId}` as never);
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '번개 약속을 만들지 못했어요.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, currentPosition, hourOffset, placeLabel, router, selectedIds, title]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={MANGA.ink} />
        </Pressable>
        <Text style={styles.headerTitle} allowFontScaling={false}>번개 약속</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.card}>
          <Text style={styles.label} allowFontScaling={false}>약속 이름</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholder="예: 정자 카페 번개"
            placeholderTextColor="rgba(26,22,18,0.42)"
            allowFontScaling={false}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label} allowFontScaling={false}>장소</Text>
          <TextInput
            value={placeLabel}
            onChangeText={setPlaceLabel}
            style={styles.input}
            placeholder="만날 장소"
            placeholderTextColor="rgba(26,22,18,0.42)"
            allowFontScaling={false}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label} allowFontScaling={false}>시간</Text>
          <View style={styles.chipRow}>
            {HOUR_OPTIONS.map((hour) => (
              <Pressable
                key={hour}
                onPress={() => setHourOffset(hour)}
                style={[styles.timeChip, hourOffset === hour && styles.timeChipActive]}
              >
                <Text style={styles.timeChipText} allowFontScaling={false}>
                  {hour}시간 뒤
                </Text>
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
                  <Text style={styles.friendName} numberOfLines={1} allowFontScaling={false}>
                    {friend.username}
                  </Text>
                  <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={MANGA.ink} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={submit} disabled={!canSubmit} style={[styles.submit, !canSubmit && styles.submitDisabled]}>
          <Text style={styles.submitText} allowFontScaling={false}>
            {submitting ? '만드는 중' : `약속 만들기 (${selectedIds.length})`}
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  timeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: MANGA_RADIUS.chipLg,
    borderWidth: 2,
    borderColor: MANGA.ink,
    backgroundColor: MANGA.paper2,
  },
  timeChipActive: { backgroundColor: MANGA.y },
  timeChipText: { color: MANGA.ink, fontSize: 13, fontFamily: FONT_FAMILY.primaryBold },
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
  friendRowActive: { backgroundColor: MANGA.y },
  friendName: { flex: 1, color: MANGA.ink, fontSize: 14, fontFamily: FONT_FAMILY.primaryBold },
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
