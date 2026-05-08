/**
 * 프로필 탭 — Phase 6 (Spec §5).
 *
 * 만화 톤 종이 배경 위 7 섹션:
 *   1. 헤더 ("나의 탐험" + 설정 톱니)
 *   2. 캐릭터 미니 카드 (XP 진행 + 캐릭터 화면 진입)
 *   3. 장소 메모리 폴라로이드 가로 스크롤
 *   4. 탐험 일기장 (날짜 스탬프 + 노트 카드 + 공개범위 뱃지)
 *   5. 탐험 요약 (4 KPI)
 *   6. AI 탐험 노트 (placeholder — Phase 6.5 에서 Edge Function 으로 채움)
 *   7. 탐험 허브 (캐릭터 / 시즌 / 일지 / 프리미엄 / 친구 등 진입 타일)
 *   8. 설정 + 로그아웃
 *
 * 기존 캐릭터 / 시즌 / 일지 / 프리미엄 화면은 그대로 살아 있고, 허브 타일에서 진입.
 * 캐릭터 탭은 5탭에서 빠졌지만 라우트는 보존되어 router.push('/(tabs)/character') 로 진입 가능.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useCharacterStore } from '../../src/stores/characterStore';
import { useAuthStore } from '../../src/stores/authStore';
import {
  listMyDiaries,
  listMyPlaceMemories,
  getExploreSummary,
  type Diary,
  type PlaceMemory,
  type ExploreSummary,
} from '../../src/lib/api';
import { MANGA, MANGA_BORDER, MANGA_RADIUS, FONT_FAMILY } from '../../src/config/theme';
import { InkCard, InkButton, MangaAvatar, showToast } from '../../src/components/ui';
import {
  PlaceMemorySection,
  DiarySection,
  ExploreSummarySection,
  AINoteSection,
  ExploreHubSection,
  type HubTile,
} from '../../src/components/profile/MangaProfileSections';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const character = useCharacterStore((s) => s.character);
  const { signOut } = useAuthStore();

  const [memories, setMemories] = useState<PlaceMemory[]>([]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [summary, setSummary] = useState<ExploreSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [m, d, s] = await Promise.all([
        listMyPlaceMemories(20).catch(() => []),
        listMyDiaries(20).catch(() => []),
        getExploreSummary().catch(() => null),
      ]);
      setMemories(m);
      setDiaries(d);
      setSummary(s);
    } catch {
      /* silent — partial loads OK */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ── 허브 타일 (캐릭터 진입 포함) ──
  const hubTiles: HubTile[] = useMemo(
    () => [
      {
        id: 'character',
        emoji: '✨',
        title: '캐릭터',
        subtitle: '꾸미기·도감·룩북',
        background: MANGA.y,
        onPress: () => router.push('/(tabs)/character' as never),
      },
      {
        id: 'season',
        emoji: '🌸',
        title: '시즌 패스',
        subtitle: '보상 트랙',
        background: '#FFE0E0',
        onPress: () => router.push('/season' as never),
      },
      {
        id: 'journal',
        emoji: '📔',
        title: '탐험 일지',
        subtitle: 'AI 일지 모음',
        background: MANGA.paper,
        onPress: () => router.push('/journal' as never),
      },
      {
        id: 'premium',
        emoji: '💎',
        title: '프리미엄',
        subtitle: '구독·혜택',
        background: '#E0F4FF',
        onPress: () => router.push('/premium' as never),
      },
      {
        id: 'social',
        emoji: '🤝',
        title: '친구·크루',
        subtitle: '소셜 허브',
        background: '#E8FFE0',
        onPress: () => router.push('/(tabs)/social' as never),
      },
      {
        id: 'create-event',
        emoji: '✨',
        title: '이벤트 제안',
        subtitle: 'UGC 생성',
        background: '#F0E8FF',
        onPress: () => router.push('/create-event' as never),
      },
    ],
    [router],
  );

  const onCreateMemory = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    router.push('/memory/create' as never);
  }, [router]);

  const onCreateDiary = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    router.push('/diary/create' as never);
  }, [router]);

  const onLogout = useCallback(() => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          showToast('로그아웃되었어요', { tone: 'paper' });
        },
      },
    ]);
  }, [signOut]);

  // 캐릭터 정보
  const charLevel = character?.level ?? 1;
  const charType = character?.character_type ?? 'explorer';
  const charXp = character?.xp ?? 0;
  const xpForNext = (charLevel + 1) * 500;
  const xpProgress = Math.min(charXp / xpForNext, 1);
  const charNameKR =
    charType === 'explorer'  ? '도담' :
    charType === 'foodie'    ? '나래' :
    charType === 'artist'    ? '하람' :
    charType === 'socialite' ? '별찌' : '탐험가';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={MANGA.ink}
          colors={[MANGA.r, MANGA.b]}
        />
      }
    >
      {/* ── 헤더 ── */}
      <View style={styles.headerRow}>
        <Text style={styles.h1} allowFontScaling={false}>나의 탐험</Text>
        <Pressable
          onPress={() => router.push('/settings' as never)}
          style={({ pressed }) => [
            styles.settingsBtn,
            pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] },
          ]}
        >
          <View style={[styles.settingsBtnShadow, { top: 2, left: 2 }]} />
          <View style={styles.settingsBtnBody}>
            <Ionicons name="settings-outline" size={20} color={MANGA.paper} />
          </View>
        </Pressable>
      </View>

      {/* ── 캐릭터 미니 카드 ── */}
      <Pressable
        onPress={() => router.push('/(tabs)/character' as never)}
        style={({ pressed }) => [
          { marginHorizontal: 16, marginTop: 12, position: 'relative' },
          pressed && { transform: [{ translateX: 3 }, { translateY: 3 }] },
        ]}
      >
        <View style={[styles.charShadow, { top: 3, left: 3 }]} />
        <View style={styles.charBody}>
          <MangaAvatar name={charNameKR} size={56} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.charLevel} allowFontScaling={false}>Lv.{charLevel}</Text>
              <Text style={styles.charType} allowFontScaling={false}>{charNameKR}</Text>
            </View>
            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, { width: `${Math.round(xpProgress * 100)}%` }]} />
            </View>
            <Text style={styles.xpText} allowFontScaling={false}>
              {charXp.toLocaleString()} / {xpForNext.toLocaleString()} XP
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={MANGA.ink} />
        </View>
      </Pressable>

      {/* 1. 장소 메모리 */}
      <PlaceMemorySection
        memories={memories}
        onAddPress={onCreateMemory}
        onMemoryPress={(m) => showToast(`"${m.title}" 메모리`, { tone: 'paper' })}
      />

      {/* 2. 탐험 일기장 */}
      <DiarySection
        diaries={diaries}
        onCreatePress={onCreateDiary}
        onDiaryPress={(d) => showToast(`"${d.title}"`, { tone: 'paper' })}
        onLikePress={(d) => showToast(`❤ ${d.title}`, { tone: 'paper' })}
        onSharePress={(d) => showToast(`📤 공유: ${d.title}`, { tone: 'paper' })}
        onMakePublic={(d) => showToast(`🌍 공개로 전환: ${d.title}`, { tone: 'success' })}
      />

      {/* 3. 탐험 요약 */}
      <ExploreSummarySection summary={summary} />

      {/* 4. AI 탐험 노트 */}
      <AINoteSection onPress={() => router.push('/journal' as never)} />

      {/* 5. 탐험 허브 */}
      <ExploreHubSection tiles={hubTiles} />

      {/* 6. 설정 리스트 */}
      <InkCard
        radius="cardLg"
        shadow="md"
        pad={{ v: 8, h: 4 }}
        style={{ marginHorizontal: 16, marginTop: 14 }}
      >
        <SettingsRow icon="notifications-outline" label="알림 설정" onPress={() => router.push('/settings' as never)} />
        <SettingsRow icon="location-outline" label="위치 권한 관리" onPress={() => router.push('/settings' as never)} />
        <SettingsRow icon="sparkles-outline" label="성격 유형 (MBTI)" onPress={() => router.push('/(auth)/mbti-select' as never)} />
        <SettingsRow icon="information-circle-outline" label="앱 버전" trailing="1.2.0" />
      </InkCard>

      {/* 7. 로그아웃 */}
      <View style={{ marginHorizontal: 16, marginTop: 14, alignItems: 'stretch' }}>
        <InkButton
          variant="paper"
          label="로그아웃"
          labelColor={MANGA.r}
          onPress={onLogout}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

