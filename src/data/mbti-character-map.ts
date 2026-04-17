/**
 * MBTI → 스타터 캐릭터 "친화도" 매핑.
 *
 * 이 매핑은 **추천** 용도이지, 강제가 아니다.
 * 사용자가 MBTI를 선택하면 기본적으로 이 캐릭터가 온보딩에서 하이라이트되지만,
 * 언제든 다른 캐릭터를 고를 수 있다.
 *
 * 매핑 근거 (요약)
 *   - 도담 (explorer):  외향·탐색·즉흥형 — 길을 찾고 발견하는 성향
 *   - 나래 (foodie):    현실·감각·책임형 — 맛/일상/전통 선호
 *   - 하람 (artist):    내향·직관·감성형 — 분위기/의미/시적 감수성
 *   - 별찌 (socialite): 주도·비전·관계형 — 커뮤니티/영향력/리더십
 *
 * 참고: 16종 → 4 그룹으로 압축했기 때문에 완벽한 성격 이론 일치는 아니며,
 * WhereHere 캐릭터 4종의 톤에 가장 가까운 쪽으로 배치했다.
 */

import type { MBTICode } from '../types/models';

export type CharacterClass = 'explorer' | 'foodie' | 'artist' | 'socialite';

export const MBTI_CHARACTER_AFFINITY: Record<MBTICode, CharacterClass> = {
  // 탐험가 도담 (explorer): E·P (외향 + 탐색형)
  ENFP: 'explorer',
  ENTP: 'explorer',
  ESFP: 'explorer',
  ESTP: 'explorer',

  // 미식가 나래 (foodie): SJ (감각 + 판단형 — 전통/일상/맛)
  ISFJ: 'foodie',
  ESFJ: 'foodie',
  ISTJ: 'foodie',
  ESTJ: 'foodie',

  // 예술가 하람 (artist): 내향 + 직관/감성 — 분위기/의미 지향
  INFP: 'artist',
  INFJ: 'artist',
  ISFP: 'artist',
  INTP: 'artist',

  // 소셜러 별찌 (socialite): 주도/비전/손재주
  ENFJ: 'socialite',
  ENTJ: 'socialite',
  INTJ: 'socialite',
  ISTP: 'socialite',
};

/**
 * MBTI 코드로부터 추천 캐릭터 클래스를 반환한다.
 * MBTI가 없거나 알 수 없는 값이면 null (온보딩에서 퀴즈 추천 결과나 기본값 사용).
 */
export function recommendCharacterFromMBTI(
  mbti: MBTICode | string | null | undefined,
): CharacterClass | null {
  if (!mbti) return null;
  const upper = mbti.toUpperCase() as MBTICode;
  return MBTI_CHARACTER_AFFINITY[upper] ?? null;
}

/** 지원 MBTI 코드 전체 (UI 그리드 렌더링용). 4×4 배열로 그룹화되어 있다. */
export const MBTI_CODES_GRID: MBTICode[][] = [
  ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
  ['INFJ', 'INFP', 'ENFJ', 'ENFP'],
  ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
  ['ISTP', 'ISFP', 'ESTP', 'ESFP'],
];
