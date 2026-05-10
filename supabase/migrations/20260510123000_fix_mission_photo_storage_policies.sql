-- Mission photo storage policies for JS-only upload flows.
-- Paths used by the app:
--   <user_id>/<mission_id>/...
--   ugc-covers/<user_id>/...
--   marks/<user_id>/...
--   chat/<user_id>/<room_id>/...

UPDATE storage.buckets
SET public = true,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'mission-photos';

DROP POLICY IF EXISTS "mission_photos_public_read" ON storage.objects;
CREATE POLICY "mission_photos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'mission-photos');

DROP POLICY IF EXISTS "mission_photos_owner_insert" ON storage.objects;
CREATE POLICY "mission_photos_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mission-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('ugc-covers', 'marks', 'chat')
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "mission_photos_owner_update" ON storage.objects;
CREATE POLICY "mission_photos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'mission-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('ugc-covers', 'marks', 'chat')
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    bucket_id = 'mission-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('ugc-covers', 'marks', 'chat')
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "mission_photos_owner_delete" ON storage.objects;
CREATE POLICY "mission_photos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'mission-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] IN ('ugc-covers', 'marks', 'chat')
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

NOTIFY pgrst, 'reload schema';
