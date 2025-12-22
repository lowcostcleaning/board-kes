-- Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id = 'reports';
UPDATE storage.buckets SET public = false WHERE id = 'chat_files';

-- Drop existing overly permissive storage policies
DROP POLICY IF EXISTS "Anyone can view reports" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;

-- Note: keeping upload policies as they properly require authentication