CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_views_not_self CHECK (profile_id <> viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_profile_created
ON public.profile_views (profile_id, created_at DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_views_insert_own ON public.profile_views;
CREATE POLICY profile_views_insert_own
ON public.profile_views
FOR INSERT TO authenticated
WITH CHECK (viewer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profile_views_read_own ON public.profile_views;
CREATE POLICY profile_views_read_own
ON public.profile_views
FOR SELECT TO authenticated
USING (profile_id = (SELECT auth.uid()));