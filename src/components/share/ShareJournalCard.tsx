import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS, BRAND } from '../../config/theme';
import {
  getEvolutionStage,
  getEvolutionEmoji,
  getLevelTitle,
} from '../../stores/characterStore';
import { shareKakaoText } from '../../services/kakaoShare';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.88;

export interface ShareJournalData {
  date: string;
  characterName: string;
  characterType: string;
  characterLevel: number;
  journalText: string;
  placesVisited: string[];
  xpEarned: number;
  badgesEarned?: { name: string; rarity: string }[];
  totalXp?: number;
  district?: string;
}

const CHARACTER_GRADIENTS: Record<string, [string, string, string]> = {
  explorer:  ['#0F4C3A', '#1A7A5C', '#0F4C3A'],
  foodie:    ['#1A365D', '#2B6CB0', '#1A365D'],
  artist:    ['#44337A', '#6B46C1', '#44337A'],
  socialite: ['#7B341E', '#C05621', '#7B341E'],
};

const RARITY_GLOW: Record<string, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

interface Props {
  data: ShareJournalData;
  onClose?: () => void;
}

export default function ShareJournalCard({ data, onClose }: Props) {
  const cardRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);

  const stage = getEvolutionStage(data.characterLevel);
  const emoji = getEvolutionEmoji(data.characterType, stage);
  const title = getLevelTitle(data.characterType, data.characterLevel);
  const gradientColors = CHARACTER_GRADIENTS[data.characterType] ?? ['#1E293B', '#0F172A', '#1E293B'];

  const glowAnim = useSharedValue(0.4);

  React.useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.4, { duration: 1500 }),
      ),
      -1,
      true,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  const handleShare = useCallback(async () => {
    try {
      setIsSharing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!cardRef.current?.capture) return;

      const uri = await cardRef.current.capture();

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('알림', '이 기기에서는 공유 기능을 사용할 수 없습니다.');
        return;
      }

      await Sharing.shareAsync(uri, {
        dialogTitle: '나의 탐험 일지 공유하기',
        mimeType: 'image/png',
      });
    } catch (error) {
      console.error('Share failed:', error);
      Alert.alert('오류', '이미지 생성 및 공유에 실패했습니다.');
    } finally {
      setIsSharing(false);
    }
  }, []);

  const handleKakaoShare = useCallback(async () => {
    try {
      setIsSharing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const text = [
        `WhereHere 탐험 일지`,
        ``,
        data.journalText,
        ``,
        `캐릭터: ${data.characterName} (Lv.${data.characterLevel})`,
        `획득 XP: +${data.xpEarned}`,
        data.badgesEarned?.length ? `새 배지: ${data.badgesEarned.length}개` : null,
        ``,
        `앱에서 보기: wherehere://feed`,
      ]
        .filter(Boolean)
        .join('\n');

      await shareKakaoText({
        text,
        buttonTitle: '피드에서 보기',
        linkParams: {
          iosExecutionParams: { screen: 'feed' },
          androidExecutionParams: { screen: 'feed' },
        },
      });
    } catch (error) {
      console.warn('Kakao share failed, falling back:', error);
      await handleShare();
    } finally {
      setIsSharing(false);
    }
  }, [data, handleShare]);

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      {/* Capturable card area */}
      <ViewShot
        ref={cardRef}
        options={{ format: 'png', quality: 1.0 }}
        style={styles.shotWrapper}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Ambient glow */}
          <Animated.View style={[styles.ambientGlow, glowStyle]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoDot} />
              <Text style={styles.logoText}>WhereHere</Text>
            </View>
            <Text style={styles.dateText}>{data.date}</Text>
          </View>

          {/* Character section */}
          <View style={styles.characterSection}>
            <View style={styles.emojiCircle}>
              <Text style={styles.characterEmoji}>{emoji}</Text>
            </View>
            <Text style={styles.characterName}>{data.characterName}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lv.{data.characterLevel} {title}</Text>
            </View>
          </View>

          {/* Journal text (AI narrative) */}
          <View style={styles.journalBubble}>
            <Text style={styles.journalQuote}>"</Text>
            <Text style={styles.journalText}>{data.journalText}</Text>
            <Text style={[styles.journalQuote, styles.journalQuoteEnd]}>"</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="footsteps-outline" size={18} color={BRAND.primary} />
              <Text style={styles.statValue}>{data.placesVisited.length}</Text>
              <Text style={styles.statLabel}>장소 탐험</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="flash" size={18} color="#FBBF24" />
              <Text style={styles.statValue}>+{data.xpEarned}</Text>
              <Text style={styles.statLabel}>경험치</Text>
            </View>
            {data.badgesEarned && data.badgesEarned.length > 0 && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="ribbon" size={18} color="#F472B6" />
                  <Text style={styles.statValue}>{data.badgesEarned.length}</Text>
                  <Text style={styles.statLabel}>새 배지</Text>
                </View>
              </>
            )}
          </View>

          {/* Badges earned */}
          {data.badgesEarned && data.badgesEarned.length > 0 && (
            <View style={styles.badgeRow}>
              {data.badgesEarned.map((badge, i) => (
                <View
                  key={i}
                  style={[
                    styles.badgeChip,
                    { borderColor: RARITY_GLOW[badge.rarity] ?? '#9CA3AF' },
                  ]}
                >
                  <Text style={styles.badgeChipText}>{badge.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Places visited */}
          {data.placesVisited.length > 0 && (
            <View style={styles.placesRow}>
              <Ionicons name="location" size={12} color={COLORS.textMuted} />
              <Text style={styles.placesText} numberOfLines={1}>
                {data.placesVisited.join(' · ')}
              </Text>
            </View>
          )}

          {/* Watermark */}
          <View style={styles.watermarkRow}>
            <Text style={styles.watermark}>WhereHere에서 나만의 탐험을 시작하세요</Text>
            <Ionicons name="search" size={11} color={COLORS.textMuted} />
          </View>
        </LinearGradient>
      </ViewShot>

      {/* Action buttons (NOT captured) */}
      <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.actions}>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          disabled={isSharing}
          activeOpacity={0.8}
        >
          {isSharing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color="#FFF" />
              <Text style={styles.shareBtnText}>스토리에 공유하기</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.kakaoBtn}
          onPress={handleKakaoShare}
          disabled={isSharing}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#191919" />
          <Text style={styles.kakaoBtnText}>카카오톡 공유</Text>
        </TouchableOpacity>

        {onClose && (
          <TouchableOpacity style={styles.skipBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: SPACING.lg,
  },

  shotWrapper: {
    width: CARD_W,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  card: {
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: BRAND.primary,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.primary,
  },
  logoText: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.extrabold,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: FONT_WEIGHT.medium,
  },

  characterSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emojiCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
  },
  characterEmoji: {
    fontSize: 42,
  },
  characterName: {
    fontSize: 20,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
    marginBottom: 6,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: FONT_WEIGHT.semibold,
  },

  journalBubble: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  journalQuote: {
    fontSize: 28,
    color: BRAND.primary,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: 28,
    position: 'absolute',
    top: 8,
    left: 12,
  },
  journalQuoteEnd: {
    top: undefined,
    left: undefined,
    bottom: 4,
    right: 12,
  },
  journalText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 17,
    fontWeight: FONT_WEIGHT.extrabold,
    color: '#FFF',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: FONT_WEIGHT.medium,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  badgeChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  badgeChipText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FONT_WEIGHT.semibold,
  },

  placesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 16,
  },
  placesText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },

  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  watermark: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },

  actions: {
    width: CARD_W,
    marginTop: 24,
    gap: 10,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1306C',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    ...SHADOWS.md,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
  kakaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE500',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  kakaoBtnText: {
    fontSize: 15,
    fontWeight: FONT_WEIGHT.bold,
    color: '#191919',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});
