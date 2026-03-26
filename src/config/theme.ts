// ────────────────────────────────────────────────────────────
// WhereHere Design System
// ────────────────────────────────────────────────────────────

// ── Brand ──
export const BRAND = {
  primary: '#2DD4A8',
  primaryDark: '#1AAD8A',
  primaryLight: '#7EE8CA',
  gold: '#FFB800',
  purple: '#8B5CF6',
  coral: '#FF6B6B',
  kakaoYellow: '#FEE500',
  kakaoText: '#191919',
} as const;

// ── Event Category Colors ──
export const EVENT_COLORS = {
  exploration: '#10B981',
  photo: '#3B82F6',
  quiz: '#8B5CF6',
  partnership: '#F59E0B',
} as const;

// ── Rarity Colors (shared across modes) ──
export const RARITY = {
  common: '#9CA3AF',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
} as const;

// ── Color Palettes ──
const DARK_PALETTE = {
  ...BRAND,

  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#273449',
  surfaceHighlight: '#334155',

  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',

  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  ...RARITY,

  border: '#334155',
  borderLight: '#475569',

  tabBar: '#0F172A',
  tabBarBorder: '#1E293B',
  statusBar: 'light' as const,
} as const;

const LIGHT_PALETTE = {
  ...BRAND,

  background: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceLight: '#F1F5F9',
  surfaceHighlight: '#E2E8F0',

  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textDisabled: '#D1D5DB',

  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  ...RARITY,

  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  statusBar: 'dark' as const,
} as const;

export type ThemeColors = typeof DARK_PALETTE;
export type ColorMode = 'light' | 'dark';

export function getColors(mode: ColorMode): ThemeColors {
  return mode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}

// ── Backward-compatible default export (dark mode) ──
// Existing screens import { COLORS } — this keeps them working
// while new code can use the ThemeProvider for dynamic mode.
export const COLORS = DARK_PALETTE;

// ── Spacing ──
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ── Typography ──
export const FONT_FAMILY = {
  primary: 'Pretendard',
  narrative: 'NotoSerifKR',
  mono: 'SpaceMono',
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
} as const;

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// ── Border Radius ──
export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

// ── Shadows ──
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
} as const;

// ── Animation ──
export const ANIMATION = {
  press: { toValue: 0.97, duration: 80 },
  transition: 300,
  stagger: 60,
} as const;

// ── Accessibility ──
export const A11Y = {
  minTouchTarget: 44,
} as const;
