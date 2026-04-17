import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
  InteractionManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';

import QuestsScreen from './quests';
import InventoryScreen from './inventory';

import {
  useCharacterStore,
  getLevelTitle,
  getNextEvolutionLevel,
  xpForLevel,
} from '../../src/stores/characterStore';
import { CharacterAvatar } from '../../src/components/character/CharacterAvatar';
import { useProfileStore } from '../../src/stores/profileStore';
import { useAuthStore } from '../../src/stores/authStore';
import { CharacterClass } from '../../src/types/enums';
import { formatNumber } from '../../src/utils/format';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../src/config/theme';
import {
  requestHealthPermission,
  getTodaySteps,
  getAchievedMilestones,
  getHealthDiagLog,
  getStepsSectionHidden,
  setStepsSectionHidden,
  openGoogleFitPlayStore,
  isGoogleFitAppLikelyInstalled,
  type HealthAuthResult,
} from '../../src/services/healthService';
import { claimDailyStepReward } from '../../src/lib/api';
import { speakCharacterLine } from '../../src/services/voiceService';

const CLASS_GRADIENTS: Record<string, string[]> = {
  [CharacterClass.EXPLORER]:  ['#00D68F', '#009B6A'],
  [CharacterClass.FOODIE]:    ['#48DBFB', '#0ABDE3'],
  [CharacterClass.ARTIST]:    ['#F0C040', '#EE9A00'],
  [CharacterClass.SOCIALITE]: ['#7EE8CA', '#2DD4A8'],
};

const STAT_LABELS: { key: string; label: string; icon: string }[] = [
  { key: 'stat_exploration', label: '탐험력', icon: '🧭' },
  { key: 'stat_discovery',   label: '발견력', icon: '🔍' },
  { key: 'stat_knowledge',   label: '지식력', icon: '📚' },
  { key: 'stat_connection',  label: '교류력', icon: '🤝' },
  { key: 'stat_creativity',  label: '창의력', icon: '🎨' },
];

type ProfileTab = 'profile' | 'quests' | 'inventory';

const PROFILE_TABS: { key: ProfileTab; label: string; icon: string }[] = [
  { key: 'profile', label: '프로필', icon: 'person' },
  { key: 'quests', label: '탐험', icon: 'compass' },
  { key: 'inventory', label: '가방', icon: 'bag-handle' },
];

/** App Store Connect Apple ID (eas.json submit.production.ios.ascAppId) — deep link for “update app” from Health hints. */
const IOS_APP_STORE_WHEREHERE = 'https://apps.apple.com/app/id6761450806';

export default function ProfileTabContainer() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  return (
    <View style={styles.container}>
      {/* Top segment bar */}
      <View style={[styles.segmentBar, { paddingTop: insets.top + 8 }]}>
        {PROFILE_TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={(active ? tab.icon : `${tab.icon}-outline`) as any}
                size={18}
                color={active ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tab content */}
      {activeTab === 'profile' && <ProfileContent />}
      {activeTab === 'quests' && <QuestsScreen embedded />}
      {activeTab === 'inventory' && <InventoryScreen embedded />}
    </View>
  );
}

function ProfileContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [todaySteps, setTodaySteps] = useState(0);
  const [healthReady, setHealthReady] = useState(false);
  /** iOS: native HealthKit binary missing vs HK unavailable on device */
  const [healthIssue, setHealthIssue] = useState<'nativeMissing' | 'unavailable' | null>(null);
  const [claimingStep, setClaimingStep] = useState<number | null>(null);
  const [healthDiag, setHealthDiag] = useState('');
  /** Android: Linking probe for Google Fit package (may be false even when installed). */
  const [androidFitProbe, setAndroidFitProbe] = useState<boolean | null>(null);
  const [hideStepsSection, setHideStepsSection] = useState(false);

  const {
    character,
    loadout,
    mood,
    isLoading: characterLoading,
    error: characterError,
    fetchCharacter,
    fetchLoadout,
  } = useCharacterStore();
  const { stats, leaderboard, visitedLocations, myRank, fetchStats, fetchLeaderboard, fetchVisitedLocations } = useProfileStore();
  const { signOut } = useAuthStore();

  useEffect(() => {
    fetchCharacter();
    fetchLoadout();
    fetchStats();
    fetchVisitedLocations();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    void getStepsSectionHidden().then(setHideStepsSection);
  }, []);

  const refreshHealthSteps = useCallback(async (): Promise<HealthAuthResult> => {
    const r = await requestHealthPermission();
    setHealthReady(r.granted);
    setHealthIssue(
      r.nativeMissing ? 'nativeMissing' : r.unavailable ? 'unavailable' : null,
    );
    if (Platform.OS === 'android') {
      setAndroidFitProbe(await isGoogleFitAppLikelyInstalled());
    }
    if (r.granted) {
      const steps = await getTodaySteps();
      setTodaySteps(steps);
    }
    setHealthDiag(getHealthDiagLog());
    return r;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      if (!mounted) return;
      await refreshHealthSteps();
    })();
    return () => {
      mounted = false;
    };
  }, [refreshHealthSteps]);

  // Periodically refresh step count while screen is visible
  useEffect(() => {
    if (!healthReady) return;
    const interval = setInterval(async () => {
      try {
        const steps = await getTodaySteps();
        setTodaySteps(steps);
      } catch { /* ignore */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, [healthReady]);

  useEffect(() => {
    if (character) {
      speakCharacterLine('startup', character.character_type);
    }
  }, [character?.id]);

  const floatY = useSharedValue(0);
  const charScale = useSharedValue(1);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: charScale.value }],
  }));

  const handleCharacterTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    charScale.value = withSequence(
      withSpring(1.15, { damping: 5, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
  }, []);

  const handleSignOut = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await signOut();
      router.replace('/(auth)/welcome');
    } catch {}
  }, []);

  const title = character
    ? getLevelTitle(character.character_type, character.level)
    : '탐험가';
  const gradient = character
    ? CLASS_GRADIENTS[character.character_type] ?? CLASS_GRADIENTS[CharacterClass.EXPLORER]
    : CLASS_GRADIENTS[CharacterClass.EXPLORER];
  const nextEvo = character ? getNextEvolutionLevel(character.level) : null;
  const requiredXp = character ? xpForLevel(character.level) : 500;
  const xpPercent =
    character && requiredXp > 0
      ? Math.min((character.xp / requiredXp) * 100, 100)
      : 0;

  const statValues: Record<string, number> = character
    ? {
        stat_exploration: character.stat_exploration,
        stat_discovery: character.stat_discovery,
        stat_knowledge: character.stat_knowledge,
        stat_connection: character.stat_connection,
        stat_creativity: character.stat_creativity,
      }
    : {
        stat_exploration: 0,
        stat_discovery: 0,
        stat_knowledge: 0,
        stat_connection: 0,
        stat_creativity: 0,
      };
  const maxStat = Math.max(...Object.values(statValues), 1);
  const milestoneList = getAchievedMilestones(todaySteps);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await Promise.all([fetchCharacter(), fetchStats(), fetchLeaderboard(), fetchVisitedLocations()]);
            await refreshHealthSteps();
            setRefreshing(false);
          }}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* 탐험 허브 */}
      <View style={styles.hubSectionTop}>
        <View style={styles.hubTopRow}>
          <Text style={styles.screenTitle}>탐험 허브</Text>
          <Pressable
            style={styles.editBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
          >
            <Ionicons name="settings-outline" size={20} color={COLORS.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.hubGrid}>
          <HubTile
            emoji="🤝"
            label="소셜"
            desc="친구·크루·위치"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/social');
            }}
          />
          <HubTile
            emoji="🌸"
            label="시즌 패스"
            desc="보상 트랙"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/season');
            }}
          />
          <HubTile
            emoji="📔"
            label="탐험 일지"
            desc="AI 일지·공유"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/journal');
            }}
          />
          <HubTile
            emoji="⭐"
            label="프리미엄"
            desc="구독·혜택"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/premium');
            }}
          />
          <HubTile
            emoji="💬"
            label="캐릭터 채팅"
            desc="AI 대화"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/character');
            }}
          />
          <HubTile
            emoji="✨"
            label="이벤트 제안"
            desc="UGC 생성"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/create-event');
            }}
          />
        </View>
      </View>

      {characterLoading && !character && (
        <View style={styles.characterBanner}>
          <ActivityIndicator />
          <Text style={styles.characterBannerText}>캐릭터 정보를 불러오는 중...</Text>
        </View>
      )}

      {!characterLoading && !character && (
        <View style={styles.noCharacterCard}>
          <Text style={styles.noCharacterTitle}>탐험가 프로필이 없어요</Text>
          <Text style={styles.noCharacterDesc}>
            {characterError ?? '온보딩에서 캐릭터를 만들면 아래에 통계와 레벨이 표시됩니다.'}
          </Text>
          <Pressable
            style={styles.primaryCta}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/(auth)/onboarding');
            }}
          >
            <Text style={styles.primaryCtaText}>캐릭터 만들기</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryCta}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              fetchCharacter();
            }}
          >
            <Text style={styles.secondaryCtaText}>다시 불러오기</Text>
          </Pressable>
        </View>
      )}

      {character && (
        <>
      {/* Hero */}
      <LinearGradient colors={[gradient[0] + '30', COLORS.background]} style={[styles.heroSection, { paddingTop: SPACING.lg }]}>
        <View style={styles.heroHeader}>
          <View style={{ width: 40 }} />
          <View style={{ width: 40 }} />
        </View>

        <Animated.View style={[styles.avatarContainer, floatStyle]}>
          <View style={[styles.avatarCircle, { borderColor: gradient[0] }]}>
            <CharacterAvatar
              characterType={character.character_type}
              level={character.level}
              size={92}
              showEvolutionBadge
              loadout={loadout}
              favoriteDistrict={character.favorite_district}
              mood={mood}
              onPress={handleCharacterTap}
              borderColor={gradient[0]}
              backgroundColor={COLORS.surface}
            />
          </View>
          <View style={[styles.levelBadge, { backgroundColor: gradient[0] }]}>
            <Text style={styles.levelBadgeText}>Lv.{character.level}</Text>
          </View>
        </Animated.View>

        <Text style={styles.username}>{character.name}</Text>
        <Text style={[styles.titleText, { color: gradient[0] }]}>{title}</Text>

        {/* XP bar */}
        <View style={styles.xpBar}>
          <View style={styles.xpBarHeader}>
            <Text style={styles.xpLabel}>Lv.{character.level} → Lv.{character.level + 1}</Text>
            <Text style={styles.xpNumbers}>{formatNumber(character.xp)} / {formatNumber(requiredXp)} XP</Text>
          </View>
          <View style={styles.xpBarTrack}>
            <LinearGradient
              colors={gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.xpBarFill, { width: `${xpPercent}%` }]}
            />
          </View>
        </View>

        {nextEvo && (
          <View style={styles.evoPreview}>
            <Ionicons name="sparkles" size={14} color={COLORS.primaryLight} />
            <Text style={styles.evoText}>다음 진화까지 {nextEvo - character.level}레벨!</Text>
          </View>
        )}
      </LinearGradient>

      {/* Activity Stats */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
        {!hideStepsSection ? (
        <View style={styles.stepsCard}>
          <View style={styles.stepsHeader}>
            <Text style={styles.stepsTitle}>오늘의 걸음 수</Text>
            <Text style={styles.stepsValue}>{todaySteps.toLocaleString()} / 10,000</Text>
          </View>
          <View style={styles.stepsTrack}>
            <View style={[styles.stepsFill, { width: `${Math.min(100, (todaySteps / 10000) * 100)}%` }]} />
          </View>
          <View style={styles.stepsMilestones}>
            {[1000, 3000, 5000, 10000].map((m) => (
              <Pressable
                key={m}
                style={[styles.stepChip, todaySteps >= m && styles.stepChipActive]}
                disabled={todaySteps < m || claimingStep === m}
                onPress={async () => {
                  try {
                    setClaimingStep(m);
                    const res = await claimDailyStepReward(m as 1000 | 3000 | 5000 | 10000);
                    if (res.success) {
                      await Promise.all([fetchCharacter(), fetchStats()]);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                  } catch {
                    // ignore
                  } finally {
                    setClaimingStep(null);
                  }
                }}
              >
                <Text style={styles.stepChipText}>{m >= 10000 ? '🏅' : '👟'} {m}</Text>
              </Pressable>
            ))}
          </View>
          {__DEV__ && healthDiag.length > 0 && (
            <View style={styles.stepsHintBlock}>
              <Text style={[styles.stepsHint, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10 }]}>
                {healthDiag}
              </Text>
            </View>
          )}
          {!healthReady && Platform.OS === 'android' && (
            <View style={styles.stepsHintBlock}>
              <Text style={styles.stepsHint}>
                Google Fit 연동이 필요합니다.{'\n'}
                Google Fit 앱이 설치되어 있는지 확인해 주세요.
              </Text>
              {androidFitProbe === false ? (
                <Text style={[styles.stepsHint, { marginTop: 6 }]}>
                  Google Fit 앱을 먼저 설치해 주세요.
                </Text>
              ) : null}
              <View style={styles.stepsHintActions}>
                <Pressable
                  style={styles.stepsHintBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    void openGoogleFitPlayStore();
                  }}
                >
                  <Text style={styles.stepsHintBtnText}>Google Fit 설치하기</Text>
                </Pressable>
                <Pressable
                  style={[styles.stepsHintBtn, styles.stepsHintBtnSecondary]}
                  onPress={() => {
                    void (async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      await refreshHealthSteps();
                    })();
                  }}
                >
                  <Text style={[styles.stepsHintBtnText, styles.stepsHintBtnTextSecondary]}>연동 다시 시도</Text>
                </Pressable>
              </View>
              <Pressable
                style={[styles.stepsHintBtn, styles.stepsHintBtnSkip, { marginTop: SPACING.sm }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void (async () => {
                    await setStepsSectionHidden(true);
                    setHideStepsSection(true);
                  })();
                }}
              >
                <Text style={[styles.stepsHintBtnText, styles.stepsHintBtnTextSecondary]}>건너뛰기</Text>
              </Pressable>
            </View>
          )}
          {!healthReady && Platform.OS === 'ios' && (
            <View style={styles.stepsHintBlock}>
              <Text style={styles.stepsHint}>
                {healthIssue === 'nativeMissing'
                  ? '이 설치본에는 건강(HealthKit) 연동이 들어 있지 않을 수 있어요. 코드 업데이트(OTA)만으로는 걸음 연동이 생기지 않을 수 있습니다. App Store·TestFlight에서 최신 전체 빌드를 설치해 주세요.'
                  : healthIssue === 'unavailable'
                    ? '이 기기에서는 건강(HealthKit)을 사용할 수 없어요.'
                    : '걸음 수는「건강」앱 데이터를 읽습니다. 권한은 보통 설정 → 개인 정보 보호 및 보안 → 건강 → 데이터 접근 및 기기 → WhereHere 에서 켭니다.「설정 → WhereHere」에만 들어가면 건강 메뉴가 없을 수 있어요.'}
              </Text>
              <View style={styles.stepsHintActions}>
                <Pressable
                  style={styles.stepsHintBtn}
                  onPress={() => {
                    void (async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (healthIssue === 'nativeMissing') {
                        Linking.openURL(IOS_APP_STORE_WHEREHERE);
                        return;
                      }
                      const r = await refreshHealthSteps();
                      if (r.granted) return;
                      if (r.nativeMissing) {
                        Alert.alert(
                          '만보기 · 건강',
                          '이 앱 바이너리에 HealthKit 모듈이 없습니다. 앱스토어(또는 TestFlight)에서 WhereHere 최신 버전을 다시 설치해 주세요.',
                          [
                            { text: '닫기', style: 'cancel' },
                            {
                              text: '앱스토어',
                              onPress: () => void Linking.openURL(IOS_APP_STORE_WHEREHERE),
                            },
                          ],
                        );
                        return;
                      }
                      if (r.unavailable) {
                        Alert.alert('안내', '이 기기에서는 건강(HealthKit)을 사용할 수 없습니다.');
                        return;
                      }
                      Alert.alert(
                        '설정에서 걸음 허용',
                        '이미 한 번 거절하면 시스템 팝업이 다시 안 뜰 수 있어요.\n\n설정 → 개인 정보 보호 및 보안 → 건강 → 데이터 접근 및 기기 → WhereHere → 걸음',
                        [
                          { text: '닫기', style: 'cancel' },
                          { text: '앱 설정 열기', onPress: () => void Linking.openSettings() },
                        ],
                      );
                    })();
                  }}
                >
                  <Text style={styles.stepsHintBtnText}>
                    {healthIssue === 'nativeMissing' ? '앱스토어로 이동' : '권한 다시 요청'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.stepsHintBtn, styles.stepsHintBtnSecondary]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert(
                      '건강 권한 (iPhone)',
                      '걸음은「건강」데이터 접근으로 허용합니다.\n\n1) 설정 → 개인 정보 보호 및 보안 → 건강 → 데이터 접근 및 기기 → WhereHere\n2) 여기서 WhereHere 가 안 보이면, 위 경로가 아니라 앱이 HealthKit 을 요청한 빌드가 아닐 수 있습니다. App Store 최신 버전을 확인해 주세요.\n\n앱 알림·위치 등은「설정 → WhereHere」에 있습니다.',
                      [
                        { text: '닫기', style: 'cancel' },
                        { text: '앱 설정 열기', onPress: () => void Linking.openSettings() },
                      ],
                    );
                  }}
                >
                  <Text style={[styles.stepsHintBtnText, styles.stepsHintBtnTextSecondary]}>안내</Text>
                </Pressable>
              </View>
              <Pressable
                style={[styles.stepsHintBtn, styles.stepsHintBtnSkip, { marginTop: SPACING.sm }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void (async () => {
                    await setStepsSectionHidden(true);
                    setHideStepsSection(true);
                  })();
                }}
              >
                <Text style={[styles.stepsHintBtnText, styles.stepsHintBtnTextSecondary]}>건너뛰기</Text>
              </Pressable>
            </View>
          )}
        </View>
        ) : null}

        <View style={styles.statsGrid2x2}>
          <StatCard emoji="🏁" value={`${stats?.events_completed ?? 0}개`} label="총 탐험" />
          <StatCard emoji="🔥" value={`${stats?.login_streak ?? 0}일`} label="연속 기록" />
          <StatCard emoji="🏅" value={`${stats?.badges_count ?? 0}개`} label="수집 배지" />
          <StatCard emoji="📍" value={`${stats?.districts_visited?.length ?? 0}곳`} label="방문 지역" />
        </View>
      </Animated.View>

      {/* Growth Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>성장 능력치</Text>
        <View style={styles.statsBarList}>
          {STAT_LABELS.map(({ key, label, icon }) => {
            const val = statValues[key] ?? 10;
            const pct = (val / maxStat) * 100;
            return (
              <View key={key} style={styles.statRow}>
                <Text style={styles.statIcon}>{icon}</Text>
                <Text style={styles.statLabel}>{label}</Text>
                <View style={styles.statBarTrack}>
                  <LinearGradient
                    colors={gradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.statBarFill, { width: `${pct}%` }]}
                  />
                </View>
                <Text style={styles.statValue}>{val}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Exploration Map */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>나의 탐험 지도</Text>
          <Text style={styles.sectionBadge}>나의 발자취</Text>
        </View>
        <Pressable style={styles.miniMapCard}>
          <View style={styles.miniMap}>
            {visitedLocations.slice(0, 30).map((loc, i) => {
              const nx = ((loc.lng - 126.93) / 0.1) * 100;
              const ny = ((37.59 - loc.lat) / 0.06) * 100;
              const opacity = 0.4 + Math.min(0.6, (30 - i) / 30);
              return (
                <View
                  key={loc.event_id}
                  style={[styles.mapDot, {
                    left: `${Math.min(95, Math.max(5, nx))}%`,
                    top: `${Math.min(90, Math.max(5, ny))}%`,
                    opacity,
                    backgroundColor: gradient[0],
                  }]}
                />
              );
            })}
            <View style={styles.miniMapOverlay}>
              <Ionicons name="map-outline" size={20} color={COLORS.textMuted} />
              <Text style={styles.miniMapText}>{visitedLocations.length}곳 방문</Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Leaderboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>리더보드</Text>

        {myRank != null && (
          <View style={styles.myRankCard}>
            <Text style={styles.myRankLabel}>내 순위</Text>
            <Text style={styles.myRankValue}>#{myRank}</Text>
          </View>
        )}

        {leaderboard.slice(0, 10).map((entry, i) => (
          <Animated.View key={entry.user_id} entering={FadeInDown.delay(i * 40)}>
            <Pressable
              style={styles.lbRow}
              onPress={() => router.push(`/user/${entry.user_id}` as any)}
            >
              <Text style={[styles.lbRank, i < 3 && styles.lbRankTop]}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${entry.rank}`}
              </Text>
              <View style={styles.lbAvatar}>
                <Text style={styles.lbAvatarText}>{(entry.username ?? '?')[0]}</Text>
              </View>
              <View style={styles.lbInfo}>
                <Text style={styles.lbName}>{entry.username ?? '탐험가'}</Text>
              </View>
              <Text style={styles.lbXp}>{formatNumber(entry.weekly_xp)} XP</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

        </>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>설정</Text>
        <View style={styles.settingsGroup}>
          <SettingsRow icon="notifications-outline" label="알림 설정" onPress={() => router.push('/settings')} />
          <SettingsRow icon="location-outline" label="위치 권한 관리" onPress={() => router.push('/settings')} />
          <SettingsRow
            icon="sparkles-outline"
            label="성격 유형 (MBTI)"
            onPress={() =>
              router.push({
                pathname: '/(auth)/mbti-select',
                params: { from: 'settings' },
              } as any)
            }
          />
          <SettingsRow icon="information-circle-outline" label="앱 버전" value="1.0.0" />
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function HubTile({
  emoji,
  label,
  desc,
  onPress,
}: {
  emoji: string;
  label: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.hubTile, pressed && styles.hubTilePressed]} onPress={onPress}>
      <Text style={styles.hubTileEmoji}>{emoji}</Text>
      <Text style={styles.hubTileLabel}>{label}</Text>
      <Text style={styles.hubTileDesc} numberOfLines={1}>{desc}</Text>
    </Pressable>
  );
}

function StatCard({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.stat2x2Card}>
      <Text style={styles.stat2x2Emoji}>{emoji}</Text>
      <Text style={styles.stat2x2Value}>{value}</Text>
      <Text style={styles.stat2x2Label}>{label}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, value, onPress }: {
  icon: string; label: string; value?: string; onPress?: () => void;
}) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon as any} size={18} color={COLORS.textSecondary} />
      <Text style={styles.settingsLabel}>{label}</Text>
      <View style={styles.settingsRight}>
        {value && <Text style={styles.settingsValue}>{value}</Text>}
        {onPress && <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  segmentBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceHighlight,
    gap: SPACING.sm,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
  },
  segmentItemActive: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  segmentLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textMuted,
  },
  segmentLabelActive: {
    color: COLORS.primary,
  },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  loadingEmoji: { fontSize: 64, marginBottom: SPACING.lg },
  loadingText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },

  hubSectionTop: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  hubTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  screenTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  characterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  characterBannerText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  noCharacterCard: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    padding: SPACING.xl,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
  },
  noCharacterTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  noCharacterDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  primaryCta: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  primaryCtaText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
  },
  secondaryCta: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  secondaryCtaText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primaryLight,
    fontWeight: FONT_WEIGHT.semibold,
  },

  heroSection: { paddingBottom: SPACING.xl, alignItems: 'center' },
  heroHeader: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm,
  },
  editBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(15,19,34,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarContainer: { marginBottom: SPACING.md, position: 'relative' },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, ...SHADOWS.lg,
  },
  levelBadge: {
    position: 'absolute', bottom: -4, right: -4,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  levelBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  username: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 2 },
  titleText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginBottom: SPACING.lg },

  xpBar: { width: '100%', paddingHorizontal: SPACING.xl },
  xpBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  xpLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  xpNumbers: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  xpBarTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceHighlight, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 4 },
  evoPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md,
    backgroundColor: COLORS.surfaceLight, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm,
  },
  evoText: { fontSize: FONT_SIZE.xs, color: COLORS.primaryLight, fontWeight: FONT_WEIGHT.medium },

  section: { paddingHorizontal: SPACING.xl, marginTop: SPACING.xxl },
  stepsCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  stepsTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  stepsValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  stepsTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 999,
    overflow: 'hidden',
  },
  stepsFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
  stepsMilestones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  stepChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepChipActive: {
    backgroundColor: `${COLORS.primary}22`,
    borderColor: `${COLORS.primary}66`,
  },
  stepChipText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  stepsHintBlock: { marginTop: SPACING.sm },
  stepsHint: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, lineHeight: 18 },
  stepsHintActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  stepsHintBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  stepsHintBtnSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepsHintBtnSkip: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
    paddingVertical: SPACING.xs,
  },
  stepsHintBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: '#fff' },
  stepsHintBtnTextSecondary: { color: COLORS.textPrimary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING.lg },
  sectionBadge: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: COLORS.primaryLight,
    backgroundColor: COLORS.primary + '20', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm,
  },

  hubSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: -SPACING.md,
    marginBottom: SPACING.lg,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  hubTile: {
    width: '47%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
  },
  hubTilePressed: { opacity: 0.85 },
  hubTileEmoji: { fontSize: 22, marginBottom: 4 },
  hubTileLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  hubTileDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },

  statsGrid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, paddingHorizontal: SPACING.xl, marginTop: SPACING.lg },
  stat2x2Card: {
    width: '47%', backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, alignItems: 'center', gap: 4,
  },
  stat2x2Emoji: { fontSize: 24 },
  stat2x2Value: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  stat2x2Label: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  statsBarList: { gap: SPACING.md },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statIcon: { fontSize: 18, width: 24 },
  statLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, width: 48 },
  statBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceHighlight, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 4 },
  statValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, width: 28, textAlign: 'right' },

  miniMapCard: {
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden', height: 160,
  },
  miniMap: { flex: 1, position: 'relative' },
  mapDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  miniMapOverlay: {
    position: 'absolute', bottom: SPACING.md, right: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(10,14,26,0.7)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm,
  },
  miniMapText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },

  myRankCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '20', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  myRankLabel: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textSecondary },
  myRankValue: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.primary },
  lbRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceHighlight,
  },
  lbRank: { width: 28, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textSecondary, textAlign: 'center' },
  lbRankTop: { fontSize: FONT_SIZE.lg },
  lbAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center', justifyContent: 'center',
  },
  lbAvatarText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryLight },
  lbInfo: { flex: 1 },
  lbName: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textPrimary },
  lbXp: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.warning },

  settingsGroup: {
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md, overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceHighlight,
  },
  settingsLabel: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  settingsRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  settingsValue: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.lg, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight, marginTop: SPACING.md,
  },
  logoutText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, color: COLORS.error },
});
