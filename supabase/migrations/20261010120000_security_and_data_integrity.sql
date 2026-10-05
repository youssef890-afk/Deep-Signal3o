/*
# Deep Signal — Security & Data Integrity Hardening

## Overview
Additive, idempotent migration. Nothing is dropped and no existing RLS policy is
weakened. It closes four real gaps found during the audit:

1. **AI usage is unbounded.** A new `ai_usage` ledger plus `consume_ai_quota()`
   and `finalize_ai_usage()` RPCs give the server a source of truth for rate
   limiting and cost accounting. Clients can never insert or edit usage rows.
2. **Storage uploads are unvalidated.** `posts`, `avatars` and `voice-notes`
   accepted any MIME type and any size. Because the buckets are served from the
   Supabase domain, an uploaded `text/html` or `image/svg+xml` file could be used
   to host attacker content on a trusted origin. Buckets are now bounded by size
   and by an allow-list of media types.
3. **`profiles.display_id` is used by the app but was never created**, so the
   profile search query and the `#id` chip failed at runtime.
4. **`handle_new_user()` trusted client metadata.** The username was copied
   verbatim, which allowed invalid handles and aborted the whole signup
   transaction whenever the requested username was already taken.

## ai_usage
Edge Functions (`ai-assistant`, `jokal-chat`) reserve a row through
`consume_ai_quota()` before calling the provider, then finalise it with the token
counts. `project_id` is intentionally nullable so the same ledger serves Jokal AI
projects without a schema change.
*/

