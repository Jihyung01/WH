SET search_path = public, extensions;

--------------------------------------------------------------------------------
-- get_friends: 친구 프로필에 location_sharing 플래그 포함 (소셜 탭 UI용)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_friends(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_friends jsonb;
  v_pending jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'friendship_id', f.id,
    'user_id', CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'level', c.level,
    'character_type', c.character_type,
    'location_sharing', COALESCE(p.location_sharing, false)
  ) ORDER BY p.username), '[]'::jsonb) INTO v_friends
  FROM public.friendships f
  JOIN public.profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  LEFT JOIN public.characters c ON c.user_id = p.id
  WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id) AND f.status = 'accepted';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'friendship_id', f.id,
    'user_id', f.requester_id,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'created_at', f.created_at
  ) ORDER BY f.created_at DESC), '[]'::jsonb) INTO v_pending
  FROM public.friendships f
  JOIN public.profiles p ON p.id = f.requester_id
  WHERE f.addressee_id = p_user_id AND f.status = 'pending';

  RETURN jsonb_build_object('friends', v_friends, 'pending_requests', v_pending);
END;
$$;

REVOKE ALL ON FUNCTION public.get_friends(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_friends(uuid) TO authenticated, service_role;

--------------------------------------------------------------------------------
-- get_public_profile: 다른 유저 공개 프로필 (캐릭터 + 위치 공개 조건)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_profile(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer uuid := auth.uid();
  v_is_friend boolean;
  v_profile profiles;
  v_char characters;
  v_expl_days bigint;
BEGIN
  IF v_viewer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  SELECT * INTO v_char FROM public.characters WHERE user_id = p_target_user_id LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = v_viewer AND f.addressee_id = p_target_user_id)
        OR (f.addressee_id = v_viewer AND f.requester_id = p_target_user_id)
      )
  ) INTO v_is_friend;

  SELECT COUNT(DISTINCT ((ec.completed_at AT TIME ZONE 'Asia/Seoul')::date)) INTO v_expl_days
  FROM public.event_completions ec
  WHERE ec.user_id = p_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'username', v_profile.username,
    'avatar_url', v_profile.avatar_url,
    'explorer_type', v_profile.explorer_type,
    'character', CASE WHEN v_char.id IS NULL THEN NULL ELSE jsonb_build_object(
      'name', v_char.name,
      'character_type', v_char.character_type,
      'level', v_char.level,
      'xp', v_char.xp,
      'equipped_title', v_char.equipped_title
    ) END,
    'location', CASE
      WHEN v_is_friend
        AND COALESCE(v_profile.location_sharing, false)
        AND v_profile.last_latitude IS NOT NULL
        AND v_profile.last_longitude IS NOT NULL
      THEN jsonb_build_object(
        'latitude', v_profile.last_latitude,
        'longitude', v_profile.last_longitude,
        'last_seen_at', v_profile.last_seen_at
      )
      ELSE NULL
    END,
    'exploration_days', COALESCE(v_expl_days, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated, service_role;

--------------------------------------------------------------------------------
-- get_user_community_feed: 특정 유저의 공개 커뮤니티 피드
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_community_feed(
  p_user_id uuid,
  p_limit int DEFAULT 30
)
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
      AND cs.user_id = p_user_id
    ORDER BY cs.created_at DESC
    LIMIT least(greatest(coalesce(p_limit, 30), 1), 100)
  ) x;
$$;

REVOKE ALL ON FUNCTION public.get_user_community_feed(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_community_feed(uuid, int) TO authenticated, service_role;

--------------------------------------------------------------------------------
-- get_user_recent_event_activity: 최근 이벤트 완료 (공개 프로필용)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_recent_event_activity(
  p_user_id uuid,
  p_limit int DEFAULT 10
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'event_id', x.event_id,
        'event_title', x.event_title,
        'district', x.district,
        'address', x.address,
        'completed_at', x.completed_at
      )
      ORDER BY x.completed_at DESC
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      ec.event_id,
      e.title AS event_title,
      e.district,
      e.address,
      ec.completed_at
    FROM public.event_completions ec
    JOIN public.events e ON e.id = ec.event_id
    WHERE ec.user_id = p_user_id
    ORDER BY ec.completed_at DESC
    LIMIT least(greatest(coalesce(p_limit, 10), 1), 50)
  ) x;
