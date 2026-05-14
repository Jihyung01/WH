-- Social stories: 24-hour photo posts shown on the Social tab.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_story_visibility') THEN
    CREATE TYPE public.social_story_visibility AS ENUM ('public', 'friends');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.social_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  visibility public.social_story_visibility NOT NULL DEFAULT 'friends',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS social_stories_active_idx
  ON public.social_stories (expires_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS social_stories_user_idx
  ON public.social_stories (user_id, created_at DESC);

ALTER TABLE public.social_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_stories_insert_own" ON public.social_stories;
CREATE POLICY "social_stories_insert_own"
  ON public.social_stories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "social_stories_update_own" ON public.social_stories;
CREATE POLICY "social_stories_update_own"
  ON public.social_stories FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "social_stories_delete_own" ON public.social_stories;
CREATE POLICY "social_stories_delete_own"
  ON public.social_stories FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "social_stories_read_visible" ON public.social_stories;
CREATE POLICY "social_stories_read_visible"
  ON public.social_stories FOR SELECT
  TO authenticated
  USING (
    expires_at > now()
    AND (
      user_id = auth.uid()
      OR visibility = 'public'
      OR (
        visibility = 'friends'
        AND EXISTS (
          SELECT 1
          FROM public.friendships f
          WHERE f.status = 'accepted'
            AND (
              (f.requester_id = auth.uid() AND f.addressee_id = social_stories.user_id)
              OR (f.addressee_id = auth.uid() AND f.requester_id = social_stories.user_id)
            )
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.create_social_story(
  p_photo_url text,
  p_caption text DEFAULT NULL,
  p_visibility public.social_story_visibility DEFAULT 'friends'
)
RETURNS public.social_stories
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_story public.social_stories;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '인증이 필요합니다.';
  END IF;
  IF nullif(trim(coalesce(p_photo_url, '')), '') IS NULL THEN
    RAISE EXCEPTION '사진이 필요합니다.';
  END IF;

  INSERT INTO public.social_stories(user_id, photo_url, caption, visibility)
  VALUES (
    auth.uid(),
    trim(p_photo_url),
    nullif(trim(coalesce(p_caption, '')), ''),
    coalesce(p_visibility, 'friends')
  )
  RETURNING * INTO v_story;

  RETURN v_story;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_social_stories(p_limit int DEFAULT 60)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  photo_url text,
  caption text,
  visibility public.social_story_visibility,
  created_at timestamptz,
  expires_at timestamptz,
  username text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    s.id,
    s.user_id,
    s.photo_url,
    s.caption,
    s.visibility,
    s.created_at,
    s.expires_at,
    p.username,
    p.avatar_url
  FROM public.social_stories s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE s.expires_at > now()
  ORDER BY s.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 60), 100));
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_stories TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_social_story(text, text, public.social_story_visibility) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_social_stories(int) TO authenticated;

UPDATE storage.buckets
SET public = true,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'mission-photos';

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

DROP POLICY IF EXISTS "mission_photos_owner_update" ON storage.objects;
CREATE POLICY "mission_photos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'mission-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('ugc-covers', 'marks', 'chat', 'stories')
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  )
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

DROP POLICY IF EXISTS "mission_photos_owner_delete" ON storage.objects;
CREATE POLICY "mission_photos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'mission-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('ugc-covers', 'marks', 'chat', 'stories')
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

NOTIFY pgrst, 'reload schema';
