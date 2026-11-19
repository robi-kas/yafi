-- Private bucket for trade screenshots + per-user folder policies.
-- Files are stored as <auth.uid()>/<kind>-<uuid>.<ext>; each user can only
-- read, upload, replace or delete objects inside their own folder.
-- Idempotent: safe to run again.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('trade-screenshots', 'trade-screenshots', false, 10485760,
        ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "yafi screenshots: read own"   ON storage.objects;
DROP POLICY IF EXISTS "yafi screenshots: upload own" ON storage.objects;
DROP POLICY IF EXISTS "yafi screenshots: update own" ON storage.objects;
DROP POLICY IF EXISTS "yafi screenshots: delete own" ON storage.objects;

CREATE POLICY "yafi screenshots: read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "yafi screenshots: upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "yafi screenshots: update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text))
  WITH CHECK (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "yafi screenshots: delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

-- Check: should list the bucket and 4 policies
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'trade-screenshots';
SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND policyname LIKE 'yafi screenshots:%';
