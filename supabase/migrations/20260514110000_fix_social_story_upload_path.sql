-- Make story creation independent from caller RLS edge cases and keep
-- the dedicated stories storage prefix allowed.

CREATE OR REPLACE FUNCTION public.create_social_story(
  p_photo_url text,
  p_caption text DEFAULT NULL,
  p_visibility public.social_story_visibility DEFAULT 'friends'
)
RETURNS public.social_stories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  v_story public.social_stories;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION '인증이 필요합니다.';
  END IF;
  IF nullif(trim(coalesce(p_photo_url, '')), '') IS NULL THEN
    RAISE EXCEPTION '사진이 필요합니다.';
  END IF;

  INSERT INTO public.social_stories(user_id, photo_url, caption, visibility)
  VALUES (
    me,
    trim(p_photo_url),
    nullif(trim(coalesce(p_caption, '')), ''),
    coalesce(p_visibility, 'friends')
  )
  RETURNING * INTO v_story;

  RETURN v_story;
END;
$$;

DROP POLICY IF EXISTS "mission_photos_owner_insert" ON storage.objects;
CREATE POLICY "mission_photos_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mission-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('ugc-covers', 'marks', 'chat', 'stories')
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

GRANT EXECUTE ON FUNCTION public.create_social_story(text, text, public.social_story_visibility) TO authenticated;
NOTIFY pgrst, 'reload schema';
