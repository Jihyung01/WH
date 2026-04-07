import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, SlideInRight } from 'react-native-reanimated';

import {
  generateUGCEvent,
  saveUGCEvent,
  getCommunityTermsStatus,
  acceptCommunityTerms,
  COMMUNITY_TERMS_VERSION,
} from '../src/lib/api';
import type { UGCSuggestedEvent } from '../src/lib/api';
import { validateUGCText } from '../src/utils/contentModeration';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOWS,
  BRAND,
} from '../src/config/theme';

const TOTAL_STEPS = 4;

const CATEGORIES = [
  { key: 'exploration', label: '탐험', icon: 'compass-outline' as const },
  { key: 'photo', label: '사진', icon: 'camera-outline' as const },
  { key: 'quiz', label: '퀴즈', icon: 'help-circle-outline' as const },
  { key: 'etc', label: '기타', icon: 'ellipsis-horizontal-outline' as const },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i + 1 <= current && styles.stepDotActive,
            i + 1 === current && styles.stepDotCurrent,
          ]}
        />
      ))}
      <Text style={styles.stepLabel}>{current}/{TOTAL_STEPS}</Text>
    </View>
  );
}

export default function CreateEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState(1);

  // Step 1: Location
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Step 2: Details
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  // Step 3: AI Generation + Review
  const [generating, setGenerating] = useState(false);
  const [suggested, setSuggested] = useState<UGCSuggestedEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNarrative, setEditNarrative] = useState('');
  const [editDifficulty, setEditDifficulty] = useState(2);
  const [editRewardXp, setEditRewardXp] = useState(150);

  // Step 4: Saving
  const [saving, setSaving] = useState(false);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);

  /** App Store UGC: must accept community terms before creating content */
  const [ugcGate, setUgcGate] = useState<'loading' | 'need_terms' | 'ok'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await getCommunityTermsStatus();
        if (cancelled) return;
        const ok =
          status.accepted && status.version === COMMUNITY_TERMS_VERSION;
        setUgcGate(ok ? 'ok' : 'need_terms');
      } catch {
        if (!cancelled) setUgcGate('need_terms');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAcceptTerms() {
    try {
      await acceptCommunityTerms(COMMUNITY_TERMS_VERSION);
      setUgcGate('ok');
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '약관 동의를 저장하지 못했습니다.');
    }
  }

  async function handleUseCurrentLocation() {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '이벤트를 만들려면 위치 권한이 필요합니다.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);

      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geo) {
          const parts = [geo.city, geo.district, geo.street, geo.name].filter(Boolean);
          setAddress(parts.join(' '));
        }
      } catch {
        // reverse geocoding failed — user can type manually
      }
    } catch {
      Alert.alert('위치 오류', '현재 위치를 가져올 수 없습니다.');
    } finally {
      setLoadingLocation(false);
    }
  }

  function canProceedStep1() {
    return locationName.trim() && address.trim() && lat != null && lng != null;
  }

  function canProceedStep2() {
    return category !== '';
  }

  async function handleGenerate(): Promise<boolean> {
    if (!lat || !lng) return false;

    const checks = [
      validateUGCText(locationName.trim()),
      validateUGCText(address.trim()),
    ];
    if (description.trim()) checks.push(validateUGCText(description.trim()));
    const failed = checks.find((c): c is { ok: false; message: string } => !c.ok);
    if (failed) {
      Alert.alert('내용 확인', failed.message);
      return false;
    }

    setStep(3);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setGenerating(true);

    try {
      const result = await generateUGCEvent({
        location_name: locationName.trim(),
        address: address.trim(),
        lat,
        lng,
        category,
        description: description.trim() || undefined,
      });

      const ev = result.suggested_event;
      setSuggested(ev);
      setEditTitle(ev.title);
      setEditNarrative(ev.narrative);
      setEditDifficulty(ev.difficulty);
      setEditRewardXp(ev.reward_xp);
      return true;
    } catch (err: any) {
      Alert.alert('생성 실패', err?.message ?? '이벤트를 생성하지 못했습니다.');
      setStep(2);
      return false;
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!suggested || !lat || !lng) return;

    const checks = [
      validateUGCText(editTitle.trim()),
      validateUGCText(editNarrative.trim()),
    ];
    if (description.trim()) checks.push(validateUGCText(description.trim()));
    const failed = checks.find((c): c is { ok: false; message: string } => !c.ok);
    if (failed) {
      Alert.alert('내용 확인', failed.message);
      return;
    }

    setSaving(true);
    try {
      const addressParts = address.split(' ');
      const district = addressParts.length >= 2 ? addressParts.slice(0, 2).join(' ') : address;

      const result = await saveUGCEvent({
        title: editTitle,
        narrative: editNarrative,
        description: description.trim() || editTitle,
        lat,
        lng,
        address,
        district,
        category,
        difficulty: editDifficulty,
        reward_xp: editRewardXp,
        missions: suggested.missions,
      });

      setSavedEventId(result.event_id);
      setStep(4);
    } catch (err: any) {
      Alert.alert('저장 실패', err?.message ?? '이벤트를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    if (step === 2) {
      await handleGenerate();
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function goBack() {
    if (step === 1) {
      router.back();
      return;
    }
    setStep((s) => s - 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function renderDifficultyStars() {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setEditDifficulty(n)} hitSlop={8}>
            <Ionicons
              name={n <= editDifficulty ? 'star' : 'star-outline'}
              size={28}
              color={n <= editDifficulty ? BRAND.gold : COLORS.textMuted}
            />
          </Pressable>
        ))}
      </View>
    );
  }

  // ── Step 1: Location ──
  function renderStep1() {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.stepContent}>
        <Text style={styles.stepTitle}>장소 선택</Text>
        <Text style={styles.stepSubtitle}>이벤트가 열릴 장소를 지정해주세요</Text>

        <Pressable
          style={[styles.locationBtn, loadingLocation && styles.locationBtnLoading]}
          onPress={handleUseCurrentLocation}
          disabled={loadingLocation}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color={BRAND.primary} />
          ) : (
            <Ionicons name="navigate" size={20} color={BRAND.primary} />
          )}
          <Text style={styles.locationBtnText}>
            {loadingLocation ? '위치 가져오는 중...' : '현재 위치 사용'}
          </Text>
        </Pressable>

        {lat != null && lng != null && (
          <Animated.View entering={FadeInUp.duration(200)} style={styles.coordsCard}>
            <Ionicons name="location" size={16} color={BRAND.primary} />
            <Text style={styles.coordsText}>
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </Text>
          </Animated.View>
        )}

        <Text style={styles.inputLabel}>장소 이름</Text>
        <TextInput
          style={styles.textInput}
          value={locationName}
          onChangeText={setLocationName}
          placeholder="예: 경복궁, 홍대 놀이터..."
          placeholderTextColor={COLORS.textMuted}
          maxLength={50}
        />

        <Text style={styles.inputLabel}>주소</Text>
        <TextInput
          style={styles.textInput}
          value={address}
          onChangeText={setAddress}
          placeholder="서울시 종로구..."
          placeholderTextColor={COLORS.textMuted}
          maxLength={100}
        />
      </Animated.View>
    );
  }

  // ── Step 2: Details ──
  function renderStep2() {
    return (
      <Animated.View entering={SlideInRight.duration(300)} style={styles.stepContent}>
        <Text style={styles.stepTitle}>이벤트 정보</Text>
        <Text style={styles.stepSubtitle}>카테고리를 선택하고 설명을 추가하세요</Text>

        <Text style={styles.inputLabel}>카테고리</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const selected = category === cat.key;
            return (
              <Pressable
                key={cat.key}
                style={[styles.categoryBtn, selected && styles.categoryBtnSelected]}
                onPress={() => setCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon}
                  size={24}
                  color={selected ? BRAND.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    selected && styles.categoryLabelSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.inputLabel}>설명 (선택)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="이 장소의 특별한 점이 있나요?"
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={4}
          maxLength={300}
          textAlignVertical="top"
        />
      </Animated.View>
    );
  }

  // ── Step 3: AI Generation + Review ──
  function renderStep3() {
    if (generating) {
      return (
        <View style={styles.generatingContainer}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.generatingInner}>
            <Text style={styles.generatingEmoji}>🌿</Text>
            <Text style={styles.generatingText}>
              도담이가 이벤트를 만들고 있어요...
            </Text>
            <ActivityIndicator
              size="large"
              color={BRAND.primary}
              style={{ marginTop: SPACING.lg }}
            />
          </Animated.View>
        </View>
      );
    }

    if (!suggested) {
      return (
        <View style={styles.generatingContainer}>
          <Text style={styles.generatingText}>이벤트 생성에 실패했습니다.</Text>
          <Pressable style={styles.retryBtn} onPress={handleGenerate}>
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.stepContent}>
        <Text style={styles.stepTitle}>이벤트 미리보기</Text>
        <Text style={styles.stepSubtitle}>AI가 만든 이벤트를 수정할 수 있어요</Text>

        <Text style={styles.inputLabel}>제목</Text>
        <TextInput
          style={styles.textInput}
          value={editTitle}
          onChangeText={setEditTitle}
          maxLength={30}
        />

        <Text style={styles.inputLabel}>서사</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={editNarrative}
          onChangeText={setEditNarrative}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={300}
        />

        <Text style={styles.inputLabel}>미션 목록</Text>
        {suggested.missions.map((m, i) => (
          <Animated.View
            key={i}
            entering={FadeInUp.delay(i * 100).duration(200)}
            style={styles.missionCard}
          >
            <View style={styles.missionHeader}>
              <View style={styles.missionBadge}>
                <Text style={styles.missionBadgeText}>{m.step_order}</Text>
              </View>
              <View style={styles.missionTypeBadge}>
                <Text style={styles.missionTypeText}>{m.mission_type}</Text>
              </View>
            </View>
            <Text style={styles.missionTitle}>{m.title}</Text>
            <Text style={styles.missionDesc}>{m.description}</Text>
          </Animated.View>
        ))}

        <Text style={styles.inputLabel}>난이도</Text>
        {renderDifficultyStars()}

        <Text style={styles.inputLabel}>보상 XP</Text>
        <View style={styles.xpRow}>
          <Ionicons name="sparkles" size={20} color={BRAND.gold} />
          <Text style={styles.xpValue}>{editRewardXp} XP</Text>
        </View>
      </Animated.View>
    );
  }

  // ── Step 4: Success ──
  function renderStep4() {
    return (
      <View style={styles.successContainer}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.successInner}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={BRAND.primary} />
          </View>
          <Text style={styles.successTitle}>이벤트가 등록되었어요!</Text>
          <Text style={styles.successSubtitle}>
            지도에서 바로 탐험할 수 있어요
          </Text>
          <Text style={styles.successDetail}>
            주변 사용자에게도 곧바로 노출됩니다.
          </Text>

          <Pressable
            style={styles.backToMapBtn}
            onPress={() => router.replace('/(tabs)/map' as any)}
          >
            <Ionicons name="map" size={20} color="#FFF" />
            <Text style={styles.backToMapText}>지도로 돌아가기</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  function renderFooterButton() {
    if (step === 4) return null;

    if (step === 3) {
      return (
        <Pressable
          style={[styles.nextBtn, (!suggested || saving) && styles.nextBtnDisabled]}
          onPress={handleSave}
          disabled={!suggested || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
              <Text style={styles.nextBtnText}>이벤트 등록하기</Text>
            </>
          )}
        </Pressable>
      );
    }

    const disabled =
      (step === 1 && !canProceedStep1()) ||
      (step === 2 && !canProceedStep2());

    return (
      <Pressable
        style={[styles.nextBtn, disabled && styles.nextBtnDisabled]}
        onPress={goNext}
        disabled={disabled}
      >
        {step === 2 ? (
          <>
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={styles.nextBtnText}>AI로 이벤트 만들기</Text>
          </>
        ) : (
          <Text style={styles.nextBtnText}>다음</Text>
        )}
      </Pressable>
    );
  }

  if (ugcGate === 'loading') {
    return (
      <View style={[styles.container, styles.termsLoadingWrap, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={styles.termsLoadingText}>약관 확인 중…</Text>
      </View>
    );
  }

  if (ugcGate === 'need_terms') {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.termsModalRoot, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.termsTitle}>커뮤니티 가이드라인 · Community guidelines</Text>
          <ScrollView style={styles.termsScroll} contentContainerStyle={styles.termsScrollContent}>
            <Text style={styles.termsBody}>
              (한국어) 사용자 생성 이벤트를 등록하기 전에 아래에 동의해 주세요.{'\n\n'}
              • 욕설, 혐오, 폭력, 불법 행위를 조장하는 콘텐츠는 허용되지 않습니다.{'\n'}
              • 스팸·사기·타인을 기만하는 내용은 삭제될 수 있습니다.{'\n'}
              • 신고된 콘텐츠는 운영팀이 24시간 이내 검토·조치를 목표로 합니다.{'\n'}
              • 다른 사용자를 차단하면 해당 사용자의 이벤트가 내 지도 목록에서 즉시 숨겨집니다.{'\n\n'}
              (English) Before posting user-generated events you agree that: objectionable or abusive
              content is not tolerated; you may report content and block users; we aim to review
              reports within 24 hours and remove violating content.
            </Text>
          </ScrollView>
          <Pressable style={styles.termsAgreeBtn} onPress={() => void handleAcceptTerms()}>
            <Text style={styles.termsAgreeBtnText}>동의하고 계속 · I agree</Text>
          </Pressable>
          <Pressable style={styles.termsDeclineBtn} onPress={() => router.back()}>
            <Text style={styles.termsDeclineText}>거부하고 나가기</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBackBtn} onPress={goBack} hitSlop={12}>
          <Ionicons
            name={step === 1 ? 'close' : 'chevron-back'}
            size={24}
            color={COLORS.textPrimary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>이벤트 만들기</Text>
        <StepIndicator current={step} />
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      {/* Footer */}
      {renderFooterButton() && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
          {renderFooterButton()}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceLight,
  },
  stepDotActive: {
    backgroundColor: BRAND.primary,
  },
  stepDotCurrent: {
    width: 20,
    borderRadius: 4,
  },
  stepLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginLeft: 4,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingBottom: 100,
  },
  stepContent: {
    gap: SPACING.sm,
  },
  stepTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },

  // Location button
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: `${BRAND.primary}15`,
    borderWidth: 1,
    borderColor: BRAND.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  locationBtnLoading: {
    opacity: 0.7,
  },
  locationBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: BRAND.primary,
  },

  coordsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  coordsText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Inputs
  inputLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: SPACING.md,
  },

  // Categories
  categoryGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  categoryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryBtnSelected: {
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}15`,
  },
  categoryLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  categoryLabelSelected: {
    color: BRAND.primary,
    fontWeight: FONT_WEIGHT.bold,
  },

  // Generating
  generatingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  generatingInner: {
    alignItems: 'center',
  },
  generatingEmoji: {
    fontSize: 56,
    marginBottom: SPACING.xl,
  },
  generatingText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: SPACING.xl,
    backgroundColor: BRAND.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  retryBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },

  // Mission cards
  missionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  missionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
  missionTypeBadge: {
    backgroundColor: `${BRAND.primary}20`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  missionTypeText: {
    fontSize: FONT_SIZE.xs,
    color: BRAND.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  missionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  missionDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: FONT_SIZE.sm * 1.5,
  },

  // Stars
  starsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },

  // XP
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  xpValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: BRAND.gold,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  successInner: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  successIcon: {
    marginBottom: SPACING.xl,
  },
  successTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: BRAND.primary,
    marginBottom: SPACING.lg,
  },
  successDetail: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: FONT_SIZE.md * 1.6,
    marginBottom: SPACING.xxl,
  },
  backToMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: BRAND.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.md,
  },
  backToMapText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },

  // Footer
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
  },
  nextBtnDisabled: {
    backgroundColor: COLORS.surfaceLight,
  },
  nextBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },

  termsLoadingWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  termsLoadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  termsModalRoot: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  termsTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  termsScroll: { flex: 1 },
  termsScrollContent: { paddingBottom: SPACING.xl },
  termsBody: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: FONT_SIZE.sm * 1.55,
  },
  termsAgreeBtn: {
    backgroundColor: BRAND.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  termsAgreeBtnText: {
    color: '#FFF',
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.md,
  },
  termsDeclineBtn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  termsDeclineText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
  },
});
