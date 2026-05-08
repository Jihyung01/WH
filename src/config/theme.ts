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

// ────────────────────────────────────────────────────────────
// MANGA Design System (v2)
// ────────────────────────────────────────────────────────────
// Source of truth: docs/design/WhereHere_Manga.html :root variables.
// 기존 BRAND / DARK_PALETTE / LIGHT_PALETTE 와 공존. 점진적으로 화면별
// 적용. 모든 토큰은 manga 화면을 만들 때만 사용 (기존 화면 회귀 0).

export const MANGA = {
  ink:    '#1A1612',  // borders / text / primary accent
  paper:  '#FFFEF5',  // cream background
  paper2: '#FFF5DC',  // warm cream secondary background
  y:      '#FFD93D',  // primary yellow accent
  y2:     '#FFB400',  // darker yellow (active / pressed)
  r:      '#FF4757',  // urgent / 좋아요 / FAB
  b:      '#4FBDFF',  // info / 같이가기
  g:      '#3DDC97',  // online / 성공
  p:      '#C5A6FF',  // story / 친구 액센트
} as const;

// Friend avatar accent palette — 한글 이니셜 기반 색 자동 배정 (spec §0.3).
// 인덱스 = (이니셜 codepoint % 7).
export const MANGA_AVATAR_PALETTE = [
  '#FFD93D', // 노랑
  '#3DDC97', // 초록
  '#FF6B9A', // 핑크
  '#4FBDFF', // 시안
  '#FFB84D', // 오렌지
  '#C5A6FF', // 퍼플
  '#FF6B6B', // 다크레드
] as const;

// Hard ink shadow (만화 톤 핵심) — translate(N,N) + shadow 0 으로 도장 누르는 효과.
// ⚠️ Android: RN 의 shadowColor/shadowOffset 가 elevation 0 일 때도 일부 OEM 에서
// 무시되거나 sub-pixel offset 으로 깨짐. 정확히 hard shadow 가 필요한 곳은
// MangaCard 컴포넌트(추후 Phase 1)에서 absolute View 한 장 오프셋해서 표현.
// 이 토큰은 iOS 와 Android 의 elevation 폴백용 fallback 값.
export const MANGA_SHADOW = {
  sm: {
    shadowColor: MANGA.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  md: {
    shadowColor: MANGA.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  lg: {
    shadowColor: MANGA.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// Pixel offsets used by MangaCard (absolute View shadow trick on Android).
export const MANGA_SHADOW_OFFSET = {
  sm: 2,
  md: 3,
  lg: 4,
} as const;

// Common ink outline (border) applied to most manga cards / buttons.
export const MANGA_BORDER = {
  width: 2.5,
  color: MANGA.ink,
} as const;

// Manga corner radius scale (spec §0.1: 카드 11~16, 칩 5~8).
export const MANGA_RADIUS = {
  chip: 6,
  chipLg: 8,
  card: 14,
  cardLg: 16,
  cardXl: 22,  // phone-shell-scale 박스
  pill: 999,
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
// ⚠️ Phase 4 통합 패스: DARK_PALETTE 와 LIGHT_PALETTE 둘 다 manga paper 톤으로
// 통합. useTheme().colors 를 사용하는 모든 화면(채팅 sheet, CreateMarkSheet,
// 친구 프로필, etc.) 이 자동으로 manga 톤이 되어 톤 끊김 0.
const DARK_PALETTE = {
  ...BRAND,

  background: '#FFF5DC',         // manga paper2
  surface: '#FFFEF5',            // manga paper
  surfaceLight: '#FFF5DC',
  surfaceHighlight: '#F0E5C0',   // 베이지 강조 (선택된 슬롯 등)

  textPrimary: '#1A1612',        // manga ink
  textSecondary: 'rgba(26,22,18,0.65)',
  textMuted: 'rgba(26,22,18,0.5)',
  textDisabled: 'rgba(26,22,18,0.35)',

  success: '#3DDC97',
  warning: '#FFD93D',
  error: '#FF4757',
  info: '#4FBDFF',

  ...RARITY,

  border: '#1A1612',
  borderLight: 'rgba(26,22,18,0.3)',

  tabBar: '#FFFEF5',
  tabBarBorder: '#1A1612',
  statusBar: 'dark' as const,    // paper bg → dark status bar
} as const;

// 라이트 팔레트도 동일 manga (system 설정과 무관하게 같은 톤 유지)
const LIGHT_PALETTE = DARK_PALETTE;

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
// expo-font 로 등록한 키와 정확히 일치해야 함 (app/_layout.tsx 의 useFonts 참조).
// 등록되지 않은 fontFamily 는 RN 이 system 으로 silent fallback.
export const FONT_FAMILY = {
  primary: 'Pretendard-Regular',
  primaryMedium: 'Pretendard-SemiBold',
  primaryBold: 'Pretendard-Bold',
  display: 'BagelFatOne-Regular',  // 큰 숫자 / 만화 헤드라인
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
