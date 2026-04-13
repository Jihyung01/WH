import type { WeatherCondition, TimeOfDay } from '../services/weather';

export interface AmbientReaction {
  /** 캐릭터 위 오버레이 (우산·눈 등) */
  overlayEmoji: string | null;
  /** 말풍선/상황 대사 */
  line: string;
  /** 아바타 원형 위 야간 딤 (0~1) */
  nightDimOpacity?: number;
  /** 맑은 아침 밝은 톤 (0~1) */
  morningBrightOpacity?: number;
}

type CharKey = 'explorer' | 'foodie' | 'artist' | 'socialite';

function normalizeCharacterType(characterType: string): CharKey {
  const t = (characterType ?? 'explorer').toLowerCase();
  if (t === 'foodie') return 'foodie';
  if (t === 'artist') return 'artist';
  if (t === 'socialite') return 'socialite';
  return 'explorer';
}

const HEAT: Record<CharKey, string> = {
  explorer: '더워... 그늘진 카페에서 쉬면서 미션하는 건 어때? 🥵',
  foodie: '후끈한 날이야! 시원한 실내 맛집 미션 어때? 🥵',
  artist: '열기가 올라왔어... 에어컨 있는 전시 공간으로 가볼까? 🥵',
  socialite: '너무 덥다! 실내 소셜 이벤트가 딱이야 🥵',
};

const COLD: Record<CharKey, string> = {
  explorer: '추워! 따뜻한 실내 이벤트를 찾아보자 🥶',
  foodie: '입김이 나네~ 따뜻한 실내 맛집 탐험이 답이야 🥶',
  artist: '손끝이 차갑다... 갤러리나 카페 같은 실내로! 🥶',
  socialite: '패딩 필수 날씨! 실내 모임이 편해 🥶',
};

const RAIN: Record<CharKey, string> = {
  explorer: '비가 오네... 하지만 비 오는 날만의 이벤트가 있을지도? 🌧️',
  foodie: '빗소리랑 어울리는 카페 미션이 있을지도! 🌧️',
  artist: '빗방울 소리가 BGM 같아... 우산 챙겨서 가자 🌧️',
  socialite: '우산 쓰고 나가면 분위기 있잖아~ 비 한정 이벤트도! 🌧️',
};

const SNOW: Record<CharKey, string> = {
  explorer: '눈이다! 오늘만 나타나는 특별한 장소가 있을지도... ⛄',
  foodie: '눈 오는 날 핫초코 각이야~ 실내 미션 가자 ⛄',
  artist: '하얀 캔버스 같아... 눈 날만 열리는 장소가 있을지도 ⛄',
  socialite: '눈 사진 각! 친구들이랑 찍기 좋은 스팟 찾아볼래? ⛄',
};

const NIGHT: Record<CharKey, string> = {
  explorer: '밤의 도시는 낮과 완전히 다른 얼굴이야... 🌙',
  foodie: '야식 미션 각이야... 농담이고, 야간 한정 이벤트 체크! 🌙',
  artist: '네온과 그림자... 밤에만 보이는 풍경이 있어 🌙',
  socialite: '밤이 제일 살아나는 시간! 야간 이벤트 찾아보자 🌙',
};

const CLEAR_MORNING: Record<CharKey, string> = {
  explorer: '좋은 아침! 오늘은 어디를 탐험해볼까? ☀️',
  foodie: '상쾌한 아침! 브런치 스팟부터 찍어볼까? ☀️',
  artist: '아침 빛이 좋아... 포토 미션 하기 딱이야 ☀️',
  socialite: '굿모닝! 오늘도 어디서 사람들을 만날까? ☀️',
};

const DEFAULT_DAY: Record<CharKey, string> = {
  explorer: '오늘 이 동네에서 뭔가 특별한 게 기다리고 있을지도! 🌿',
  foodie: '배고프면 지도부터! 주변 맛집 이벤트 찾아보자 🍜',
  artist: '영감은 걸어 다닐 때 와... 주변 이벤트 둘러볼래? 🎨',
  socialite: '오늘은 어디서 새로운 인연을 만날까? ✨',
};

/**
 * 날씨·시간·기온에 따른 캐릭터 반응 (대사 우선순위: 한파/폭염 > 강수 > 밤 분위기 > 맑은 아침)
 */
export function getAmbientReaction(
  characterType: string,
  weather: WeatherCondition,
  timeOfDay: TimeOfDay,
  temperatureC: number,
  weatherKnown: boolean,
): AmbientReaction {
  const ck = normalizeCharacterType(characterType);

  if (weatherKnown && temperatureC >= 30) {
    return { overlayEmoji: null, line: HEAT[ck] };
  }
  if (weatherKnown && temperatureC <= -5) {
    return { overlayEmoji: null, line: COLD[ck] };
  }

  if (weatherKnown && (weather === 'rain' || weather === 'drizzle' || weather === 'thunderstorm')) {
    return { overlayEmoji: '🌂', line: RAIN[ck] };
  }
  if (weatherKnown && weather === 'snow') {
    return { overlayEmoji: '❄️', line: SNOW[ck] };
  }

  const nightDim = timeOfDay === 'night' ? 0.38 : undefined;
  if (timeOfDay === 'night') {
    return {
      overlayEmoji: null,
      line: NIGHT[ck],
      nightDimOpacity: nightDim,
    };
  }

  if (weatherKnown && weather === 'clear' && timeOfDay === 'morning') {
    return {
      overlayEmoji: null,
      line: CLEAR_MORNING[ck],
      morningBrightOpacity: 0.12,
    };
  }

  return {
    overlayEmoji: null,
    line: DEFAULT_DAY[ck],
  };
}
