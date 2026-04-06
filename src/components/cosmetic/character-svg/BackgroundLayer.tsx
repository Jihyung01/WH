import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect, Circle, Path, Ellipse } from 'react-native-svg';

/**
 * Background layer drawn BEHIND the character.
 * Vibrant, rarity-themed scenic backdrops with emoji accent.
 */

interface Props {
  rarity: string;
  emoji?: string;
  size?: number;
}

const BG_PALETTES: Record<string, { from: string; to: string; accent: string; particle: string }> = {
  common:    { from: '#E0F2FE', to: '#BAE6FD', accent: '#7DD3FC', particle: '#38BDF8' },
  rare:      { from: '#DBEAFE', to: '#93C5FD', accent: '#3B82F6', particle: '#60A5FA' },
  epic:      { from: '#EDE9FE', to: '#C4B5FD', accent: '#8B5CF6', particle: '#A78BFA' },
  legendary: { from: '#FEF3C7', to: '#FDE68A', accent: '#F59E0B', particle: '#FBBF24' },
};

export function BackgroundLayer({ rarity, emoji, size = 200 }: Props) {
  const colors = BG_PALETTES[rarity] ?? BG_PALETTES.common;
  const isLegendary = rarity === 'legendary';
  const isEpic = rarity === 'epic';
  const isRare = rarity === 'rare';
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="bgGrad" cx="50%" cy="45%" r="70%">
            <Stop offset="0%" stopColor={colors.from} stopOpacity="0.95" />
            <Stop offset="100%" stopColor={colors.to} stopOpacity="0.85" />
          </RadialGradient>
          <RadialGradient id="centerGlow" cx="50%" cy="45%" r="40%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Base rounded gradient */}
        <Rect x={0} y={0} width={size} height={size} rx={size * 0.12} fill="url(#bgGrad)" />

        {/* Center highlight */}
        <Circle cx={cx} cy={cy * 0.85} r={size * 0.3} fill="url(#centerGlow)" />

        {/* Soft ground curve */}
        <Ellipse
          cx={cx}
          cy={size * 0.92}
          rx={size * 0.45}
          ry={size * 0.08}
          fill={colors.accent}
          opacity={0.15}
        />

        {/* ── Common: gentle floating bubbles ── */}
        {!isRare && !isEpic && !isLegendary && (
          <>
            {[
              [0.15, 0.25, 4], [0.8, 0.18, 3], [0.25, 0.78, 3.5],
              [0.85, 0.75, 2.5], [0.5, 0.12, 3], [0.65, 0.85, 2],
            ].map(([px, py, r], i) => (
              <Circle key={i} cx={size * px} cy={size * py} r={r} fill={colors.particle} opacity={0.3} />
            ))}
          </>
        )}

        {/* ── Rare: diamond sparkles ── */}
        {isRare && (
          <>
            {[
              [0.15, 0.2], [0.85, 0.15], [0.1, 0.7], [0.88, 0.75],
              [0.5, 0.08], [0.3, 0.88], [0.7, 0.9],
            ].map(([px, py], i) => {
              const x = size * px;
              const y = size * py;
              const s = 4 + (i % 3);
              return (
                <Path
                  key={i}
                  d={`M${x} ${y - s} L${x + s * 0.6} ${y} L${x} ${y + s} L${x - s * 0.6} ${y} Z`}
                  fill={colors.particle}
                  opacity={0.4 + (i % 2) * 0.15}
                />
              );
            })}
            {/* Subtle horizontal lines */}
            <Rect x={size * 0.1} y={size * 0.35} width={size * 0.15} height={1} rx={0.5} fill={colors.accent} opacity={0.2} />
            <Rect x={size * 0.75} y={size * 0.6} width={size * 0.15} height={1} rx={0.5} fill={colors.accent} opacity={0.2} />
          </>
        )}

        {/* ── Epic: constellation pattern ── */}
        {isEpic && (
          <>
            {/* Mystic rings */}
            <Circle cx={cx} cy={cy} r={size * 0.38} fill="none" stroke={colors.accent} strokeWidth={1} opacity={0.2} />
            <Circle cx={cx} cy={cy} r={size * 0.28} fill="none" stroke={colors.particle} strokeWidth={0.5} opacity={0.25} strokeDasharray="3 5" />
            {/* Star dots with connections */}
            {[
              [0.2, 0.2], [0.4, 0.12], [0.65, 0.18], [0.82, 0.3],
              [0.12, 0.55], [0.88, 0.6], [0.3, 0.85], [0.75, 0.88],
            ].map(([px, py], i) => (
              <React.Fragment key={i}>
                <Circle cx={size * px} cy={size * py} r={3} fill={colors.particle} opacity={0.5} />
                <Circle cx={size * px} cy={size * py} r={1.2} fill="#FFF" opacity={0.8} />
              </React.Fragment>
            ))}
            {/* Connecting lines */}
            <Path
              d={`M${size * 0.2} ${size * 0.2} L${size * 0.4} ${size * 0.12} L${size * 0.65} ${size * 0.18}`}
              fill="none" stroke={colors.particle} strokeWidth={0.5} opacity={0.2}
            />
            <Path
              d={`M${size * 0.3} ${size * 0.85} L${size * 0.12} ${size * 0.55}`}
              fill="none" stroke={colors.particle} strokeWidth={0.5} opacity={0.2}
            />
          </>
        )}

        {/* ── Legendary: golden starburst ── */}
        {isLegendary && (
          <>
            {/* Radial rays */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const innerR = size * 0.15;
              const outerR = size * 0.42;
              return (
                <Path
                  key={`ray-${i}`}
                  d={`M${cx + innerR * Math.cos(angle)} ${cy + innerR * Math.sin(angle)} L${cx + outerR * Math.cos(angle)} ${cy + outerR * Math.sin(angle)}`}
                  stroke={colors.accent}
                  strokeWidth={1}
                  opacity={0.15 + (i % 2) * 0.08}
                />
              );
            })}
            {/* Star sparkles */}
            {[
              [0.15, 0.18, 5], [0.85, 0.12, 4], [0.08, 0.72, 3.5],
              [0.9, 0.78, 4.5], [0.5, 0.06, 3], [0.25, 0.92, 3],
              [0.75, 0.93, 3.5], [0.42, 0.88, 2.5],
            ].map(([px, py, r], i) => {
              const x = size * px;
              const y = size * py;
              return (
                <React.Fragment key={`star-${i}`}>
                  {/* 4-point star */}
                  <Path
                    d={`M${x} ${y - r} L${x + r * 0.3} ${y} L${x} ${y + r} L${x - r * 0.3} ${y} Z`}
                    fill="#FBBF24"
                    opacity={0.5 + (i % 3) * 0.1}
                  />
                  <Path
                    d={`M${x - r} ${y} L${x} ${y + r * 0.3} L${x + r} ${y} L${x} ${y - r * 0.3} Z`}
                    fill="#FDE68A"
                    opacity={0.3 + (i % 2) * 0.15}
                  />
                </React.Fragment>
              );
            })}
          </>
        )}
      </Svg>

      {/* Corner emoji accent for legendary/epic */}
      {emoji && (isLegendary || isEpic) && (
        <>
          <View style={[styles.cornerEmoji, { top: size * 0.06, left: size * 0.06 }]}>
            <Text style={{ fontSize: size * 0.07, opacity: 0.4 }}>{emoji}</Text>
          </View>
          <View style={[styles.cornerEmoji, { bottom: size * 0.06, right: size * 0.06 }]}>
            <Text style={{ fontSize: size * 0.07, opacity: 0.4 }}>{emoji}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cornerEmoji: {
    position: 'absolute',
  },
});
