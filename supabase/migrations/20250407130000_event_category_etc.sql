-- Align event_category enum with create-event UI ("기타" = etc)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'event_category'
      AND e.enumlabel = 'etc'
  ) THEN
    ALTER TYPE public.event_category ADD VALUE 'etc';
  END IF;
END$$;
