-- 탐험가 성격 진단 결과 (온보딩). character_type과 별도 서브타입/추천용.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS explorer_type JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.explorer_type IS
  'Personality quiz: { keywords[], type_name, type_code, recommended_character_type }';
