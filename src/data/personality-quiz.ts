/**
 * 온보딩 탐험가 성격 진단 — 카드 정의 + 점수/유형 산출
 */

import type { ExplorerTypePayload } from '../types/models';

export type PersonalityKeyword =
  | 'treasure'
  | 'wonder'
  | 'dawn'
  | 'dusk'
  | 'neon'
  | 'starlight'
  | 'show'
  | 'keep'
  | 'trend'
  | 'heritage';

export type StarterCharacterType = 'explorer' | 'foodie' | 'artist' | 'socialite';

export interface QuizOption {
  keyword: PersonalityKeyword;
  codeLetter: string;
  emoji: string;
  title: string;
  body: string;
}

export interface QuizCardDef {
  id: string;
  gradientLeft: [string, string];
  gradientRight: [string, string];
  left: QuizOption;
  right: QuizOption;
}

/** 카드 5(트렌드 vs 역사) 포함 여부 — 4장만 쓰려면 false */
export const PERSONALITY_QUIZ_INCLUDE_CARD_5 = true;

export const KEYWORD_BADGE: Record<
  PersonalityKeyword,
  { emoji: string; label: string }
> = {
  treasure: { emoji: '🗺️', label: '보물 찾기' },
  wonder: { emoji: '🌀', label: '길 잃기' },
  dawn: { emoji: '🌅', label: '새벽' },
  dusk: { emoji: '🌙', label: '밤' },
  neon: { emoji: '🏙️', label: '활기' },
  starlight: { emoji: '🌲', label: '사색' },
  show: { emoji: '📸', label: '전시' },
  keep: { emoji: '📓', label: '기록' },
  trend: { emoji: '✨', label: '트렌드' },
  heritage: { emoji: '🏛️', label: '역사' },
};

const CHARACTER_META: Record<
  StarterCharacterType,
  { type_name: string; blurb: string; koreanName: string; emoji: string }
> = {
  explorer: {
    type_name: '별빛 아래 방랑자',
    blurb:
      '고요한 새벽, 숲길 위의 탐험가. 도담이는 당신처럼 느린 걸음 속에서 세상을 발견해요.',
    koreanName: '도담',
    emoji: '🌿',
  },
  foodie: {
    type_name: '네온 시티의 헌터',
    blurb:
      '밤의 도시를 누비는 트렌드세터. 나래는 당신처럼 핫한 장소를 가장 먼저 찾아내요.',
    koreanName: '나래',
    emoji: '💨',
  },
  artist: {
    type_name: '시간의 기록자',
    blurb:
      '오래된 이야기를 수집하는 관찰자. 하람은 당신처럼 깊이 있는 탐험을 좋아해요.',
    koreanName: '하람',
    emoji: '☀️',
  },
  socialite: {
    type_name: '광장의 이야기꾼',
    blurb:
      '모두와 함께 즐기는 소셜 탐험가. 별찌는 당신처럼 경험을 나누는 걸 좋아해요.',
    koreanName: '별찌',
    emoji: '⭐',
  },
};

const ALL_CARDS: QuizCardDef[] = [
  {
    id: 'goal_flow',
    gradientLeft: ['#0F766E', '#14B8A6'],
    gradientRight: ['#4C1D95', '#7C3AED'],
    left: {
      keyword: 'treasure',
      codeLetter: 'T',
      emoji: '🗺️',
      title: '보물 찾기',
      body: '목적지가 명확한 퀘스트. 맛집, 랜드마크, 스탬프를 수집하고 싶어.',
    },
    right: {
      keyword: 'wonder',
      codeLetter: 'W',
      emoji: '🌀',
      title: '길 잃기',
      body: '정처 없이 걸으며 우연한 발견을 즐겨. 골목길, 숨은 공간, 예상 밖의 만남.',
    },
  },
  {
    id: 'dawn_dusk',
    gradientLeft: ['#EA580C', '#FB923C'],
    gradientRight: ['#1E1B4B', '#4338CA'],
    left: {
      keyword: 'dawn',
      codeLetter: 'A',
      emoji: '🌅',
      title: '아침의 첫 빛',
      body: '새벽과 아침의 고요함 속에서 탐험을 시작해. 상쾌한 공기가 좋아.',
    },
    right: {
      keyword: 'dusk',
      codeLetter: 'U',
      emoji: '🌙',
      title: '밤의 네온사인',
      body: '해가 지고 나서 진짜 모험이 시작돼. 야경, 조명, 밤거리가 나의 무대.',
    },
  },
  {
    id: 'neon_star',
    gradientLeft: ['#B45309', '#F59E0B'],
    gradientRight: ['#064E3B', '#059669'],
    left: {
      keyword: 'neon',
      codeLetter: 'N',
      emoji: '🏙️',
      title: '군중 속의 활기',
      body: '사람들이 북적이는 광장, 시장, 축제에서 에너지를 얻어.',
    },
    right: {
      keyword: 'starlight',
      codeLetter: 'S',
      emoji: '🌲',
      title: '숲속의 사색',
      body: '인적 드문 오솔길, 고요한 공원, 별빛 아래서 충전해.',
    },
  },
  {
    id: 'show_keep',
    gradientLeft: ['#BE185D', '#EC4899'],
    gradientRight: ['#334155', '#64748B'],
    left: {
      keyword: 'show',
      codeLetter: 'O',
      emoji: '📸',
      title: '전시하는 수집가',
      body: '남들에게 보여줄 멋진 사진, 배지, 전리품을 모아. SNS 공유가 즐거워.',
    },
    right: {
      keyword: 'keep',
      codeLetter: 'K',
      emoji: '📓',
      title: '간직하는 기록가',
      body: '나만의 일기, 에피소드, 감정을 기록해. 조용히 쌓이는 추억이 소중해.',
    },
  },
  {
    id: 'trend_heritage',
    gradientLeft: ['#DB2777', '#F472B6'],
    gradientRight: ['#78350F', '#B45309'],
    left: {
      keyword: 'trend',
      codeLetter: 'R',
      emoji: '✨',
      title: '힙한 트렌드',
      body: '지금 가장 핫한 신상 카페, 팝업스토어, SNS 핫플을 찾아다녀.',
    },
    right: {
      keyword: 'heritage',
      codeLetter: 'H',
      emoji: '🏛️',
      title: '숨겨진 역사',
      body: '오래된 노포, 유적지, 골목에 담긴 이야기를 발굴해.',
    },
  },
];

