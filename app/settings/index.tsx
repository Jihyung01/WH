import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Linking, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '../../src/stores/authStore';
import { useNotificationStore, type NotificationPrefs } from '../../src/stores/notificationStore';
import { notificationService } from '../../src/services/notificationService';
import { backgroundLocationService } from '../../src/services/backgroundLocation';
import { useTheme, useThemeStore } from '../../src/providers/ThemeProvider';
import { PressableScale } from '../../src/components/ui';
import { BRAND, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS, A11Y } from '../../src/config/theme';
import type { ColorMode } from '../../src/config/theme';

const NOTIF_ROWS: { key: keyof NotificationPrefs; label: string; desc: string; icon: string }[] = [
  { key: 'nearbyEvents', label: '주변 이벤트 알림', desc: '근처 이벤트 발견 시 알림', icon: 'location' },
  { key: 'dailyReminder', label: '일일 리마인더', desc: '매일 오후 2시 탐험 알림', icon: 'alarm' },
  { key: 'streakWarning', label: '연속 탐험 경고', desc: '연속 기록 유지 알림', icon: 'flame' },
  { key: 'seasonEvents', label: '시즌 이벤트', desc: '새로운 시즌 콘텐츠 알림', icon: 'leaf' },
  { key: 'friendActivity', label: '친구 활동', desc: '친구 탐험 소식', icon: 'people' },
];

