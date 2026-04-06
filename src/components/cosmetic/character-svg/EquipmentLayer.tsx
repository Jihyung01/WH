import React from 'react';
import Svg, { Circle, Ellipse, Path, G, Rect, Polygon, Defs, LinearGradient, Stop } from 'react-native-svg';

/**
 * Equipment SVG layers drawn ON TOP of the character body.
 * Each slot renders at the correct position relative to the character.
 */

interface Props {
  slot: string;
  itemId: string;    // cosmetic ID - determines which design to draw
  previewEmoji: string;
  rarity: string;
  size?: number;
}

// Rarity glow colors
const RARITY_GLOW: Record<string, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

export function EquipmentLayer({ slot, itemId, previewEmoji, rarity, size = 200 }: Props) {
  const cx = size / 2;
  const glowColor = RARITY_GLOW[rarity] ?? RARITY_GLOW.common;

  switch (slot) {
    case 'hat':
      return <HatLayer cx={cx} size={size} rarity={rarity} glowColor={glowColor} emoji={previewEmoji} />;
    case 'outfit':
      return <OutfitLayer cx={cx} size={size} rarity={rarity} glowColor={glowColor} />;
    case 'accessory':
      return <AccessoryLayer cx={cx} size={size} rarity={rarity} glowColor={glowColor} emoji={previewEmoji} />;
    case 'aura':
      return <AuraLayer cx={cx} size={size} rarity={rarity} glowColor={glowColor} />;
    default:
      return null;
  }
}

// ── Hat designs ──
function HatLayer({ cx, size, rarity, glowColor, emoji }: { cx: number; size: number; rarity: string; glowColor: string; emoji: string }) {
  const headY = size * 0.32;
  const headR = size * 0.22;
  const hatY = headY - headR * 0.85;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="hatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={glowColor} stopOpacity="0.9" />
          <Stop offset="100%" stopColor={glowColor} stopOpacity="0.6" />
        </LinearGradient>
      </Defs>
      {/* Hat brim */}
      <Ellipse cx={cx} cy={hatY + headR * 0.3} rx={headR * 1.1} ry={headR * 0.15} fill={glowColor} opacity={0.7} />
      {/* Hat dome */}
      <Path
        d={`M${cx - headR * 0.7} ${hatY + headR * 0.3}
            Q${cx - headR * 0.7} ${hatY - headR * 0.5} ${cx} ${hatY - headR * 0.6}
            Q${cx + headR * 0.7} ${hatY - headR * 0.5} ${cx + headR * 0.7} ${hatY + headR * 0.3} Z`}
        fill="url(#hatGrad)"
      />
      {/* Hat band */}
      <Rect x={cx - headR * 0.65} y={hatY + headR * 0.05} width={headR * 1.3} height={headR * 0.12} rx={2} fill="#FFF" opacity={0.3} />
      {rarity === 'legendary' && (
        <Circle cx={cx} cy={hatY - headR * 0.1} r={headR * 0.12} fill="#FFF" opacity={0.8} />
      )}
    </Svg>
  );
}

// ── Outfit designs ──
function OutfitLayer({ cx, size, rarity, glowColor }: { cx: number; size: number; rarity: string; glowColor: string }) {
  const bodyY = size * 0.55;
  const bodyR = size * 0.28;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute' }}>
      {/* Cape / scarf */}
      <Path
        d={`M${cx - bodyR * 0.5} ${bodyY - bodyR * 0.6}
            Q${cx - bodyR * 1.2} ${bodyY + bodyR * 0.2} ${cx - bodyR * 0.8} ${bodyY + bodyR * 0.9}
            L${cx - bodyR * 0.3} ${bodyY + bodyR * 0.3} Z`}
        fill={glowColor}
        opacity={0.6}
      />
      <Path
        d={`M${cx + bodyR * 0.5} ${bodyY - bodyR * 0.6}
            Q${cx + bodyR * 1.2} ${bodyY + bodyR * 0.2} ${cx + bodyR * 0.8} ${bodyY + bodyR * 0.9}
            L${cx + bodyR * 0.3} ${bodyY + bodyR * 0.3} Z`}
        fill={glowColor}
        opacity={0.6}
      />
      {/* Collar / bow */}
      <Ellipse cx={cx} cy={bodyY - bodyR * 0.55} rx={bodyR * 0.35} ry={bodyR * 0.15} fill={glowColor} opacity={0.8} />
      {/* Belt */}
      <Rect x={cx - bodyR * 0.55} y={bodyY + bodyR * 0.1} width={bodyR * 1.1} height={bodyR * 0.1} rx={3} fill={glowColor} opacity={0.5} />
      {rarity === 'epic' || rarity === 'legendary' ? (
        <Circle cx={cx} cy={bodyY + bodyR * 0.15} r={bodyR * 0.08} fill="#FFF" opacity={0.7} />
      ) : null}
    </Svg>
  );
}

// ── Accessory designs ──
function AccessoryLayer({ cx, size, rarity, glowColor, emoji }: { cx: number; size: number; rarity: string; glowColor: string; emoji: string }) {
  const bodyY = size * 0.5;
  const bodyR = size * 0.28;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute' }}>
      {/* Shield / badge on side */}
      <G transform={`translate(${cx + bodyR * 0.9}, ${bodyY - bodyR * 0.2})`}>
        {/* Shield shape */}
        <Path
          d={`M0 ${-bodyR * 0.25} L${bodyR * 0.2} ${-bodyR * 0.15} L${bodyR * 0.2} ${bodyR * 0.1} L0 ${bodyR * 0.25} L${-bodyR * 0.2} ${bodyR * 0.1} L${-bodyR * 0.2} ${-bodyR * 0.15} Z`}
          fill={glowColor}
          opacity={0.8}
        />
        {rarity === 'legendary' && (
          <Circle cx={0} cy={0} r={bodyR * 0.08} fill="#FFF" opacity={0.9} />
        )}
      </G>
      {/* Floating companion particle */}
      <Circle cx={cx + bodyR * 0.6} cy={bodyY - bodyR * 0.8} r={bodyR * 0.07} fill={glowColor} opacity={0.6} />
      <Circle cx={cx + bodyR * 0.75} cy={bodyY - bodyR * 0.95} r={bodyR * 0.04} fill={glowColor} opacity={0.4} />
    </Svg>
  );
}

// ── Aura designs ──
function AuraLayer({ cx, size, rarity, glowColor }: { cx: number; size: number; rarity: string; glowColor: string }) {
  const cy = size * 0.48;
  const r = size * 0.42;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={glowColor} stopOpacity="0.15" />
          <Stop offset="50%" stopColor={glowColor} stopOpacity="0.05" />
          <Stop offset="100%" stopColor={glowColor} stopOpacity="0.15" />
        </LinearGradient>
      </Defs>
      {/* Outer ring */}
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={glowColor} strokeWidth={2} opacity={0.3} strokeDasharray="8 4" />
      {/* Inner glow */}
      <Circle cx={cx} cy={cy} r={r * 0.85} fill="url(#auraGrad)" />
      {/* Sparkle dots */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const px = cx + r * 0.9 * Math.cos(rad);
        const py = cy + r * 0.9 * Math.sin(rad);
        return <Circle key={deg} cx={px} cy={py} r={3} fill={glowColor} opacity={0.5} />;
      })}
    </Svg>
  );
}
