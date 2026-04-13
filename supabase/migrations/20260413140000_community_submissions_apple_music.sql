-- Apple Music 메타(검색·미리듣기 URL)를 피드 게시물에 선택적으로 저장
SET search_path = public;

ALTER TABLE public.community_submissions
  ADD COLUMN IF NOT EXISTS music_json jsonb DEFAULT NULL;

COMMENT ON COLUMN public.community_submissions.music_json IS
  'Apple Music 카탈로그 첨부: song id, title, artist, artwork, preview_url, apple_music_url';

CREATE OR REPLACE FUNCTION public.update_community_submission_music(
  p_submission_id uuid,
  p_music jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_submission_id IS NULL THEN
    RAISE EXCEPTION 'invalid submission';
  END IF;

  UPDATE public.community_submissions
  SET music_json = CASE
    WHEN p_music IS NOT NULL AND jsonb_typeof(p_music) = 'object' THEN p_music
    ELSE NULL
  END
  WHERE id = p_submission_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission not found or forbidden';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_community_submission_music(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_community_submission_music(uuid, jsonb) TO authenticated;
