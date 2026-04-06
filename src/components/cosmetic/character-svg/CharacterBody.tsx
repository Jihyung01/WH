import React from 'react';
import Svg, { Circle, Ellipse, Path, G, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * Base character body SVG.
 * 4 character types × 4 evolution stages = 16 variations.
 * Each draws a cute chibi-style creature.
 */

interface Props {
  type: string;       // explorer | foodie | artist | socialite
  stage: string;      // baby | teen | adult | legendary
  size?: number;
}

// Color palettes per character type
const PALETTES: Record<string, { body: string; belly: string; accent: string; eye: string; cheek: string }> = {
  explorer: { body: '#4ADE80', belly: '#BBF7D0', accent: '#166534', eye: '#14532D', cheek: '#F9A8D4' },
  foodie:   { body: '#60A5FA', belly: '#BFDBFE', accent: '#1E40AF', eye: '#1E3A5F', cheek: '#FCA5A5' },
  artist:   { body: '#F472B6', belly: '#FBCFE8', accent: '#9D174D', eye: '#4C0519', cheek: '#FDE68A' },
  socialite:{ body: '#FBBF24', belly: '#FEF3C7', accent: '#92400E', eye: '#451A03', cheek: '#FDA4AF' },
};

// Size multipliers per evolution stage
const STAGE_SCALE: Record<string, number> = {
  baby: 0.75,
  teen: 0.88,
  adult: 1.0,
  legendary: 1.05,
};

// Extra decorations per stage
const STAGE_FEATURES: Record<string, { crown: boolean; wings: boolean; glow: boolean; horns: boolean }> = {
  baby: { crown: false, wings: false, glow: false, horns: false },
  teen: { crown: false, wings: false, glow: false, horns: false },
  adult: { crown: false, wings: true, glow: false, horns: false },
  legendary: { crown: true, wings: true, glow: true, horns: true },
};

export function CharacterBody({ type, stage, size = 200 }: Props) {
  const p = PALETTES[type] ?? PALETTES.explorer;
  const scale = STAGE_SCALE[stage] ?? 1;
  const feat = STAGE_FEATURES[stage] ?? STAGE_FEATURES.baby;
  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  // Body proportions scaled
  const bodyR = (s * 0.28) * scale;
  const headR = (s * 0.22) * scale;
  const headY = cy - bodyR * 0.5;
  const bodyY = cy + headR * 0.3;

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <RadialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
          <Stop offset="0%" stopColor={p.body} stopOpacity="1" />
          <Stop offset="100%" stopColor={p.accent} stopOpacity="0.7" />
        </RadialGradient>
        <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={p.body} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={p.body} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Legendary glow */}
      {feat.glow && (
        <Circle cx={cx} cy={cy} r={s * 0.45} fill="url(#glowGrad)" />
      )}

      {/* Shadow */}
      <Ellipse cx={cx} cy={cy + bodyR + headR * 0.4} rx={bodyR * 0.7} ry={bodyR * 0.15} fill="#000" opacity={0.1} />

      {/* Body */}
      <Ellipse cx={cx} cy={bodyY} rx={bodyR} ry={bodyR * 1.1} fill="url(#bodyGrad)" />

      {/* Belly */}
      <Ellipse cx={cx} cy={bodyY + bodyR * 0.15} rx={bodyR * 0.6} ry={bodyR * 0.65} fill={p.belly} opacity={0.8} />

      {/* Feet */}
      <Ellipse cx={cx - bodyR * 0.45} cy={bodyY + bodyR * 0.9} rx={bodyR * 0.25} ry={bodyR * 0.15} fill={p.accent} opacity={0.6} />
      <Ellipse cx={cx + bodyR * 0.45} cy={bodyY + bodyR * 0.9} rx={bodyR * 0.25} ry={bodyR * 0.15} fill={p.accent} opacity={0.6} />

      {/* Arms */}
      <Ellipse cx={cx - bodyR * 0.85} cy={bodyY - bodyR * 0.1} rx={bodyR * 0.2} ry={bodyR * 0.35} fill={p.body} transform={`rotate(-15, ${cx - bodyR * 0.85}, ${bodyY - bodyR * 0.1})`} />
      <Ellipse cx={cx + bodyR * 0.85} cy={bodyY - bodyR * 0.1} rx={bodyR * 0.2} ry={bodyR * 0.35} fill={p.body} transform={`rotate(15, ${cx + bodyR * 0.85}, ${bodyY - bodyR * 0.1})`} />

      {/* Wings (adult+) */}
      {feat.wings && (
        <G opacity={0.5}>
          <Path
            d={`M${cx - bodyR * 0.7} ${bodyY - bodyR * 0.3} Q${cx - s * 0.4} ${bodyY - s * 0.25} ${cx - bodyR * 0.5} ${bodyY - bodyR * 0.8}`}
            fill={p.belly}
            stroke={p.accent}
            strokeWidth={1}
          />
          <Path
            d={`M${cx + bodyR * 0.7} ${bodyY - bodyR * 0.3} Q${cx + s * 0.4} ${bodyY - s * 0.25} ${cx + bodyR * 0.5} ${bodyY - bodyR * 0.8}`}
            fill={p.belly}
            stroke={p.accent}
            strokeWidth={1}
          />
        </G>
      )}

      {/* Head */}
      <Circle cx={cx} cy={headY} r={headR} fill={p.body} />

      {/* Ears / horns */}
      {feat.horns ? (
        <G>
          <Path d={`M${cx - headR * 0.5} ${headY - headR * 0.7} L${cx - headR * 0.7} ${headY - headR * 1.5} L${cx - headR * 0.2} ${headY - headR * 0.8} Z`} fill={p.accent} />
          <Path d={`M${cx + headR * 0.5} ${headY - headR * 0.7} L${cx + headR * 0.7} ${headY - headR * 1.5} L${cx + headR * 0.2} ${headY - headR * 0.8} Z`} fill={p.accent} />
        </G>
      ) : (
        <G>
          <Ellipse cx={cx - headR * 0.7} cy={headY - headR * 0.6} rx={headR * 0.25} ry={headR * 0.35} fill={p.body} transform={`rotate(-20, ${cx - headR * 0.7}, ${headY - headR * 0.6})`} />
          <Ellipse cx={cx + headR * 0.7} cy={headY - headR * 0.6} rx={headR * 0.25} ry={headR * 0.35} fill={p.body} transform={`rotate(20, ${cx + headR * 0.7}, ${headY - headR * 0.6})`} />
          <Ellipse cx={cx - headR * 0.7} cy={headY - headR * 0.6} rx={headR * 0.15} ry={headR * 0.2} fill={p.cheek} opacity={0.5} transform={`rotate(-20, ${cx - headR * 0.7}, ${headY - headR * 0.6})`} />
          <Ellipse cx={cx + headR * 0.7} cy={headY - headR * 0.6} rx={headR * 0.15} ry={headR * 0.2} fill={p.cheek} opacity={0.5} transform={`rotate(20, ${cx + headR * 0.7}, ${headY - headR * 0.6})`} />
        </G>
      )}

      {/* Crown (legendary) */}
      {feat.crown && (
        <Path
          d={`M${cx - headR * 0.5} ${headY - headR * 0.9}
              L${cx - headR * 0.4} ${headY - headR * 1.4}
              L${cx - headR * 0.15} ${headY - headR * 1.1}
              L${cx} ${headY - headR * 1.5}
              L${cx + headR * 0.15} ${headY - headR * 1.1}
              L${cx + headR * 0.4} ${headY - headR * 1.4}
              L${cx + headR * 0.5} ${headY - headR * 0.9} Z`}
          fill="#FBBF24"
          stroke="#D97706"
          strokeWidth={1}
        />
      )}

      {/* Eyes */}
      <G>
        {/* Eye whites */}
        <Ellipse cx={cx - headR * 0.3} cy={headY - headR * 0.05} rx={headR * 0.18} ry={headR * 0.2} fill="#FFF" />
        <Ellipse cx={cx + headR * 0.3} cy={headY - headR * 0.05} rx={headR * 0.18} ry={headR * 0.2} fill="#FFF" />
        {/* Pupils */}
        <Circle cx={cx - headR * 0.28} cy={headY - headR * 0.03} r={headR * 0.1} fill={p.eye} />
        <Circle cx={cx + headR * 0.28} cy={headY - headR * 0.03} r={headR * 0.1} fill={p.eye} />
        {/* Eye shine */}
        <Circle cx={cx - headR * 0.32} cy={headY - headR * 0.09} r={headR * 0.04} fill="#FFF" />
        <Circle cx={cx + headR * 0.24} cy={headY - headR * 0.09} r={headR * 0.04} fill="#FFF" />
      </G>

      {/* Mouth */}
      <Path
        d={`M${cx - headR * 0.15} ${headY + headR * 0.25} Q${cx} ${headY + headR * 0.4} ${cx + headR * 0.15} ${headY + headR * 0.25}`}
        fill="none"
        stroke={p.accent}
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* Cheeks */}
      <Ellipse cx={cx - headR * 0.55} cy={headY + headR * 0.15} rx={headR * 0.15} ry={headR * 0.1} fill={p.cheek} opacity={0.6} />
      <Ellipse cx={cx + headR * 0.55} cy={headY + headR * 0.15} rx={headR * 0.15} ry={headR * 0.1} fill={p.cheek} opacity={0.6} />
    </Svg>
  );
}
