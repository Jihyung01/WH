-- ============================================
-- Description: ?붿쟻(Mark) 愿??RPC 4醫?--   - public.create_mark(...)            : ?앹꽦 + XP 吏湲?+ ?쇱? ?먮룞?앹꽦 ?뚮옒洹?--   - public.get_nearby_marks(...)       : 諛섍꼍 ???붿쟻 議고쉶 (PostGIS)
--   - public.get_my_marks(...)           : ???붿쟻 ??꾨씪??(?쇰퀎)
--   - public.get_today_mark_count()      : ?ㅻ뒛?????붿쟻 媛쒖닔
-- Breaking: no (?좉퇋 ?⑥닔留?異붽?)
-- Dependencies: 20260417120000_create_marks_table.sql
-- Rollback: DROP FUNCTION public.create_mark(...); ???섎떒 二쇱꽍 李몄“
-- ============================================

SET search_path = public, extensions;

BEGIN;

-- ?????????????????????????????????????????????????????????????????????????????
-- RPC 1: ?붿쟻 ?앹꽦
-- ?????????????????????????????????????????????????????????????????????????????

DROP FUNCTION IF EXISTS public.create_mark(
  text, text, double precision, double precision, text, jsonb, text, timestamptz, text
);

CREATE OR REPLACE FUNCTION public.create_mark(
  p_content     text,
  p_photo_url   text,
  p_lat         double precision,
  p_lng         double precision,
  p_district    text          DEFAULT NULL,
  p_music_json  jsonb         DEFAULT NULL,
  p_visibility  text          DEFAULT 'public',
  p_expires_at  timestamptz   DEFAULT NULL,
  p_emoji_icon  text          DEFAULT '?뱧'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid              uuid := auth.uid();
  v_content          text := btrim(coalesce(p_content, ''));
  v_photo_url        text := btrim(coalesce(p_photo_url, ''));
  v_visibility       text := lower(btrim(coalesce(p_visibility, 'public')));
  v_emoji_icon       text := coalesce(nullif(btrim(p_emoji_icon), ''), '?뱧');
  v_music            jsonb;
  v_xp_delta         integer := 2;
  v_mark             public.marks%ROWTYPE;
  v_new_total_xp     bigint;
  v_current_level    integer;
  v_today_count      integer;
  v_mark_json        json;
BEGIN
  -- 1. ?몄쬆 & ?낅젰 寃利?  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  IF char_length(v_content) < 1 OR char_length(v_content) > 200 THEN
    RAISE EXCEPTION 'content must be 1..200 chars' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_photo_url) < 8 THEN
    RAISE EXCEPTION 'photo_url required' USING ERRCODE = '22023';
  END IF;

  IF p_lat IS NULL OR p_lng IS NULL
     OR p_lat < -90 OR p_lat > 90
     OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'invalid coordinates' USING ERRCODE = '22023';
  END IF;

  IF v_visibility NOT IN ('public', 'friends', 'private') THEN
    RAISE EXCEPTION 'invalid visibility' USING ERRCODE = '22023';
  END IF;

  -- music_json? object ?뺥깭留??섎씫
  v_music := CASE
    WHEN p_music_json IS NOT NULL AND jsonb_typeof(p_music_json) = 'object' THEN p_music_json
    ELSE NULL
  END;

  -- 2. INSERT
  INSERT INTO public.marks (
    user_id, content, photo_url, location, district, music_json,
    visibility, expires_at, xp_granted, emoji_icon
  ) VALUES (
    v_uid,
    v_content,
    v_photo_url,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    nullif(btrim(coalesce(p_district, '')), ''),
    v_music,
    v_visibility,
    p_expires_at,
    v_xp_delta,
    v_emoji_icon
  )
  RETURNING * INTO v_mark;

  -- 3. XP 吏湲?(atomic increment)
  UPDATE public.profiles
  SET total_xp = coalesce(total_xp, 0) + v_xp_delta
  WHERE id = v_uid
  RETURNING total_xp, level INTO v_new_total_xp, v_current_level;

  -- ?꾨줈?꾩씠 ?꾩쭅 ?녿뒗 ?덉쇅 耳?댁뒪 諛⑹뼱
  IF v_new_total_xp IS NULL THEN
    v_new_total_xp := v_xp_delta;
    v_current_level := 1;
  END IF;

  -- 4. ?ㅻ뒛???붿쟻 ??(?앹꽦 吏곹썑 ?ы븿)
  SELECT count(*)
    INTO v_today_count
  FROM public.marks
  WHERE user_id = v_uid
    AND created_at >= date_trunc('day', now())
    AND created_at <  date_trunc('day', now()) + interval '1 day';

  -- 5. ?묐떟 援ъ꽦
  v_mark_json := json_build_object(
    'id',          v_mark.id,
    'user_id',     v_mark.user_id,
    'content',     v_mark.content,
    'photo_url',   v_mark.photo_url,
    'lat',         st_y(v_mark.location::geometry),
    'lng',         st_x(v_mark.location::geometry),
    'district',    v_mark.district,
    'music_json',  v_mark.music_json,
    'emoji_icon',  v_mark.emoji_icon,
    'visibility',  v_mark.visibility,
    'expires_at',  v_mark.expires_at,
    'xp_granted',  v_mark.xp_granted,
    'created_at',  v_mark.created_at
  );

  RETURN json_build_object(
    'mark',                    v_mark_json,
    'xp',                      v_new_total_xp,
    'level',                   v_current_level,
    'today_mark_count',        v_today_count,
    'should_generate_journal', (v_today_count >= 3)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_mark(
  text, text, double precision, double precision, text, jsonb, text, timestamptz, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_mark(
  text, text, double precision, double precision, text, jsonb, text, timestamptz, text
) TO authenticated;


-- ?????????????????????????????????????????????????????????????????????????????
-- RPC 2: 二쇰? ?붿쟻 議고쉶 (PostGIS + ?묒꽦??議곗씤)
-- ?????????????????????????????????????????????????????????????????????????????

DROP FUNCTION IF EXISTS public.get_nearby_marks(
  double precision, double precision, double precision, integer
);

CREATE OR REPLACE FUNCTION public.get_nearby_marks(
  p_lat         double precision,
  p_lng         double precision,
  p_radius_km   double precision DEFAULT 2.0,
  p_limit       integer          DEFAULT 50
)
RETURNS TABLE (
  id               uuid,
  user_id          uuid,
  content          text,
  photo_url        text,
  lat              double precision,
  lng              double precision,
  district         text,
  music_json       jsonb,
  emoji_icon       text,
  visibility       text,
  created_at       timestamptz,
  username         text,
  character_emoji  text,
  character_class  text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_radius_m double precision;
  v_limit    integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_lat IS NULL OR p_lng IS NULL
     OR p_lat < -90 OR p_lat > 90
     OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'invalid coordinates' USING ERRCODE = '22023';
  END IF;

  v_radius_m := GREATEST(0.05, LEAST(coalesce(p_radius_km, 2.0), 20.0)) * 1000.0;
  v_limit    := GREATEST(1, LEAST(coalesce(p_limit, 50), 200));

  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    m.content,
    m.photo_url,
    st_y(m.location::geometry) AS lat,
    st_x(m.location::geometry) AS lng,
    m.district,
    m.music_json,
    m.emoji_icon,
    m.visibility,
    m.created_at,
    p.username,
    -- characters?먮뒗 怨좎젙 emoji 而щ읆???놁쑝誘濡?name ??emoji 留ㅽ븨
    CASE c.name
      WHEN '?꾨떞' THEN '?뙮'
      WHEN '?섎옒' THEN '?쫳'
      WHEN '?섎엺' THEN '?뙄'
      WHEN '蹂꾩컡' THEN '狩?
      ELSE NULL
    END AS character_emoji,
    c.character_type AS character_class
  FROM public.marks m
  JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.characters c ON c.user_id = m.user_id
  WHERE
    (m.expires_at IS NULL OR m.expires_at > now())
    AND st_dwithin(
          m.location,
          st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
          v_radius_m
        )
    -- 李⑤떒 愿怨??쒖쇅 (?묐갑??
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE (ub.blocker_id = v_uid    AND ub.blocked_id = m.user_id)
         OR (ub.blocker_id = m.user_id AND ub.blocked_id = v_uid)
    )
    -- visibility ?꾪꽣
    AND (
      m.user_id = v_uid
      OR m.visibility = 'public'
      OR (
        m.visibility = 'friends'
        AND EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
            AND (
              (f.requester_id = v_uid    AND f.addressee_id = m.user_id)
              OR (f.requester_id = m.user_id AND f.addressee_id = v_uid)
            )
        )
      )
    )
  ORDER BY m.created_at DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_nearby_marks(
  double precision, double precision, double precision, integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nearby_marks(
  double precision, double precision, double precision, integer
) TO authenticated;


-- ?????????????????????????????????????????????????????????????????????????????
-- RPC 3: ???붿쟻 紐⑸줉 (?먰뿕 ?쇱???
-- ?????????????????????????????????????????????????????????????????????????????

DROP FUNCTION IF EXISTS public.get_my_marks(date, integer);

CREATE OR REPLACE FUNCTION public.get_my_marks(
  p_date  date    DEFAULT CURRENT_DATE,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id          uuid,
  content     text,
  photo_url   text,
  lat         double precision,
  lng         double precision,
  district    text,
  music_json  jsonb,
  emoji_icon  text,
  created_at  timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_date  date := coalesce(p_date, CURRENT_DATE);
  v_limit integer := GREATEST(1, LEAST(coalesce(p_limit, 50), 500));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.photo_url,
    st_y(m.location::geometry) AS lat,
    st_x(m.location::geometry) AS lng,
    m.district,
    m.music_json,
    m.emoji_icon,
    m.created_at
  FROM public.marks m
  WHERE m.user_id = v_uid
    AND m.created_at >= v_date::timestamptz
    AND m.created_at <  (v_date + 1)::timestamptz
  ORDER BY m.created_at ASC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_marks(date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_marks(date, integer) TO authenticated;


-- ?????????????????????????????????????????????????????????????????????????????
-- RPC 4: ?ㅻ뒛???붿쟻 ??(?쇱? ?먮룞?앹꽦 ?먮떒??
-- ?????????????????????????????????????????????????????????????????????????????

DROP FUNCTION IF EXISTS public.get_today_mark_count();

CREATE OR REPLACE FUNCTION public.get_today_mark_count()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT count(*)
    INTO v_count
  FROM public.marks
  WHERE user_id = v_uid
    AND created_at >= date_trunc('day', now())
    AND created_at <  date_trunc('day', now()) + interval '1 day';

  RETURN coalesce(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_today_mark_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_today_mark_count() TO authenticated;

COMMIT;

-- ============================================
-- ROLLBACK (?섎룞 ?ㅽ뻾??
-- ============================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.create_mark(
--   text, text, double precision, double precision, text, jsonb, text, timestamptz, text);
-- DROP FUNCTION IF EXISTS public.get_nearby_marks(
--   double precision, double precision, double precision, integer);
-- DROP FUNCTION IF EXISTS public.get_my_marks(date, integer);
-- DROP FUNCTION IF EXISTS public.get_today_mark_count();
-- COMMIT;
