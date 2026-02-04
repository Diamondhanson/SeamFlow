-- =============================================================================
-- SeamFlow Supabase Storage Setup
-- Run this AFTER creating the bucket "seamflow-images" in Dashboard:
-- Storage -> New bucket -> Name: seamflow-images, Public: Yes
-- =============================================================================

-- Allow authenticated users to upload to their own folder
CREATE POLICY "seamflow_images_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'seamflow-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read (for public URLs)
CREATE POLICY "seamflow_images_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'seamflow-images');

-- Allow users to update their own files
CREATE POLICY "seamflow_images_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'seamflow-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "seamflow_images_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'seamflow-images' AND auth.uid()::text = (storage.foldername(name))[1]);