function SettingsRow({
  icon,
  label,
  trailing,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  trailing?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
          onPress();
        }
      }}
      style={({ pressed }) => [
        styles.settingsRow,
        pressed && onPress ? { backgroundColor: 'rgba(26,22,18,0.04)' } : null,
      ]}
    >
      <Ionicons name={icon} size={18} color={MANGA.ink} />
      <Text style={styles.settingsLabel} allowFontScaling={false}>{label}</Text>
      <View style={{ flex: 1 }} />
      {trailing ? (
        <Text style={styles.settingsTrailing} allowFontScaling={false}>{trailing}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={MANGA.ink} style={{ opacity: 0.4 }} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MANGA.paper2,
  },
  content: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  h1: {
    fontFamily: FONT_FAMILY.display,
    fontSize: 30,
    color: MANGA.ink,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  settingsBtn: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  settingsBtnShadow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MANGA.ink,
  },
  settingsBtnBody: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MANGA.b,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 캐릭터 카드
  charShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MANGA.ink,
    borderRadius: MANGA_RADIUS.cardLg,
  },
  charBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: MANGA.paper,
    borderRadius: MANGA_RADIUS.cardLg,
    borderWidth: MANGA_BORDER.width,
    borderColor: MANGA_BORDER.color,
    padding: 14,
  },
  charLevel: {
    color: MANGA.ink,
    fontSize: 22,
    fontFamily: FONT_FAMILY.display,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  charType: {
    color: MANGA.ink,
    fontSize: 16,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.3,
  },
  xpBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(26,22,18,0.1)',
    borderWidth: 1.5,
    borderColor: MANGA.ink,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: MANGA.g,
  },
  xpText: {
    color: MANGA.ink,
    opacity: 0.65,
    fontSize: 11,
    fontFamily: FONT_FAMILY.mono,
  },
  // settings row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  settingsLabel: {
    color: MANGA.ink,
    fontSize: 14,
    fontFamily: FONT_FAMILY.primaryBold,
    letterSpacing: -0.2,
  },
  settingsTrailing: {
    color: MANGA.ink,
    opacity: 0.5,
    fontSize: 12,
    fontFamily: FONT_FAMILY.mono,
  },
});