export function getPersonalityQuizCards(): QuizCardDef[] {
  if (PERSONALITY_QUIZ_INCLUDE_CARD_5) return ALL_CARDS;
  return ALL_CARDS.slice(0, 4);
}

/** 키워드 하나당 캐릭터 가중치 (합산 후 최댓값 추천) */
const KEYWORD_WEIGHTS: Record<PersonalityKeyword, Record<StarterCharacterType, number>> = {
  treasure: { explorer: 0, foodie: 3, artist: 0, socialite: 0 },
  wonder: { explorer: 4, foodie: 0, artist: 0, socialite: 0 },
  dawn: { explorer: 3, foodie: 0, artist: 1, socialite: 0 },
  dusk: { explorer: 0, foodie: 3, artist: 0, socialite: 1 },
  neon: { explorer: 0, foodie: 2, artist: 0, socialite: 3 },
  starlight: { explorer: 3, foodie: 0, artist: 3, socialite: 0 },
  show: { explorer: 0, foodie: 0, artist: 1, socialite: 4 },
  keep: { explorer: 1, foodie: 0, artist: 4, socialite: 0 },
  trend: { explorer: 0, foodie: 2, artist: 0, socialite: 3 },
  heritage: { explorer: 0, foodie: 0, artist: 5, socialite: 0 },
};

const CHAR_ORDER: StarterCharacterType[] = ['explorer', 'foodie', 'artist', 'socialite'];

export function scorePersonalityKeywords(
  keywords: PersonalityKeyword[],
): Record<StarterCharacterType, number> {
  const scores: Record<StarterCharacterType, number> = {
    explorer: 0,
    foodie: 0,
    artist: 0,
    socialite: 0,
  };
  for (const k of keywords) {
    const w = KEYWORD_WEIGHTS[k];
    for (const c of CHAR_ORDER) {
      scores[c] += w[c];
    }
  }
  return scores;
}

export function pickRecommendedCharacter(
  scores: Record<StarterCharacterType, number>,
): StarterCharacterType {
  let best: StarterCharacterType = 'explorer';
  let bestScore = -1;
  for (const c of CHAR_ORDER) {
    if (scores[c] > bestScore) {
      bestScore = scores[c];
      best = c;
    }
  }
  return best;
}

export interface PersonalityResult {
  keywords: PersonalityKeyword[];
  type_code: string;
  type_name: string;
  recommended_character_type: StarterCharacterType;
  blurb: string;
  recommendedKoreanName: string;
  recommendedEmoji: string;
  scores: Record<StarterCharacterType, number>;
}

export function buildPersonalityResult(keywords: PersonalityKeyword[]): PersonalityResult {
  const scores = scorePersonalityKeywords(keywords);
  const recommended_character_type = pickRecommendedCharacter(scores);
  const meta = CHARACTER_META[recommended_character_type];
  const type_code = keywords.map((k) => {
    const card = ALL_CARDS.find((c) => c.left.keyword === k || c.right.keyword === k);
    const opt =
      card?.left.keyword === k ? card.left : card?.right.keyword === k ? card.right : null;
    return opt?.codeLetter ?? k[0]!.toUpperCase();
  }).join('');

  return {
    keywords,
    type_code,
    type_name: meta.type_name,
    recommended_character_type,
    blurb: meta.blurb,
    recommendedKoreanName: meta.koreanName,
    recommendedEmoji: meta.emoji,
    scores,
  };
}

export function resultToExplorerPayload(result: PersonalityResult): ExplorerTypePayload {
  return {
    keywords: [...result.keywords],
    type_name: result.type_name,
    type_code: result.type_code,
    recommended_character_type: result.recommended_character_type,
  };
}