const THEME_OPTIONS: { value: ColorMode | 'system'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: '시스템 설정', icon: 'phone-portrait-outline' },
  { value: 'light', label: '라이트', icon: 'sunny-outline' },
  { value: 'dark', label: '다크', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuthStore();
  const { colors, isDark } = useTheme();
  const themeOverride = useThemeStore((s) => s.override);
  const setThemeOverride = useThemeStore((s) => s.setOverride);
  const {
    prefs, notifPermission, backgroundLocationEnabled, powerSaveMode,
    updatePref, setBackgroundLocation, setPowerSaveMode, loadPrefs,
  } = useNotificationStore();

  const [language, setLanguage] = useState<'ko' | 'en'>('ko');
  const [bgPermGranted, setBgPermGranted] = useState(false);

  useEffect(() => {
    loadPrefs();
    backgroundLocationService.hasBackgroundPermission().then(setBgPermGranted);
  }, []);

  const handleNotifToggle = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePref(key, !value);

    if (key === 'dailyReminder') {
      if (!value) notificationService.scheduleDailyReminder();
      else notificationService.cancelDailyReminder();
    }
    if (key === 'streakWarning') {
      if (value) notificationService.cancelStreakWarning();
    }
  }, []);

  const handleBgLocationToggle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (backgroundLocationEnabled) {
      await backgroundLocationService.stop();
      setBackgroundLocation(false);
      return;
    }

    const hasPerm = await backgroundLocationService.hasBackgroundPermission();
    if (!hasPerm) {
      Alert.alert(
        '백그라운드 위치 권한',
        '탐험 중 주변 이벤트를 알려드릴까요?\n\n위치 "항상 허용"이 필요해요. 배터리 사용량은 최소화됩니다.',
        [
          { text: '나중에', style: 'cancel' },
          {
            text: '허용하기',
            onPress: async () => {
              const granted = await backgroundLocationService.requestBackgroundPermission();
              setBgPermGranted(granted);
              if (granted) {
                await backgroundLocationService.start();
                setBackgroundLocation(true);
              }
            },
          },
        ],
      );
      return;
    }

    await backgroundLocationService.start();
    setBackgroundLocation(true);
  }, [backgroundLocationEnabled]);

  const handlePowerSaveToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !powerSaveMode;
    setPowerSaveMode(next);

    if (next && backgroundLocationEnabled) {
      backgroundLocationService.stop();
      setBackgroundLocation(false);
    }
  }, [powerSaveMode, backgroundLocationEnabled]);

  const handleSignOut = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: async () => { try { await signOut(); } catch {} } },
    ]);
  };

  const switchTrack = { false: colors.surfaceHighlight, true: BRAND.primary };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <PressableScale
          style={[styles.backBtn, { backgroundColor: colors.surfaceLight }]}
          onPress={() => router.back()}
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </PressableScale>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Notifications ── */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>알림</Text>
        {notifPermission === 'denied' && (
          <PressableScale
            style={[styles.permBanner, { backgroundColor: colors.warning + '15' }]}
            onPress={() => Linking.openSettings()}
            accessibilityLabel="알림 권한 설정 열기"
          >
            <Ionicons name="alert-circle" size={18} color={colors.warning} />
            <Text style={[styles.permBannerText, { color: colors.warning }]}>
              알림 권한이 꺼져 있어요. 탭하여 설정을 열어주세요.
            </Text>
          </PressableScale>
        )}
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {NOTIF_ROWS.map((row) => (
            <View
              key={row.key}
              style={[styles.row, { borderBottomColor: colors.surfaceHighlight }]}
            >
              <Ionicons name={`${row.icon}-outline` as any} size={20} color={colors.textSecondary} />
              <View style={styles.rowTextCol}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{row.label}</Text>
                <Text style={[styles.rowDesc, { color: colors.textMuted }]}>{row.desc}</Text>
              </View>
              <Switch
                value={prefs[row.key]}
                onValueChange={() => handleNotifToggle(row.key, prefs[row.key])}
                trackColor={switchTrack}
                thumbColor="#FFFFFF"
                accessibilityLabel={`${row.label} ${prefs[row.key] ? '끄기' : '켜기'}`}
              />
            </View>
          ))}
        </View>

        {/* ── Location ── */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>위치</Text>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: colors.surfaceHighlight }]}>
            <Ionicons name="navigate-outline" size={20} color={colors.textSecondary} />
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>백그라운드 위치 감지</Text>
              <Text style={[styles.rowDesc, { color: colors.textMuted }]}>앱 미사용 중에도 주변 이벤트 알림</Text>
            </View>
            <Switch
              value={backgroundLocationEnabled}
              onValueChange={handleBgLocationToggle}
              trackColor={switchTrack}
              thumbColor="#FFFFFF"
              disabled={powerSaveMode}
              accessibilityLabel={`백그라운드 위치 ${backgroundLocationEnabled ? '끄기' : '켜기'}`}
            />
          </View>
          {backgroundLocationEnabled && (
            <View style={[styles.batteryWarning, { backgroundColor: colors.warning + '08' }]}>
              <Ionicons name="battery-half-outline" size={14} color={colors.warning} />
              <Text style={[styles.batteryText, { color: colors.textMuted }]}>
                배터리 사용량이 약간 증가할 수 있어요
              </Text>
            </View>
          )}
          <View style={[styles.row, { borderBottomColor: colors.surfaceHighlight }]}>
            <Ionicons name="flash-outline" size={20} color={colors.textSecondary} />
            <View style={styles.rowTextCol}>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>절전 모드</Text>
              <Text style={[styles.rowDesc, { color: colors.textMuted }]}>백그라운드 위치 추적 중지, 배터리 절약</Text>
            </View>
            <Switch
              value={powerSaveMode}
              onValueChange={handlePowerSaveToggle}
              trackColor={{ false: colors.surfaceHighlight, true: BRAND.gold }}
              thumbColor="#FFFFFF"
              accessibilityLabel={`절전 모드 ${powerSaveMode ? '끄기' : '켜기'}`}
            />
          </View>
          <Pressable
            style={[styles.row, { borderBottomColor: 'transparent' }]}
            onPress={() => Linking.openSettings()}
            accessibilityLabel="시스템 위치 설정 열기"
          >
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1, color: colors.textPrimary }]}>시스템 위치 설정 열기</Text>
            <Ionicons name="open-outline" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* ── Appearance ── */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>화면</Text>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: colors.surfaceHighlight }]}>
            <Ionicons name="color-palette-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1, color: colors.textPrimary }]}>테마</Text>
          </View>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const isActive = themeOverride === opt.value;
              return (
                <PressableScale
                  key={opt.value}
                  style={[
                    styles.themeOption,
                    { borderColor: isActive ? BRAND.primary : colors.border },
                    isActive && { backgroundColor: BRAND.primary + '18' },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setThemeOverride(opt.value);
                  }}
                  accessibilityLabel={`테마를 ${opt.label}(으)로 변경`}
                  accessibilityRole="radio"
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={isActive ? BRAND.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isActive ? BRAND.primary : colors.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          <Pressable
            style={[styles.row, { borderBottomColor: 'transparent' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLanguage((l) => (l === 'ko' ? 'en' : 'ko'));
            }}
            accessibilityLabel="언어 설정 변경"
          >
            <Ionicons name="language-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1, color: colors.textPrimary }]}>언어 설정</Text>
            <Text style={[styles.rowValue, { color: colors.textMuted }]}>
              {language === 'ko' ? '한국어' : 'English'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* ── Info ── */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>정보</Text>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.row, { borderBottomColor: colors.surfaceHighlight }]}
            onPress={() => {}}
            accessibilityLabel="개인정보 처리방침"
          >
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1, color: colors.textPrimary }]}>개인정보 처리방침</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable
            style={[styles.row, { borderBottomColor: colors.surfaceHighlight }]}
            onPress={() => {}}
            accessibilityLabel="이용약관"
          >
            <Ionicons name="reader-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1, color: colors.textPrimary }]}>이용약관</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
          <View style={[styles.row, { borderBottomColor: 'transparent' }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1, color: colors.textPrimary }]}>앱 버전</Text>
            <Text style={[styles.rowValue, { color: colors.textMuted }]}>1.0.0</Text>
          </View>
        </View>

        {/* ── Account ── */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>계정</Text>
        <PressableScale
          style={[styles.logoutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleSignOut}
          accessibilityLabel="로그아웃"
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>로그아웃</Text>
        </PressableScale>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  backBtn: {
    width: A11Y.minTouchTarget,
    height: A11Y.minTouchTarget,
    borderRadius: A11Y.minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  scroll: { flex: 1, paddingHorizontal: SPACING.xl },

  groupLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.xs,
  },
  group: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    minHeight: A11Y.minTouchTarget,
  },
  rowTextCol: { flex: 1 },
  rowLabel: { fontSize: FONT_SIZE.md },
  rowDesc: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  rowValue: { fontSize: FONT_SIZE.sm, marginRight: SPACING.xs },

  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  permBannerText: { fontSize: FONT_SIZE.sm, flex: 1 },

  batteryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  batteryText: { fontSize: FONT_SIZE.xs },

  themeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
  },
  themeLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
