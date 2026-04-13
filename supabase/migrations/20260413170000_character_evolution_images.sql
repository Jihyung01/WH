-- ================================================================
-- Character evolution AI images
-- ================================================================

-- 1) Column to store URLs keyed by stage (teen/adult/legendary)
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS evolution_images JSONB DEFAULT '{}'::jsonb;

-- 2) Storage bucket for generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'character-evolutions',
  'character-evolutions',
  true,
  5242880,
  ARRAY['image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read for this bucket
DROP POLICY IF EXISTS "character_evolutions_public_read" ON storage.objects;
CREATE POLICY "character_evolutions_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'character-evolutions');

-- 3) RPC to set evolution image URL safely from service role
CREATE OR REPLACE FUNCTION public.set_character_evolution_image(
  p_user_id uuid,
  p_stage text,
  p_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stage text;
BEGIN
  v_stage := lower(trim(p_stage));
  IF v_stage NOT IN ('teen', 'adult', 'legendary') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_stage');
  END IF;

  UPDATE public.characters
  SET evolution_images =
    COALESCE(evolution_images, '{}'::jsonb) ||
    jsonb_build_object(v_stage, p_url)
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

