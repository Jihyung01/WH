/**
 * Lightweight client-side filter for UGC (App Store Guideline 1.2 — objectionable content).
 * Server-side review still required; this blocks obvious cases before submit.
 */
const BANNED_SUBSTRINGS = [
  '씨발',
  '시발',
  '병신',
  '좆',
  'fuck',
  'shit',
  'nazi',
  'kill yourself',
  'kys',
];

export function validateUGCText(text: string): { ok: true } | { ok: false; message: string } {
  const lower = text.toLowerCase();
  for (const w of BANNED_SUBSTRINGS) {
    if (lower.includes(w.toLowerCase())) {
      return {
        ok: false,
        message: '부적절한 표현이 포함되어 있어 등록할 수 없습니다. 내용을 수정해 주세요.',
      };
    }
  }
  return { ok: true };
}