$$;

REVOKE ALL ON FUNCTION public.get_user_recent_event_activity(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_recent_event_activity(uuid, int) TO authenticated, service_role;

--------------------------------------------------------------------------------
-- gift_cosmetic: 친구에게 코스메틱 선물 (보낸이 코인 차감)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gift_cosmetic(p_receiver_id uuid, p_cosmetic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_price int;
  v_cosmetic_name text;
  v_sender_coins int;
  v_cosmetic record;
  v_receiver_char record;
  v_is_friend boolean;
  v_sender_name text;
BEGIN
  IF v_sender IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_receiver_id = v_sender THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_gift_self');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = v_sender AND f.addressee_id = p_receiver_id)
        OR (f.addressee_id = v_sender AND f.requester_id = p_receiver_id)
      )
  ) INTO v_is_friend;

  IF NOT v_is_friend THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_friends');
  END IF;

  SELECT * INTO v_cosmetic FROM public.character_cosmetics WHERE id = p_cosmetic_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'cosmetic_not_found');
  END IF;

  IF v_cosmetic.coin_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'cosmetic_not_found');
  END IF;

  IF v_cosmetic.unlock_method IS DISTINCT FROM 'purchase' OR v_cosmetic.coin_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_giftable');
  END IF;

  IF v_cosmetic.is_limited AND v_cosmetic.expires_at IS NOT NULL AND v_cosmetic.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'cosmetic_expired');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_cosmetics uc
    WHERE uc.user_id = p_receiver_id AND uc.cosmetic_id = p_cosmetic_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_owned');
  END IF;

  SELECT * INTO v_receiver_char FROM public.characters WHERE user_id = p_receiver_id LIMIT 1;
  IF FOUND THEN
    IF v_receiver_char.level < COALESCE(v_cosmetic.min_level, 1) THEN
      RETURN jsonb_build_object('success', false, 'error', 'receiver_level_too_low');
    END IF;
    IF v_cosmetic.character_class_restriction IS NOT NULL
       AND NOT (v_receiver_char.character_type = ANY (v_cosmetic.character_class_restriction)) THEN
      RETURN jsonb_build_object('success', false, 'error', 'receiver_class_mismatch');
    END IF;
  END IF;

  IF v_cosmetic.is_premium AND NOT COALESCE((SELECT is_premium FROM public.profiles WHERE id = p_receiver_id), false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'receiver_not_premium');
  END IF;

  SELECT username INTO v_sender_name FROM public.profiles WHERE id = v_sender;

  SELECT coins INTO v_sender_coins FROM public.profiles WHERE id = v_sender FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'sender_profile_missing');
  END IF;

  v_price := v_cosmetic.coin_price;
  v_cosmetic_name := v_cosmetic.name;

  IF COALESCE(v_sender_coins, 0) < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_coins', 'required', v_price, 'current', v_sender_coins);
  END IF;

  UPDATE public.profiles SET coins = coins - v_price WHERE id = v_sender;

  INSERT INTO public.user_cosmetics (user_id, cosmetic_id, acquired_via)
  VALUES (p_receiver_id, p_cosmetic_id, 'gift');

  RETURN jsonb_build_object(
    'success', true,
    'cosmetic_name', v_cosmetic_name,
    'coins_spent', v_price,
    'remaining_coins', v_sender_coins - v_price,
    'receiver_id', p_receiver_id,
    'sender_username', COALESCE(v_sender_name, '친구')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gift_cosmetic(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gift_cosmetic(uuid, uuid) TO authenticated, service_role;
