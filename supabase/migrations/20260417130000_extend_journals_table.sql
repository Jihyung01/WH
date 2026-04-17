-- ============================================
-- Description: journals 테이블을 타임라인 포맷으로 확장
--   - format: 'narrative' | 'timeline' (기본 'narrative' — 기존 행 하위호환)
--   - timeline_data: 구조화된 타임라인(JSONB)
--   - mark_ids: 이 일지에 포함된 흔적 UUID 배열
--   - districts: 방문 구 배열(정규화된 위치 요약)
--   - auto_generated: 흔적 3개 누적으로 자동 생성된 경우 true
-- Breaking: no (모든 컬럼 IF NOT EXISTS + DEFAULT)
-- Dependencies: 20250327120004_journals.sql, 20260417120000_create_marks_table.sql
-- Rollback: 하단 주석 참조
-- ============================================

SET search_path = public, extensions;

BEGIN;

-- 1. 컬럼 추가
ALTER TABLE public.journals
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'narrative'
    CHECK (format IN ('narrative', 'timeline'));

ALTER TABLE public.journals
  ADD COLUMN IF NOT EXISTS timeline_data JSONB;

ALTER TABLE public.journals
  ADD COLUMN IF NOT EXISTS mark_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE public.journals
  ADD COLUMN IF NOT EXISTS districts TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.journals
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false;

-- 2. 조회 성능
CREATE INDEX IF NOT EXISTS journals_format_idx
  ON public.journals (format);

CREATE INDEX IF NOT EXISTS journals_auto_generated_idx
  ON public.journals (auto_generated)
  WHERE auto_generated = true;

-- 3. 문서화
COMMENT ON COLUMN public.journals.format IS
  '''narrative''(서술형, 기존) 또는 ''timeline''(흔적 기반 구조화).';
COMMENT ON COLUMN public.journals.timeline_data IS
  'format=timeline일 때의 구조화 페이로드: {intro, timeline[], outro, total_marks, total_checkins, districts_visited}.';
COMMENT ON COLUMN public.journals.mark_ids IS
  '이 일지를 구성한 marks.id 배열. 시간순.';
COMMENT ON COLUMN public.journals.districts IS
  '방문한 자치구 이름 배열(중복 제거).';
COMMENT ON COLUMN public.journals.auto_generated IS
  '흔적 ≥3개 누적으로 자동 트리거되어 생성된 일지 여부.';

COMMIT;

-- ============================================
-- ROLLBACK (수동 실행용)
-- ============================================
-- BEGIN;
-- DROP INDEX IF EXISTS public.journals_auto_generated_idx;
-- DROP INDEX IF EXISTS public.journals_format_idx;
-- ALTER TABLE public.journals
--   DROP COLUMN IF EXISTS auto_generated,
--   DROP COLUMN IF EXISTS districts,
--   DROP COLUMN IF EXISTS mark_ids,
--   DROP COLUMN IF EXISTS timeline_data,
--   DROP COLUMN IF EXISTS format;
-- COMMIT;
