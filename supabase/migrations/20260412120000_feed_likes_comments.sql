-- Feed social features: likes, comments, and enriched feed with counts
SET search_path = public;

-- ── Likes ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feed_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.community_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(submission_id, user_id)
);

CREATE INDEX IF NOT EXISTS feed_likes_submission_idx ON public.feed_likes(submission_id);
CREATE INDEX IF NOT EXISTS feed_likes_user_idx ON public.feed_likes(user_id);

ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY feed_likes_select ON public.feed_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY feed_likes_insert ON public.feed_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY feed_likes_delete ON public.feed_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.feed_likes TO authenticated;

-- ── Comments ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.community_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feed_comments_submission_idx ON public.feed_comments(submission_id, created_at);
CREATE INDEX IF NOT EXISTS feed_comments_user_idx ON public.feed_comments(user_id);

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY feed_comments_select ON public.feed_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY feed_comments_insert ON public.feed_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY feed_comments_delete ON public.feed_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.feed_comments TO authenticated;

-- ── RPC: toggle like ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.toggle_feed_like(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exists boolean;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_submission_id IS NULL THEN RAISE EXCEPTION 'invalid payload'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.feed_likes WHERE submission_id = p_submission_id AND user_id = v_uid
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.feed_likes WHERE submission_id = p_submission_id AND user_id = v_uid;
  ELSE
    INSERT INTO public.feed_likes (submission_id, user_id) VALUES (p_submission_id, v_uid);
  END IF;

  SELECT count(*) INTO v_count FROM public.feed_likes WHERE submission_id = p_submission_id;

  RETURN jsonb_build_object('liked', NOT v_exists, 'like_count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_feed_like(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_feed_like(uuid) TO authenticated;

-- ── RPC: add comment ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_feed_comment(p_submission_id uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_username text;
  v_avatar text;
  v_trimmed text := trim(coalesce(p_body, ''));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_submission_id IS NULL OR length(v_trimmed) < 1 OR length(v_trimmed) > 500 THEN
    RAISE EXCEPTION 'invalid payload';
  END IF;

  INSERT INTO public.feed_comments (submission_id, user_id, body)
  VALUES (p_submission_id, v_uid, v_trimmed)
  RETURNING id INTO v_id;

  SELECT p.username, p.avatar_url INTO v_username, v_avatar
  FROM public.profiles p WHERE p.id = v_uid;

  RETURN jsonb_build_object(
    'id', v_id,
    'user_id', v_uid,
    'username', v_username,
    'avatar_url', v_avatar,
    'body', v_trimmed,
    'created_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_feed_comment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_feed_comment(uuid, text) TO authenticated;

-- ── RPC: get comments ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_feed_comments(p_submission_id uuid, p_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'user_id', r.user_id,
        'username', r.username,
        'avatar_url', r.avatar_url,
        'body', r.body,
        'created_at', r.created_at
      )
      ORDER BY r.created_at ASC
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT c.id, c.user_id, p.username, p.avatar_url, c.body, c.created_at
    FROM public.feed_comments c
    JOIN public.profiles p ON p.id = c.user_id
    WHERE c.submission_id = p_submission_id
    ORDER BY c.created_at ASC
    LIMIT least(greatest(coalesce(p_limit, 50), 1), 200)
  ) r;
$$;

REVOKE ALL ON FUNCTION public.get_feed_comments(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed_comments(uuid, int) TO authenticated;

-- ── Update get_community_feed with like/comment counts ───────────────────────

CREATE OR REPLACE FUNCTION public.get_community_feed(p_limit int DEFAULT 40)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'user_id', x.user_id,
        'username', x.username,
        'avatar_url', x.avatar_url,
        'submission_type', x.submission_type,
        'image_url', x.image_url,
        'event_id', x.event_id,
        'event_title', x.event_title,
        'event_address', x.event_address,
        'event_district', x.event_district,
        'mission_title', x.mission_title,
        'mission_type', x.mission_type,
        'mission_blurb', x.mission_blurb,
        'completion_answer', x.completion_answer,
        'like_count', x.like_count,
        'comment_count', x.comment_count,
        'liked_by_me', x.liked_by_me,
        'created_at', x.created_at
      )
      ORDER BY x.created_at DESC
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      cs.id,
      cs.user_id,
      p.username,
      p.avatar_url,
      cs.submission_type,
      cs.image_url,
      cs.event_id,
      e.title AS event_title,
      e.address AS event_address,
      e.district AS event_district,
      m.title AS mission_title,
      m.mission_type::text AS mission_type,
      LEFT(COALESCE(NULLIF(trim(m.description), ''), ''), 160) AS mission_blurb,
      mc.answer AS completion_answer,
      (SELECT count(*) FROM public.feed_likes fl WHERE fl.submission_id = cs.id) AS like_count,
      (SELECT count(*) FROM public.feed_comments fc WHERE fc.submission_id = cs.id) AS comment_count,
      EXISTS(SELECT 1 FROM public.feed_likes fl2 WHERE fl2.submission_id = cs.id AND fl2.user_id = auth.uid()) AS liked_by_me,
      cs.created_at
    FROM public.community_submissions cs
    JOIN public.profiles p ON p.id = cs.user_id
    LEFT JOIN public.events e ON e.id = cs.event_id
    LEFT JOIN public.missions m ON m.id = cs.mission_id
    LEFT JOIN public.mission_completions mc ON mc.id = cs.mission_completion_id
    WHERE cs.visibility = 'public'
    ORDER BY cs.created_at DESC
    LIMIT least(greatest(coalesce(p_limit, 40), 1), 100)
  ) x;
$$;

REVOKE ALL ON FUNCTION public.get_community_feed(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_feed(int) TO authenticated;
