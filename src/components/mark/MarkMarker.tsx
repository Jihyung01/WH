import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  InteractionManager,
} from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

import type { Mark } from '../../types/models';
import { BRAND, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING } from '../../config/theme';
import { useTheme } from '../../providers/ThemeProvider';
import { formatRelativeDate } from '../../utils/format';

interface Props {
  mark: Mark;
  onPress?: (mark: Mark) => void;
  onCalloutPress?: (mark: Mark) => void;
}

const IS_ANDROID = Platform.OS === 'android';

function computeOpacity(createdAt: string): number {
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return 0.8;
  const ageDays = (Date.now() - t) / (1000 * 60 * 60 * 24);
  if (ageDays <= 1) return 0.9;
  if (ageDays <= 3) return 0.8;
  if (ageDays <= 7) return 0.7;
  return 0.5;
}

function MarkMarkerComponent({ mark, onPress, onCalloutPress }: Props) {
  const { colors } = useTheme();
  const coordinate = useMemo(
    () => ({ latitude: mark.location.lat, longitude: mark.location.lng }),
    [mark.location.lat, mark.location.lng],
  );
  const opacity = useMemo(() => computeOpacity(mark.created_at), [mark.created_at]);

  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    let cancelled = false;
    InteractionManager.runAfterInteractions(() => {
      if (!cancelled) setTracksViewChanges(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mark.id]);

  return (
    <Marker
      identifier={`mark-${mark.id}`}
      coordinate={coordinate}
      tracksViewChanges={tracksViewChanges}
      onPress={() => onPress?.(mark)}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.bubbleWrap} collapsable={false}>
        <View
          style={[
            styles.bubble,
            {
              opacity,
              backgroundColor: colors.surface,
              borderColor: BRAND.primary,
            },
          ]}
        >
          <Text style={[styles.emoji, IS_ANDROID && styles.emojiAndroid]}>
            {mark.emoji_icon || '📍'}
          </Text>
        </View>
      </View>

      <Callout
        tooltip={IS_ANDROID}
        onPress={() => onCalloutPress?.(mark)}
      >
        <View
          style={[styles.callout, { backgroundColor: colors.surface, borderColor: colors.border }]}
          collapsable={false}
        >
          {mark.photo_url ? (
            <Image
              source={{ uri: mark.photo_url }}
              style={styles.calloutImage}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.calloutBody}>
            <View style={styles.calloutTitleRow}>
              <Text style={styles.calloutEmoji}>{mark.emoji_icon || '📍'}</Text>
              <Text
                style={[styles.calloutText, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {mark.content}
              </Text>
            </View>
            <View style={styles.calloutMeta}>
              <Text style={[styles.calloutAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                @{mark.username ?? '익명'}
              </Text>
              <Text style={[styles.calloutTime, { color: colors.textMuted }]}>
                {formatRelativeDate(mark.created_at)}
              </Text>
              {mark.music_json ? (
                <Ionicons
                  name="musical-notes"
                  size={12}
                  color={BRAND.primary}
                  style={{ marginLeft: 6 }}
                />
              ) : null}
            </View>
          </View>
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  bubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  emoji: {
    fontSize: 13,
    textAlign: 'center',
  },
  emojiAndroid: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  callout: {
    width: 220,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  calloutImage: {
    width: '100%',
    height: 110,
  },
  calloutBody: {
    padding: SPACING.sm,
    gap: 4,
  },
  calloutTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  calloutEmoji: {
    fontSize: FONT_SIZE.md,
  },
  calloutText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: 18,
  },
  calloutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calloutAuthor: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  calloutTime: {
    fontSize: FONT_SIZE.xs,
  },
});

export const MarkMarker = memo(MarkMarkerComponent);