-- =========================================================
-- 1. AI USAGE LEDGER (server-side source of truth)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid,
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL DEFAULT '',
  request_type text NOT NULL DEFAULT 'unknown',
  bucket text NOT NULL DEFAULT 'default',
  input_tokens integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens integer NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  estimated_cost_usd numeric(14, 8) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'succeeded', 'failed', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created
  ON public.ai_usage (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_bucket_created
  ON public.ai_usage (user_id, bucket, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_project
  ON public.ai_usage (project_id)
  WHERE project_id IS NOT NULL;

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_read_own ON public.ai_usage;
CREATE POLICY ai_usage_read_own
  ON public.ai_usage FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Write access stays inside the SECURITY DEFINER RPCs below.
REVOKE ALL ON public.ai_usage FROM anon, authenticated;
GRANT SELECT ON public.ai_usage TO authenticated;

-- Reserve one unit of quota before calling the model provider. Returns the
-- ledger row id so the caller can finalise token counts afterwards.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer,
  p_request_type text,
  p_provider text,
  p_model text
)
RETURNS TABLE (allowed boolean, remaining integer, reset_at timestamptz, usage_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_id uuid := (SELECT auth.uid());
  reserved_id uuid;
  window_start timestamptz;
  used_count integer;
  bucket_name text := COALESCE(NULLIF(p_bucket, ''), 'default');
  safe_limit integer := GREATEST(COALESCE(p_limit, 0), 0);
  safe_window integer := GREATEST(COALESCE(p_window_seconds, 60), 1);
BEGIN
  IF caller_id IS NULL OR safe_limit = 0 THEN
    RETURN QUERY SELECT false, 0, now() + make_interval(secs => safe_window), NULL::uuid;
    RETURN;
  END IF;

  window_start := now() - make_interval(secs => safe_window);

  INSERT INTO public.ai_usage (user_id, bucket, request_type, provider, model, status)
  VALUES (
    caller_id,
    bucket_name,
    COALESCE(NULLIF(p_request_type, ''), 'unknown'),
    COALESCE(NULLIF(p_provider, ''), 'unknown'),
    COALESCE(NULLIF(p_model, ''), 'unknown'),
    'reserved'
  )
  RETURNING id INTO reserved_id;

  SELECT count(*) INTO used_count
  FROM public.ai_usage AS usage
  WHERE usage.user_id = caller_id
    AND usage.bucket = bucket_name
    AND usage.created_at >= window_start;

  IF used_count > safe_limit THEN
    UPDATE public.ai_usage SET status = 'blocked' WHERE id = reserved_id;
    RETURN QUERY SELECT false, 0, window_start + make_interval(secs => safe_window), reserved_id;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT true, safe_limit - used_count,
           window_start + make_interval(secs => safe_window), reserved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(text, integer, integer, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(text, integer, integer, text, text, text)
  TO authenticated;

-- Finalise a reserved ledger row. Only the owner of the row may finalise it and
-- only the counters change; the row itself is never removed.
CREATE OR REPLACE FUNCTION public.finalize_ai_usage(
  p_usage_id uuid,
  p_input_tokens integer,
  p_output_tokens integer,
  p_estimated_cost_usd numeric,
  p_latency_ms integer,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.ai_usage
  SET input_tokens = GREATEST(COALESCE(p_input_tokens, 0), 0),
      output_tokens = GREATEST(COALESCE(p_output_tokens, 0), 0),
      total_tokens = GREATEST(COALESCE(p_input_tokens, 0), 0)
                    + GREATEST(COALESCE(p_output_tokens, 0), 0),
      estimated_cost_usd = GREATEST(COALESCE(p_estimated_cost_usd, 0), 0),
      latency_ms = GREATEST(COALESCE(p_latency_ms, 0), 0),
      status = CASE WHEN p_status IN ('succeeded', 'failed') THEN p_status ELSE 'failed' END
  WHERE id = p_usage_id
    AND user_id = (SELECT auth.uid())
    AND status = 'reserved';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_ai_usage(uuid, integer, integer, numeric, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_ai_usage(uuid, integer, integer, numeric, integer, text)
  TO authenticated;

-- Per-user monthly spend, used for dashboards and future plan limits.
CREATE OR REPLACE VIEW public.ai_usage_monthly
  WITH (security_invoker = true)
  AS
  SELECT
    user_id,
    date_trunc('month', created_at) AS month,
    bucket,
    count(*) AS requests,
    COALESCE(sum(total_tokens), 0) AS total_tokens,
    COALESCE(sum(estimated_cost_usd), 0) AS estimated_cost_usd
  FROM public.ai_usage
  WHERE status = 'succeeded'
  GROUP BY user_id, date_trunc('month', created_at), bucket;

-- =========================================================
-- 2. STORAGE — SIZE AND MIME-TYPE BOUNDS
-- =========================================================

-- The client filters on `file.type` prefixes, but that value comes from the
-- caller and can be forged. The bucket allow-list is the real control, and it is
-- what prevents an attacker from publishing active content (HTML/SVG/JS) on the
-- project domain.
UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      'image/heic', 'image/heif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp', 'video/x-matroska',
      'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav',
      'audio/webm', 'audio/x-m4a'
    ]
WHERE id = 'posts';

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      'image/heic', 'image/heif'
    ]
WHERE id = 'avatars';

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY[
      'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav',
      'audio/webm', 'audio/x-m4a'
    ]
WHERE id = 'voice-notes';

-- =========================================================
-- 3. PROFILES — PUBLIC NUMERIC HANDLE
-- =========================================================

-- `display_id` is read by SearchPage and rendered by ProfilePage but was never
-- created by any migration, so the profile search query failed at runtime.
CREATE SEQUENCE IF NOT EXISTS public.profiles_display_id_seq;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_id integer;

UPDATE public.profiles
  SET display_id = nextval('public.profiles_display_id_seq')
  WHERE display_id IS NULL;

-- If `display_id` already existed with values, the sequence would restart at 1
-- and collide with them on the next insert.
SELECT setval(
  'public.profiles_display_id_seq',
  GREATEST(COALESCE((SELECT MAX(display_id) FROM public.profiles), 0), 1),
  true
);

ALTER TABLE public.profiles
  ALTER COLUMN display_id SET DEFAULT nextval('public.profiles_display_id_seq');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE display_id IS NULL) THEN
    ALTER TABLE public.profiles ALTER COLUMN display_id SET NOT NULL;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_id_key
  ON public.profiles (display_id);

-- =========================================================
-- 4. SIGNUP — SANITISED, COLLISION-SAFE USERNAME
-- =========================================================

-- The previous version copied raw_user_meta_data verbatim and relied on
-- ON CONFLICT (id) DO NOTHING, so a taken username raised a unique violation
-- inside the trigger and aborted the whole signup transaction.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  base_username text;
  candidate text;
  attempt integer := 0;
BEGIN
  base_username := lower(regexp_replace(
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'user'
    ),
    '[^a-z0-9_]', '', 'g'
  ));
  base_username := left(base_username, 24);

  IF base_username = '' OR base_username < 3 THEN
    base_username := 'user';
  END IF;

  candidate := base_username;
  WHILE attempt < 50 AND EXISTS (
    SELECT 1 FROM public.profiles WHERE username = candidate
  ) LOOP
    attempt := attempt + 1;
    candidate := left(base_username, 18) || '_' || attempt::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    candidate,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      ''
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;