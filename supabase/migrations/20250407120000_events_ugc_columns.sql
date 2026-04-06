-- UGC 이벤트 생성(generate-ugc-event)이 insert 시 사용하는 컬럼
-- 기존 events 스키마에는 없어서 저장 단계가 항상 실패할 수 있음

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS status text;

-- CHECK 추가 전에 모든 행을 허용 값으로 맞춤 (NULL·빈 문자열·기타 값 대비)
UPDATE public.events
SET status = 'approved'
WHERE status IS NULL
   OR trim(status) = ''
   OR trim(status) NOT IN ('pending', 'approved', 'rejected');

ALTER TABLE public.events
  ALTER COLUMN status SET DEFAULT 'approved';

ALTER TABLE public.events
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS events_creator_id_idx ON public.events (creator_id);
CREATE INDEX IF NOT EXISTS events_status_idx ON public.events (status);
