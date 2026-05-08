import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { endGroupCall, startGroupCall } from '../../../src/lib/api';
import { MANGA, MANGA_BORDER, MANGA_RADIUS, FONT_FAMILY, SPACING } from '../../../src/config/theme';
import { MangaAvatar } from '../../../src/components/ui';

export default function GroupCallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ room_id: string }>();
  const roomId = params.room_id;
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const names = useMemo(() => ['나', '친구', '크루', '탐험'], []);

  const start = useCallback(async () => {
    if (!roomId || busy) return;
    setBusy(true);
    try {
      await startGroupCall(roomId);
      setActive(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '영상 방을 열지 못했어요.');
    } finally {
      setBusy(false);
    }
  }, [busy, roomId]);

  const end = useCallback(async () => {
    if (!roomId || busy) return;
    setBusy(true);
    try {
      await endGroupCall(roomId);
      setActive(false);
      router.back();
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '영상 방을 종료하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }, [busy, roomId, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={MANGA.ink} />
        </Pressable>
        <Text style={styles.headerTitle} allowFontScaling={false}>단체 영상</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.stage}>
        {names.map((name, index) => (
          <View key={name} style={styles.tile}>
            <MangaAvatar name={name} size={64} />
            <Text style={styles.tileName} allowFontScaling={false}>{index === 0 ? '나' : name}</Text>
            <Text style={styles.tileState} allowFontScaling={false}>마이크 꺼짐</Text>
          </View>
        ))}
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle} allowFontScaling={false}>그룹 통화 방</Text>
        <Text style={styles.noticeText} allowFontScaling={false}>
          현재 버전은 방 열기와 참여 상태 공유까지 지원해요. 실제 영상 연결은 네이티브 빌드가 필요한 단계라 다음 빌드에서 이어집니다.
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.controlButton}>
          <Ionicons name="mic-off" size={22} color={MANGA.ink} />
          <Text style={styles.controlText} allowFontScaling={false}>마이크</Text>
        </Pressable>
        <Pressable style={styles.controlButton}>
          <Ionicons name="videocam-off" size={22} color={MANGA.ink} />
          <Text style={styles.controlText} allowFontScaling={false}>카메라</Text>
        </Pressable>
        <Pressable
          onPress={active ? end : start}
          disabled={busy}
          style={[styles.endButton, !active && styles.startButton, busy && styles.disabled]}
        >
          <Ionicons name={active ? 'call' : 'videocam'} size={22} color={active ? MANGA.paper : MANGA.ink} />
          <Text style={[styles.endText, !active && styles.startText]} allowFontScaling={false}>
            {active ? '종료' : '다시 열기'}
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
  stage: {
    flex: 1,
    padding: SPACING.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  tile: {
    width: '47%',
    minHeight: 180,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
    backgroundColor: MANGA.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  tileName: { color: MANGA.ink, fontSize: 15, fontFamily: FONT_FAMILY.primaryBold },
  tileState: { color: MANGA.ink, opacity: 0.55, fontSize: 12, fontFamily: FONT_FAMILY.primary },
  notice: {
    marginHorizontal: SPACING.lg,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
    backgroundColor: MANGA.y,
    padding: SPACING.md,
  },
  noticeTitle: { color: MANGA.ink, fontSize: 15, fontFamily: FONT_FAMILY.primaryBold },
  noticeText: { color: MANGA.ink, opacity: 0.72, fontSize: 12, fontFamily: FONT_FAMILY.primary, lineHeight: 18, marginTop: 4 },
  controls: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  controlButton: {
    flex: 1,
    height: 54,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.card,
    backgroundColor: MANGA.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: { color: MANGA.ink, fontSize: 11, fontFamily: FONT_FAMILY.primaryBold, marginTop: 2 },
  endButton: {
    flex: 1,
    height: 54,
    borderWidth: 2,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.card,
    backgroundColor: MANGA.r,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: { backgroundColor: MANGA.g },
  disabled: { opacity: 0.55 },
  endText: { color: MANGA.paper, fontSize: 11, fontFamily: FONT_FAMILY.primaryBold, marginTop: 2 },
  startText: { color: MANGA.ink },
});
