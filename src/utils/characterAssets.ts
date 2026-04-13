/**
 * Supabase Storage `character-assets` 버킷 기준 캐릭터 스프라이트 URL + 폴백 이모지.
 * 폴더: dodam | narae | haram | byeolzzi / baby | teen | adult | legendary.png
 */

const BUCKET = 'character-assets';

export type EvolutionStage = 'baby' | 'teen' | 'adult' | 'legendary';

/** 진화 단계별 레벨 구간 (포함 범위) */
export const EVOLUTION_STAGES: Record<EvolutionStage, readonly [number, number]> = {
  baby: [1, 5],
  teen: [6, 15],
  adult: [16, 30],
  legendary: [31, Number.POSITIVE_INFINITY],
};

const TYPE_TO_FOLDER: Record<string, string> = {
  explorer: 'dodam',
  foodie: 'narae',
  artist: 'haram',
  socialite: 'byeolzzi',
};

const FALLBACK_EMOJI: Record<string, Record<EvolutionStage, string>> = {
  explorer: { baby: '🌱', teen: '🌿', adult: '🌳', legendary: '🏔️' },
  foodie: { baby: '🍃', teen: '💨', adult: '🌊', legendary: '🌪️' },
  artist: { baby: '🌤️', teen: '☀️', adult: '🔥', legendary: '💎' },
  socialite: { baby: '✨', teen: '⭐', adult: '🌟', legendary: '💫' },
};

const STAGE_FILE: Record<EvolutionStage, string> = {
  baby: 'baby',
  teen: 'teen',
  adult: 'adult',
  legendary: 'legendary',
};

export function getEvolutionStage(level: number): EvolutionStage {
  if (level <= 5) return 'baby';
  if (level <= 15) return 'teen';
  if (level <= 30) return 'adult';
  return 'legendary';
}

function supabasePublicBase(): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
  return base;
}

/** Storage public object URL (이미지 없으면 onError로 이모지 폴백) */
export function getCharacterImageUrl(characterType: string, evolutionStage: EvolutionStage): string {
  const base = supabasePublicBase();
  if (!base) return '';
  const folder = TYPE_TO_FOLDER[characterType] ?? 'dodam';
  const file = STAGE_FILE[evolutionStage];
  return `${base}/storage/v1/object/public/${BUCKET}/${folder}/${file}.png`;
}

export function getCharacterEmoji(characterType: string, evolutionStage: EvolutionStage): string {
  const row = FALLBACK_EMOJI[characterType] ?? FALLBACK_EMOJI.explorer;
  return row[evolutionStage] ?? '🧑‍🚀';
}

export type DistrictTint = { color: string; opacity: number };

/** favorite_district 문자열 + (선택) 야간 탐험 비중 → 아바타 위 색조 오버레이 */
export function getDistrictTintOverlay(
  favoriteDistrict: string | null | undefined,
  options?: { nightExplorationHeavy?: boolean },
): DistrictTint | null {
  if (options?.nightExplorationHeavy) {
    return { color: '#4C1D95', opacity: 0.22 };
  }
  const d = (favoriteDistrict ?? '').toLowerCase();
  if (!d.trim()) return null;
  if (d.includes('성수')) return { color: '#2563EB', opacity: 0.18 };
  if (d.includes('홍대') || d.includes('합정')) return { color: '#DB2777', opacity: 0.16 };
  if (d.includes('종로') || d.includes('광화문') || d.includes('인사')) return { color: '#D97706', opacity: 0.18 };
  if (d.includes('한강') || d.includes('공원') || d.includes('뚝섬') || d.includes('여의도')) {
    return { color: '#059669', opacity: 0.16 };
  }
  return null;
}

export const EVOLUTION_STAGE_LABEL_EN: Record<EvolutionStage, string> = {
  baby: 'Baby',
  teen: 'Teen',
  adult: 'Adult',
  legendary: 'Legendary',
};
