-- Story photos are portrait images and can exceed the original mission-photo
-- bucket limit on modern phones. Keep this OTA-safe by raising only storage
-- metadata; no native rebuild is required.

UPDATE storage.buckets
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'mission-photos';

NOTIFY pgrst, 'reload schema';
