-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 7 — diary-photos / place-memories Storage RLS 정책
--   bucket 자체는 20260508030329 에서 생성. 이 마이그레이션은 정책만 추가.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── diary-photos ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "diary_photos_public_read" ON storage.objects;
CREATE POLICY "diary_photos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'diary-photos');

DROP POLICY IF EXISTS "diary_photos_owner_insert" ON storage.objects;
CREATE POLICY "diary_photos_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'diary-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "diary_photos_owner_update" ON storage.objects;
CREATE POLICY "diary_photos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'diary-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "diary_photos_owner_delete" ON storage.objects;
CREATE POLICY "diary_photos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'diary-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── place-memories ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "place_memories_public_read" ON storage.objects;
CREATE POLICY "place_memories_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'place-memories');

DROP POLICY IF EXISTS "place_memories_owner_insert" ON storage.objects;
CREATE POLICY "place_memories_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'place-memories'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "place_memories_owner_update" ON storage.objects;
CREATE POLICY "place_memories_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'place-memories'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "place_memories_owner_delete" ON storage.objects;
CREATE POLICY "place_memories_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'place-memories'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

NOTIFY pgrst, 'reload schema';
