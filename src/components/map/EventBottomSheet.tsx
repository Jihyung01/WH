import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import type { NearbyEvent, GeoPoint } from '../../types';
import { getDistance } from '../../utils/geo';
import { formatDistance } from '../../utils/format';
import { CHECK_IN_RADIUS_METERS } from '../../utils/constants';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../config/theme';
import { EventCategory } from '../../types/enums';

interface EventBottomSheetProps {
  event: NearbyEvent | null;
  userLocation: GeoPoint | null;
  onDismiss: () => void;
  onChallenge: (event: NearbyEvent) => void;
}

const SHEET_HEIGHT = 260;

const CATEGORY_LABELS: Record<string, string> = {
  [EventCategory.FOOD]: '맛집',
  [EventCategory.CAFE]: '카페',
  [EventCategory.CULTURE]: '문화',
  [EventCategory.ACTIVITY]: '탐험',
  [EventCategory.NATURE]: '자연',
  [EventCategory.NIGHTLIFE]: '야간',
  [EventCategory.SHOPPING]: '쇼핑',
  [EventCategory.HIDDEN_GEM]: '숨은명소',
  [EventCategory.PHOTO]: '포토',
  [EventCategory.QUIZ]: '퀴즈',
  [EventCategory.PARTNERSHIP]: '제휴',
};

export function EventBottomSheet({ event, userLocation, onDismiss, onChallenge }: EventBottomSheetProps) {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const contextY = useSharedValue(0);

  React.useEffect(() => {
    if (event) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
    }
  }, [event]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-20, 20])
    .onStart(() => {
      contextY.value = translateY.value;
    })
    .onUpdate((e) => {
      const newY = contextY.value + e.translationY;
      translateY.value = Math.max(-10, newY);
    })
    .onEnd((e) => {
      if (e.translationY > 60 || e.velocityY > 400) {
        translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
        runOnJS(onDismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 25, stiffness: 180, mass: 0.8 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!event) return null;

  const coordinate = { latitude: event.lat, longitude: event.lng };
  const distance = userLocation ? getDistance(userLocation, coordinate) : null;
  const isInRange = distance !== null && distance <= CHECK_IN_RADIUS_METERS;
  const categoryLabel = CATEGORY_LABELS[event.category] ?? '이벤트';

  const openDirections = () => {
    const encodedTitle = encodeURIComponent(event.title);
    const url = Platform.select({
      ios: `maps:0,0?daddr=${event.lat},${event.lng}&dirflg=w`,
      android: `google.navigation:q=${event.lat},${event.lng}&mode=w`,
    });
    const webFallback =
      `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}&destination_place_id=${encodedTitle}&travelmode=walking`;
    if (!url) return;
    Linking.canOpenURL(url)
      .then((supported) => (supported ? Linking.openURL(url) : Linking.openURL(webFallback)))
      .catch(() => Linking.openURL(webFallback));
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handleBar} />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{categoryLabel}</Text>
            </View>
            {distance !== null && (
              <Text style={styles.distance}>{formatDistance(distance)}</Text>
            )}
          </View>
          <View style={styles.difficultyRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name="star"
                size={14}
                color={i < event.difficulty ? COLORS.warning : COLORS.surfaceHighlight}
              />
            ))}
          </View>
        </View>

        <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{event.description}</Text>

        <View style={styles.rewardRow}>
          {event.reward_xp > 0 && (
            <View style={styles.rewardChip}>
              <Text style={styles.rewardIcon}>⚡</Text>
              <Text style={styles.rewardText}>{event.reward_xp} XP</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.directionsBtn} onPress={openDirections}>
            <Ionicons name="navigate-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.directionsBtnText}>경로 보기</Text>
          </Pressable>

          <Pressable
            style={[styles.challengeBtn, !isInRange && styles.challengeBtnDisabled]}
            onPress={() => onChallenge(event)}
            disabled={!isInRange}
          >
            <Text style={styles.challengeBtnText}>
              {isInRange ? '도전하기' : distance !== null ? `${formatDistance(distance)} 남음` : '위치 확인 중...'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 88,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    ...SHADOWS.lg,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceHighlight,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  categoryText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primaryLight,
  },
  distance: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.info,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 2,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  rewardIcon: {
    fontSize: 14,
  },
  rewardText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  directionsBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  challengeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  challengeBtnDisabled: {
    backgroundColor: COLORS.surfaceHighlight,
  },
  challengeBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
});
