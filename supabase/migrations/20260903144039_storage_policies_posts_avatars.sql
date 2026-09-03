/*
# Storage Policies for posts and avatars buckets

## Overview
Allows authenticated users to upload images to the `posts` and `avatars`
storage buckets. Both buckets are public (images are viewable by anyone).
Users can only manage files within their own user-id-prefixed folder.

## Policies
- posts bucket: SELECT (public read), INSERT/UPDATE/DELETE (own folder)
- avatars bucket: SELECT (public read), INSERT/UPDATE/DELETE (own folder)
*/

-- Posts bucket policies
DROP POLICY IF EXISTS "posts_bucket_read" ON storage.objects;
CREATE POLICY "posts_bucket_read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'posts');

DROP POLICY IF EXISTS "posts_bucket_insert" ON storage.objects;
CREATE POLICY "posts_bucket_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "posts_bucket_update" ON storage.objects;
CREATE POLICY "posts_bucket_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "posts_bucket_delete" ON storage.objects;
CREATE POLICY "posts_bucket_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Avatars bucket policies
DROP POLICY IF EXISTS "avatars_bucket_read" ON storage.objects;
CREATE POLICY "avatars_bucket_read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_bucket_insert" ON storage.objects;
CREATE POLICY "avatars_bucket_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_bucket_update" ON storage.objects;
CREATE POLICY "avatars_bucket_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_bucket_delete" ON storage.objects;
CREATE POLICY "avatars_bucket_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);