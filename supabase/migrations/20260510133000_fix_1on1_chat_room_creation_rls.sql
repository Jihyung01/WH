-- 1:1 DM creation must create chat_rooms and chat_room_members together.
-- Running as invoker lets chat_rooms RLS reject the insert on some clients.

CREATE OR REPLACE FUNCTION public.get_or_create_1on1_room(p_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  found_room uuid;
  new_room uuid;
BEGIN
  IF me IS NULL OR p_target_user_id IS NULL OR me = p_target_user_id THEN
    RAISE EXCEPTION '잘못된 사용자';
  END IF;

  SELECT cr.id INTO found_room
  FROM public.chat_rooms cr
  WHERE cr.type = '1on1'
    AND EXISTS (
      SELECT 1
      FROM public.chat_room_members m
      WHERE m.room_id = cr.id
        AND m.user_id = me
    )
    AND EXISTS (
      SELECT 1
      FROM public.chat_room_members m
      WHERE m.room_id = cr.id
        AND m.user_id = p_target_user_id
    )
  LIMIT 1;

  IF found_room IS NOT NULL THEN
    RETURN found_room;
  END IF;

  INSERT INTO public.chat_rooms(type, created_by)
  VALUES ('1on1', me)
  RETURNING id INTO new_room;

  INSERT INTO public.chat_room_members(room_id, user_id, is_admin)
  VALUES (new_room, me, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.chat_room_members(room_id, user_id, is_admin)
  VALUES (new_room, p_target_user_id, false)
  ON CONFLICT DO NOTHING;

  RETURN new_room;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_1on1_room(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
