-- WhereHere — MBTI 개인화 시스템 (profiles.mbti)
--
-- 목적
--   각 사용자의 MBTI 16종 코드를 선택적으로 저장한다. AI Edge Function
--   (character-chat, generate-narrative, generate-quiz, generate-journal)에서
--   프롬프트 개인화 수정자로 주입되며, 같은 장소라도 사용자마다 다른
--   내러티브/톤을 경험하게 한다.
--
-- 설계 규약
--   1. 기존 profiles.explorer_type (온보딩 키워드 기반 추천)과 공존한다.
--      MBTI는 옵션이므로 NULL을 허용한다.
--   2. CHECK 제약으로 16종(E/I · N/S · T/F · J/P) 만 허용한다.
--      잘못된 문자열은 DB 레벨에서 거부된다.
--   3. 사용자는 언제든 NULL로 되돌릴 수 있어야 한다 (진단 안 함 상태).
--   4. RLS: 기존 profiles 정책(본인만 UPDATE/SELECT 소유 컬럼)을 그대로 상속.
--      별도 정책 추가는 필요하지 않다.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mbti TEXT DEFAULT NULL;

-- 값 제약: 16종 MBTI 코드만 허용 (NULL은 허용 — "선택하지 않음")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_mbti_code_chk'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_mbti_code_chk
      CHECK (mbti IS NULL OR mbti ~ '^[EI][NS][TF][JP]$');
  END IF;
END
$$;

COMMENT ON COLUMN public.profiles.mbti IS
  'Optional MBTI 4-letter code (e.g. ENFP, INTJ). NULL = not set. Consumed by AI Edge Functions for personalization only; never exposed back to users as AI self-awareness.';
