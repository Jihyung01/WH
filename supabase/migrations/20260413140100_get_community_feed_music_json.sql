-- get_community_feed: music_json 포함
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
        'music_json', x.music_json,
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
      cs.music_json,
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
