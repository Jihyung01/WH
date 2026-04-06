import React from 'react';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect, Circle, Path } from 'react-native-svg';

/**
 * Background layer drawn BEHIND the character.
 * Shows when 'background' slot is equipped.
 */

interface Props {
  rarity: string;
  size?: number;
}

const BG_COLORS: Record<string, { from: string; to: string }> = {
  common: { from: '#374151', to: '#1F2937' },
  rare: { from: '#1E3A5F', to: '#0F172A' },
  epic: { from: '#3B0764', to: '#1E1B4B' },
  legendary: { from: '#78350F', to: '#451A03' },
};

export function BackgroundLayer({ rarity, size = 200 }: Props) {
  const colors = BG_COLORS[rarity] ?? BG_COLORS.common;
  const isLegendary = rarity === 'legendary';
  const isEpic = rarity === 'epic';

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="bgGrad" cx="50%" cy="45%" r="65%">
          <Stop offset="0%" stopColor={colors.from} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={colors.to} stopOpacity="0.9" />
        </RadialGradient>
      </Defs>

      {/* Base gradient */}
      <Rect x={0} y={0} width={size} height={size} rx={size * 0.1} fill="url(#bgGrad)" />

      {/* Decorative elements */}
      {isLegendary && (
        <>
          {/* Star pattern */}
          {[
            [size * 0.15, size * 0.2, 3],
            [size * 0.85, size * 0.15, 2],
            [size * 0.1, size * 0.75, 2],
            [size * 0.88, size * 0.8, 2.5],
            [size * 0.5, size * 0.08, 2],
            [size * 0.3, size * 0.9, 1.5],
            [size * 0.7, size * 0.92, 1.5],
          ].map(([x, y, r], i) => (
            <Circle key={i} cx={x} cy={y} r={r} fill="#FBBF24" opacity={0.4} />
          ))}
        </>
      )}

      {isEpic && (
        <>
          {/* Mystical circles */}
          <Circle cx={size * 0.5} cy={size * 0.5} r={size * 0.35} fill="none" stroke="#8B5CF6" strokeWidth={0.5} opacity={0.2} />
          <Circle cx={size * 0.5} cy={size * 0.5} r={size * 0.42} fill="none" stroke="#8B5CF6" strokeWidth={0.5} opacity={0.15} strokeDasharray="4 6" />
        </>
      )}

      {/* Subtle grid dots for non-legendary */}
      {!isLegendary && !isEpic && (
        <>
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 5 }).map((_, col) => (
              <Circle
                key={`${row}-${col}`}
                cx={size * 0.15 + col * size * 0.18}
                cy={size * 0.15 + row * size * 0.18}
                r={1}
                fill="#FFF"
                opacity={0.1}
              />
            )),
          )}
        </>
      )}
    </Svg>
  );
}
