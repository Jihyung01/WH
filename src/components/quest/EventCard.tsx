import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Event, NearbyEvent, GeoPoint } from '../../types';
import { EventCategory } from '../../types/enums';
import { formatDistance, formatNumber } from '../../utils/format';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../config/theme';

interface EventCardProps {
  event: Event | NearbyEvent;
  userLocation?: GeoPoint | null;
  index?: number;
  onPress?: (event: Event | NearbyEvent) => void;
}

const CATEGORY_META: Record<string, { emoji: string; label: string; color: string }> = {
  [EventCategory.ACTIVITY]:   { emoji: '🏃', label: '탐험', color: '#00D68F' },
  [EventCategory.CAFE]:       { emoji: '☕', label: '카페', color: '#F0C040' },
  [EventCategory.CULTURE]:    { emoji: '🏛️', label: '문화', color: '#A29BFE' },
  [EventCategory.FOOD]:       { emoji: '🍜', label: '맛집', color: '#FF6B6B' },
  [EventCategory.NATURE]:     { emoji: '🌿', label: '자연', color: '#00D68F' },
  [EventCategory.NIGHTLIFE]:  { emoji: '🌙', label: '야경', color: '#48DBFB' },
  [EventCategory.SHOPPING]:   { emoji: '🛍️', label: '쇼핑', color: '#F0C040' },
  [EventCategory.HIDDEN_GEM]: { emoji: '💎', label: '숨은명소', color: '#A29BFE' },
  [EventCategory.PHOTO]:      { emoji: '📸', label: '포토', color: '#3B82F6' },
  [EventCategory.QUIZ]:       { emoji: '🧩', label: '퀴즈', color: '#8B5CF6' },
  [EventCategory.PARTNERSHIP]:{ emoji: '🤝', label: '제휴', color: '#F59E0B' },
};

function isNearbyEvent(e: Event | NearbyEvent): e is NearbyEvent {
  return 'lat' in e && 'lng' in e;
}

function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function estimateWalkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80));
}

function EventCard({ event, userLocation, index = 0, onPress }: EventCardProps) {
  const meta = CATEGORY_META[event.category] ?? CATEGORY_META[EventCategory.ACTIVITY];

  const distanceMeters = useMemo(() => {
    if (isNearbyEvent(event)) return event.distance_meters;
    if (!userLocation) return null;
    return null;
  }, [userLocation, event]);

  const walkMin = distanceMeters != null ? estimateWalkMinutes(distanceMeters) : null;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        style={styles.card}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.(event);
        }}
      >
        <View style={[styles.thumbnail, { backgroundColor: meta.color + '20' }]}>
          <Text style={styles.thumbnailEmoji}>{meta.emoji}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={[styles.categoryBadge, { backgroundColor: meta.color + '20' }]}>
              <Text style={[styles.categoryText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <View style={styles.difficultyRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name="star"
                  size={10}
                  color={i < event.difficulty ? COLORS.warning : COLORS.surfaceHighlight}
                />
              ))}
            </View>
            {distanceMeters != null && (
              <Text style={styles.distanceText}>{formatDistance(distanceMeters)}</Text>
            )}
          </View>

          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>
              {event.address ?? event.district ?? ''}
            </Text>
            {walkMin != null && (
              <>
                <Text style={styles.dotSeparator}>·</Text>
                <Ionicons name="walk-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.locationText}>{walkMin}분</Text>
              </>
            )}
          </View>

          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <Text style={styles.rewardEmoji}>⚡</Text>
              <Text style={styles.rewardText}>{formatNumber(event.reward_xp)} XP</Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaColumn}>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(EventCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },

  thumbnail: {
    width: 64, height: 64,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbnailEmoji: { fontSize: 28 },

  content: { flex: 1, gap: 4 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  categoryBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  categoryText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  difficultyRow: { flexDirection: 'row', gap: 1 },
  distanceText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.semibold, marginLeft: 'auto' },

  title: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, flexShrink: 1 },
  dotSeparator: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 },
  rewardChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rewardEmoji: { fontSize: 11 },
  rewardText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, color: COLORS.textSecondary },

  ctaColumn: { justifyContent: 'center' },
});
