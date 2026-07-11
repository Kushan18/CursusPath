-- Run this in Supabase SQL Editor AFTER creating the bucket via the dashboard.
--
-- STEP 1 (do this in the dashboard, not SQL):
--   Supabase Dashboard -> Storage -> New bucket
--   Name: offer-letters
--   Public: OFF (keep it private)
--
-- STEP 2: run the SQL below to lock it down so users can only
-- upload/read/delete their own files. Files will be stored as:
--   offer-letters/<user_id>/<filename>

-- Users can upload files into their own folder only
CREATE POLICY "Users can upload their own offer letters"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'offer-letters'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read only their own files
CREATE POLICY "Users can read their own offer letters"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'offer-letters'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete only their own files
CREATE POLICY "Users can delete their own offer letters"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'offer-letters'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
