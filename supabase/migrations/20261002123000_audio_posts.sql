ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS audio_url text;

CREATE INDEX IF NOT EXISTS idx_posts_audio_url
ON public.posts (user_id, created_at DESC)
WHERE audio_url IS NOT NULL;