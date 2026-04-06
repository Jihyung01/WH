import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Defs, RadialGradient, LinearGradient, Stop, Rect, Path } from 'react-native-svg';

/**
 * Equipment layers rendered ON TOP of the character.
 * Shows the actual emoji in a rarity-themed frame/badge.
 */

interface Props {
  slot: string;
  itemId: string;
  previewEmoji: string;
  rarity: string;
  size?: number;
}

// Vibrant rarity color palettes
const RARITY_PALETTE: Record<string, { primary: string; secondary: string; glow: string; bg: string }> = {
  common:    { primary: '#94A3B8', secondary: '#CBD5E1', glow: '#E2E8F0', bg: '#F1F5F9' },
  rare:      { primary: '#3B82F6', secondary: '#60A5FA', glow: '#93C5FD', bg: '#DBEAFE' },
  epic:      { primary: '#8B5CF6', secondary: '#A78BFA', glow: '#C4B5FD', bg: '#EDE9FE' },
  legendary: { primary: '#F59E0B', secondary: '#FBBF24', glow: '#FDE68A', bg: '#FEF3C7' },
};

export function EquipmentLayer({ slot, itemId, previewEmoji, rarity, size = 200 }: Props) {
  switch (slot) {
    case 'hat':
      return <HatLayer emoji={previewEmoji} rarity={rarity} size={size} />;
    case 'outfit':
      return <OutfitLayer emoji={previewEmoji} rarity={rarity} size={size} />;
    case 'accessory':
      return <AccessoryLayer emoji={previewEmoji} rarity={rarity} size={size} />;
    case 'aura':
      return <AuraLayer emoji={previewEmoji} rarity={rarity} size={size} />;
    default:
      return null;
  }
}

