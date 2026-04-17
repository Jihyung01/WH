import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import type { Mark } from '../../types/models';
import {
  BRAND,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  SHADOWS,
} from '../../config/theme';
import { fireImpactMedium, fireNotificationSuccess } from '../../utils/hapticsSafe';
import { captureError } from '../../utils/errorReporting';
import { formatRelativeDate } from '../../utils/format';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_W * 0.88, 420);

interface Props {
  mark: Mark;
  downloadUrl?: string;
  onClose?: () => void;
}

export function MarkShareCard({ mark, downloadUrl, onClose }: Props) {
  const cardRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      setSharing(true);
      fireImpactMedium();

      if (!cardRef.current?.capture) return;
      const uri = await cardRef.current.capture();

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('알림', '이 기기에서는 공유 기능을 사용할 수 없습니다.');
        return;
      }
      await Sharing.shareAsync(uri, {
        dialogTitle: '흔적 공유하기',
        mimeType: 'image/png',
      });
      fireNotificationSuccess();
    } catch (err) {
      captureError(err, { tag: 'MarkShareCard.share' });
      Alert.alert('오류', '공유 이미지를 만들지 못했어요.');
    } finally {
      setSharing(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <ViewShot
        ref={cardRef}
        options={{ format: 'png', quality: 1 }}
        style={styles.shotWrapper}
      >
        <View style={styles.card}>
          {mark.photo_url ? (
            <Image source={{ uri: mark.photo_url }} style={styles.bgPhoto} contentFit="cover" />
          ) : (
            <View style={[styles.bgPhoto, { backgroundColor: '#1E293B' }]} />
          )}
          <LinearGradient
            colors={['rgba(15,23,42,0.0)', 'rgba(15,23,42,0.35)', 'rgba(15,23,42,0.95)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.topRow}>
            <View style={styles.brandPill}>
              <View style={styles.brandDot} />
              <Text style={styles.brandText}>WhereHere</Text>
            </View>
            <Text style={styles.emojiBig}>{mark.emoji_icon || '📍'}</Text>
          </View>

          <View style={styles.bottomSection}>
            <Text style={styles.markText} numberOfLines={4}>
              {mark.content}
            </Text>
            <View style={styles.authorRow}>
              <Text style={styles.authorText} numberOfLines={1}>
                @{mark.username ?? '익명'}
              </Text>
              <Text style={styles.sep}>·</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {[mark.district, formatRelativeDate(mark.created_at)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>

            <View style={styles.watermarkRow}>
              <Ionicons name="location" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.watermarkText} numberOfLines={1}>
                {downloadUrl ?? 'WhereHere에서 나만의 흔적을 남겨보세요'}
              </Text>
            </View>
          </View>
        </View>
      </ViewShot>

      <View style={styles.actions}>
        <Pressable
          onPress={() => void handleShare()}
          disabled={sharing}
          style={[styles.shareBtn, sharing && { opacity: 0.7 }]}
        >
          {sharing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
              <Text style={styles.shareText}>공유하기</Text>
            </>
          )}
        </Pressable>
        {onClose ? (
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  shotWrapper: {
    width: CARD_W,
    aspectRatio: 4 / 5,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  card: {
    flex: 1,
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  bgPhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.primary,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.extrabold,
    letterSpacing: 0.4,
  },
  emojiBig: {
    fontSize: 36,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bottomSection: {
    gap: 6,
  },
  markText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: 26,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  sep: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZE.sm,
  },
  metaText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT_SIZE.xs,
    flexShrink: 1,
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm,
  },
  watermarkText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: FONT_SIZE.xs,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: BRAND.primary,
  },
  shareText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  closeBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
