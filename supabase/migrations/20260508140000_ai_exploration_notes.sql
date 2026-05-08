-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 7 — ai_exploration_notes 캐시 테이블
--   generate-exploration-note Edge Function 의 결과를 7일 캐시.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_exploration_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest text NOT NULL,
  recent_category text NOT NULL,
  line text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_exploration_notes_user_created_idx
  ON public.ai_exploration_notes (user_id, created_at DESC);

ALTER TABLE public.ai_exploration_notes ENABLE ROW LEVEL SECURITY;

-- 본인 노트만 조회.
DROP POLICY IF EXISTS ai_exploration_notes_select_own ON public.ai_exploration_notes;
CREATE POLICY ai_exploration_notes_select_own
  ON public.ai_exploration_notes
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT 는 service role(Edge Function) 만. authenticated 직접 INSERT 금지.
DROP POLICY IF EXISTS ai_exploration_notes_insert_self ON public.ai_exploration_notes;
CREATE POLICY ai_exploration_notes_insert_self
  ON public.ai_exploration_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 클라이언트가 쉽게 읽도록 RPC 노출 (최신 1건).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_latest_exploration_note()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT interest, recent_category, line, created_at
    INTO v_row
    FROM public.ai_exploration_notes
   WHERE user_id = v_uid
   ORDER BY created_at DESC
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'interest', v_row.interest,
    'recent_category', v_row.recent_category,
    'line', v_row.line,
    'created_at', v_row.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_exploration_note() TO authenticated;

NOTIFY pgrst, 'reload schema';
