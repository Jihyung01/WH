-- Public bucket for raster character sprites (4 types × 4 evolution PNGs).
-- Upload paths: dodam/baby.png, narae/teen.png, byeolzzi/legendary.png, etc.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'character-assets',
  'character-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "character_assets_public_read" ON storage.objects;
CREATE POLICY "character_assets_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'character-assets');