// ── Hat: emoji badge on top of head ──
function HatLayer({ emoji, rarity, size }: { emoji: string; rarity: string; size: number }) {
  const colors = RARITY_PALETTE[rarity] ?? RARITY_PALETTE.common;
  const badgeSize = size * 0.3;
  const isLegendary = rarity === 'legendary';
  const isEpic = rarity === 'epic';

  return (
    <View style={[styles.absolute, { width: size, height: size }]}>
      {/* Badge positioned on top of head */}
      <View style={[styles.hatBadge, {
        top: size * 0.02,
        left: (size - badgeSize) / 2,
        width: badgeSize,
        height: badgeSize,
      }]}>
        {/* Glow ring behind */}
        <View style={[styles.glowRing, {
          width: badgeSize + 8,
          height: badgeSize + 8,
          borderRadius: (badgeSize + 8) / 2,
          borderColor: colors.glow,
          backgroundColor: `${colors.primary}15`,
        }]} />
        {/* Main badge circle */}
        <View style={[styles.badgeCircle, {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: colors.bg,
          borderColor: colors.primary,
          borderWidth: isLegendary ? 3 : 2,
        }]}>
          <Text style={[styles.emojiText, { fontSize: badgeSize * 0.55 }]}>{emoji}</Text>
        </View>
        {/* Sparkle dots for epic+ */}
        {(isEpic || isLegendary) && (
          <>
            <View style={[styles.sparkle, { top: -3, right: 2, backgroundColor: colors.secondary }]} />
            <View style={[styles.sparkle, { top: 4, left: -2, backgroundColor: colors.glow }]} />
            <View style={[styles.sparkleSm, { bottom: -1, right: -1, backgroundColor: colors.secondary }]} />
          </>
        )}
        {/* Crown accent for legendary */}
        {isLegendary && (
          <View style={styles.crownDot}>
            <Text style={{ fontSize: badgeSize * 0.25 }}>👑</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Outfit: emoji banner on body ──
function OutfitLayer({ emoji, rarity, size }: { emoji: string; rarity: string; size: number }) {
  const colors = RARITY_PALETTE[rarity] ?? RARITY_PALETTE.common;
  const badgeW = size * 0.32;
  const badgeH = size * 0.22;
  const isLegendary = rarity === 'legendary';
  const isEpic = rarity === 'epic';

  return (
    <View style={[styles.absolute, { width: size, height: size }]}>
      {/* Sash / ribbon SVG decoration */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.absolute}>
        <Defs>
          <LinearGradient id="sashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0" />
            <Stop offset="30%" stopColor={colors.primary} stopOpacity="0.25" />
            <Stop offset="70%" stopColor={colors.primary} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* Diagonal sash across body */}
        <Path
          d={`M${size * 0.2} ${size * 0.35} L${size * 0.8} ${size * 0.65} L${size * 0.78} ${size * 0.72} L${size * 0.18} ${size * 0.42} Z`}
          fill="url(#sashGrad)"
        />
        {/* Bottom accent line */}
        <Rect
          x={size * 0.25}
          y={size * 0.73}
          width={size * 0.5}
          height={2}
          rx={1}
          fill={colors.secondary}
          opacity={0.4}
        />
      </Svg>

      {/* Emoji badge on chest */}
      <View style={[styles.outfitBadge, {
        top: size * 0.42,
        left: (size - badgeW) / 2,
        width: badgeW,
        height: badgeH,
      }]}>
        <View style={[styles.outfitPill, {
          backgroundColor: colors.bg,
          borderColor: colors.primary,
          borderWidth: isLegendary ? 2.5 : 1.5,
        }]}>
          <Text style={[styles.emojiText, { fontSize: badgeH * 0.6 }]}>{emoji}</Text>
        </View>
        {isLegendary && (
          <View style={[styles.sparkle, { top: -4, right: -4, backgroundColor: colors.secondary }]} />
        )}
        {(isEpic || isLegendary) && (
          <View style={[styles.sparkleSm, { bottom: -2, left: -2, backgroundColor: colors.glow }]} />
        )}
      </View>
    </View>
  );
}

// ── Accessory: floating emoji with sparkle trail ──
function AccessoryLayer({ emoji, rarity, size }: { emoji: string; rarity: string; size: number }) {
  const colors = RARITY_PALETTE[rarity] ?? RARITY_PALETTE.common;
  const badgeSize = size * 0.22;
  const isLegendary = rarity === 'legendary';
  const isEpic = rarity === 'epic';

  return (
    <View style={[styles.absolute, { width: size, height: size }]}>
      {/* Sparkle trail SVG */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={styles.absolute}>
        {/* Connecting sparkle dots from body to accessory */}
        <Circle cx={size * 0.72} cy={size * 0.38} r={2.5} fill={colors.secondary} opacity={0.6} />
        <Circle cx={size * 0.78} cy={size * 0.33} r={2} fill={colors.glow} opacity={0.5} />
        <Circle cx={size * 0.83} cy={size * 0.29} r={1.5} fill={colors.secondary} opacity={0.4} />
        {(isEpic || isLegendary) && (
          <>
            <Circle cx={size * 0.87} cy={size * 0.25} r={1.5} fill={colors.primary} opacity={0.35} />
            <Circle cx={size * 0.68} cy={size * 0.42} r={2} fill={colors.glow} opacity={0.3} />
          </>
        )}
      </Svg>

      {/* Floating emoji badge */}
      <View style={[styles.accessoryBadge, {
        top: size * 0.12,
        right: size * 0.02,
        width: badgeSize,
        height: badgeSize,
      }]}>
        <View style={[styles.badgeCircle, {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: colors.bg,
          borderColor: colors.primary,
          borderWidth: isLegendary ? 2.5 : 1.5,
          shadowColor: colors.primary,
          shadowOpacity: 0.4,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }]}>
          <Text style={[styles.emojiText, { fontSize: badgeSize * 0.55 }]}>{emoji}</Text>
        </View>
        {isLegendary && (
          <View style={[styles.sparkle, { top: -2, left: -2, backgroundColor: '#FDE68A' }]} />
        )}
      </View>
    </View>
  );
}

// ── Aura: vibrant orbital rings with emoji sparkles ──
function AuraLayer({ emoji, rarity, size }: { emoji: string; rarity: string; size: number }) {
  const colors = RARITY_PALETTE[rarity] ?? RARITY_PALETTE.common;
  const cx = size / 2;
  const cy = size * 0.48;
  const r = size * 0.42;
  const isLegendary = rarity === 'legendary';

  return (
    <View style={[styles.absolute, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="auraGlow" cx="50%" cy="48%" r="50%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.12" />
            <Stop offset="60%" stopColor={colors.secondary} stopOpacity="0.06" />
            <Stop offset="100%" stopColor={colors.glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Soft inner glow */}
        <Circle cx={cx} cy={cy} r={r * 0.85} fill="url(#auraGlow)" />

        {/* Outer ring - vibrant */}
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={colors.secondary}
          strokeWidth={2.5}
          opacity={0.5}
          strokeDasharray="12 6"
        />

        {/* Middle ring */}
        <Circle
          cx={cx} cy={cy} r={r * 0.78}
          fill="none"
          stroke={colors.glow}
          strokeWidth={1.5}
          opacity={0.35}
        />

        {/* Inner ring for epic+ */}
        {(rarity === 'epic' || isLegendary) && (
          <Circle
            cx={cx} cy={cy} r={r * 0.6}
            fill="none"
            stroke={colors.primary}
            strokeWidth={1}
            opacity={0.2}
            strokeDasharray="4 8"
          />
        )}

        {/* Orbital sparkle dots - colorful */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const orbR = r * (i % 2 === 0 ? 0.92 : 0.7);
          const px = cx + orbR * Math.cos(rad);
          const py = cy + orbR * Math.sin(rad);
          const dotR = i % 2 === 0 ? 3.5 : 2.5;
          const color = i % 2 === 0 ? colors.secondary : colors.glow;
          return <Circle key={deg} cx={px} cy={py} r={dotR} fill={color} opacity={0.7} />;
        })}

        {/* Legendary extra: golden cross sparkles */}
        {isLegendary && [30, 150, 210, 330].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const px = cx + r * 1.02 * Math.cos(rad);
          const py = cy + r * 1.02 * Math.sin(rad);
          return (
            <React.Fragment key={`lg-${deg}`}>
              <Rect x={px - 4} y={py - 1} width={8} height={2} rx={1} fill="#FBBF24" opacity={0.6} />
              <Rect x={px - 1} y={py - 4} width={2} height={8} rx={1} fill="#FBBF24" opacity={0.6} />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Emoji orbiting at key positions */}
      {[0, 120, 240].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const px = cx + r * 0.88 * Math.cos(rad);
        const py = cy + r * 0.88 * Math.sin(rad);
        const emojiSize = size * 0.1;
        return (
          <View key={`emoji-${deg}`} style={{
            position: 'absolute',
            left: px - emojiSize / 2,
            top: py - emojiSize / 2,
            width: emojiSize,
            height: emojiSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: emojiSize * 0.7 }}>{emoji}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },

  // Hat
  hatBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.5,
  },
  badgeCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sparkle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sparkleSm: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  crownDot: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
  },

  // Outfit
  outfitBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitPill: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  // Accessory
  accessoryBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Shared
  emojiText: {
    textAlign: 'center',
  },
});
