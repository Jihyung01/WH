import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import type { Mark } from '../../types/models';
import { FeedAppleMusicCard } from '../music/FeedAppleMusicCard';
import { useTheme } from '../../providers/ThemeProvider';
import {
  BRAND,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from '../../config/theme';
import { formatRelativeDate } from '../../utils/format';

interface Props {
  mark: Mark;
  onPressAuthor?: (userId: string) => void;
  onPressDetail?: (mark: Mark) => void;
  onPressShare?: (mark: Mark) => void;
}

export function MarkCard({ mark, onPressAuthor, onPressDetail, onPressShare }: Props) {
  const { colors } = useTheme();

  const handleAuthor = useCallback(() => {
    if (mark.user_id) onPressAuthor?.(mark.user_id);
  }, [mark.user_id, onPressAuthor]);

  const handleDetail = useCallback(() => {
    onPressDetail?.(mark);
  }, [mark, onPressDetail]);

  const handleShare = useCallback(() => {
    onPressShare?.(mark);
  }, [mark, onPressShare]);

  return (
    <View style={[styles.card, { borderBottomColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable onPress={handleAuthor} style={styles.authorRow}>
          <View style={[styles.avatarFallback, { backgroundColor: colors.surfaceHighlight }]}>
            <Text style={[styles.avatarInitial, { color: colors.textSecondary }]}>
              {mark.character_emoji ?? (mark.username ?? '익').slice(0, 1)}
            </Text>
          </View>
          <View style={styles.authorText}>
            <View style={styles.nameRow}>
              <Text style={[styles.username, { color: colors.textPrimary }]} numberOfLines={1}>
                {mark.username ?? '익명'}
              </Text>
              <View style={[styles.badge, { backgroundColor: BRAND.primary + '22' }]}>
                <Text style={[styles.badgeText, { color: BRAND.primary }]}>흔적</Text>
              </View>
            </View>
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
              {[mark.district, formatRelativeDate(mark.created_at)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={handleShare} hitSlop={8} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Pressable onPress={handleDetail}>
        {mark.photo_url ? (
          <Image
            source={{ uri: mark.photo_url }}
            style={styles.photo}
            contentFit="cover"
          />
        ) : null}
      </Pressable>

      <View style={styles.body}>
        <View style={styles.textRow}>
          <Text style={styles.emoji}>{mark.emoji_icon || '📍'}</Text>
          <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={4}>
            {mark.content}
          </Text>
        </View>

        {mark.music_json ? (
          <View style={styles.musicWrap}>
            <FeedAppleMusicCard music={mark.music_json} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  authorRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  authorText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.semibold,
  },
  meta: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  shareBtn: {
    padding: 4,
  },
  photo: {
    width: '100%',
    height: 200,
  },
  body: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  emoji: {
    fontSize: FONT_SIZE.lg,
  },
  text: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    lineHeight: 22,
  },
  musicWrap: {
    marginTop: SPACING.xs,
  },
});
