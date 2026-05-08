import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useNotificationStore } from '../../src/stores/notificationStore';
import { MANGA, MANGA_BORDER, MANGA_RADIUS, FONT_FAMILY, SPACING } from '../../src/config/theme';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const notifPermission = useNotificationStore((s) => s.notifPermission);
  const prefs = useNotificationStore((s) => s.prefs);
  const backgroundLocationEnabled = useNotificationStore((s) => s.backgroundLocationEnabled);
  const powerSaveMode = useNotificationStore((s) => s.powerSaveMode);
  const updatePref = useNotificationStore((s) => s.updatePref);
  const setBackgroundLocation = useNotificationStore((s) => s.setBackgroundLocation);
  const setPowerSaveMode = useNotificationStore((s) => s.setPowerSaveMode);
  const permissionLabel =
    notifPermission === 'granted' ? '허용됨' : notifPermission === 'denied' ? '거부됨' : '확인 전';

  const toggle = useCallback((fn: (value: boolean) => void, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn(value);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={MANGA.ink} />
        </Pressable>
        <Text style={styles.headerTitle} allowFontScaling={false}>알림 설정</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <SettingRow title="푸시 권한" desc={`현재 상태: ${permissionLabel}`} value={notifPermission === 'granted'} onValueChange={() => {}} disabled />
        <SettingRow title="근처 이벤트" desc="100m 안쪽 탐험지를 알려줘요" value={prefs.nearbyEvents} onValueChange={(v) => toggle((next) => updatePref('nearbyEvents', next), v)} />
        <SettingRow title="친구 활동" desc="친구의 탐험 소식을 받아요" value={prefs.friendActivity} onValueChange={(v) => toggle((next) => updatePref('friendActivity', next), v)} />
        <SettingRow title="백그라운드 위치" desc="근처 탐험지와 친구 지도에 사용돼요" value={backgroundLocationEnabled} onValueChange={(v) => toggle(setBackgroundLocation, v)} />
        <SettingRow title="절전 모드" desc="위치 갱신을 줄여 배터리를 아껴요" value={powerSaveMode} onValueChange={(v) => toggle(setPowerSaveMode, v)} />
      </ScrollView>
    </View>
  );
}

function SettingRow({
  title,
  desc,
  value,
  onValueChange,
  disabled = false,
}: {
  title: string;
  desc: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} allowFontScaling={false}>{title}</Text>
        <Text style={styles.rowDesc} allowFontScaling={false}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: 'rgba(26,22,18,0.22)', true: MANGA.g }}
        thumbColor={MANGA.paper}
      />
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
  row: {
    minHeight: 82,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
    backgroundColor: MANGA.paper,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { color: MANGA.ink, fontSize: 15, fontFamily: FONT_FAMILY.primaryBold },
  rowDesc: { color: MANGA.ink, opacity: 0.6, fontSize: 12, fontFamily: FONT_FAMILY.primary, marginTop: 4 },
});
