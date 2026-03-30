SET search_path = public, extensions;

-- Add location columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  last_latitude double precision DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  last_longitude double precision DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  last_seen_at timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  location_sharing boolean DEFAULT false;

CREATE INDEX profiles_location_sharing_idx ON public.profiles (location_sharing) WHERE location_sharing = true;

-- RPC: Update my location
CREATE OR REPLACE FUNCTION public.update_my_location(p_lat double precision, p_lng double precision)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_latitude = p_lat,
      last_longitude = p_lng,
      last_seen_at = now()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_location(double precision, double precision) TO authenticated;

-- RPC: Get friends' locations (only friends who have location_sharing enabled)
CREATE OR REPLACE FUNCTION public.get_friend_locations(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', p.id,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'latitude', p.last_latitude,
    'longitude', p.last_longitude,
    'last_seen_at', p.last_seen_at,
    'character_type', c.character_type,
    'level', c.level
  )), '[]'::jsonb) INTO v_result
  FROM public.profiles p
  LEFT JOIN public.characters c ON c.user_id = p.id
  WHERE p.location_sharing = true
    AND p.last_latitude IS NOT NULL
    AND p.last_longitude IS NOT NULL
    AND p.last_seen_at > now() - interval '30 minutes'
    AND p.id IN (
      SELECT CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
      FROM public.friendships f
      WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
        AND f.status = 'accepted'
    );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_locations(uuid) TO authenticated;

-- RPC: Toggle location sharing
CREATE OR REPLACE FUNCTION public.toggle_location_sharing(p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET location_sharing = p_enabled
  WHERE id = auth.uid();
  
  -- Clear location when disabling
  IF NOT p_enabled THEN
    UPDATE public.profiles
    SET last_latitude = NULL, last_longitude = NULL, last_seen_at = NULL
    WHERE id = auth.uid();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_location_sharing(boolean) TO authenticated;
