-- One character row per user (fixes .maybeSingle() "multiple rows" errors)
SET search_path = public;

DELETE FROM public.characters c
WHERE c.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
    FROM public.characters
  ) t
  WHERE t.rn > 1
);

ALTER TABLE public.characters
  DROP CONSTRAINT IF EXISTS characters_user_id_key;

ALTER TABLE public.characters
  ADD CONSTRAINT characters_user_id_key UNIQUE (user_id);
