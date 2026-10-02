CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_username text,
  blocked_full_name text,
  blocked_avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT user_blocks_unique_pair UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_blocks_read_own ON public.user_blocks;
CREATE POLICY user_blocks_read_own
ON public.user_blocks FOR SELECT TO authenticated
USING (blocker_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_blocks_insert_own ON public.user_blocks;
CREATE POLICY user_blocks_insert_own
ON public.user_blocks FOR INSERT TO authenticated
WITH CHECK (blocker_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_blocks_delete_own ON public.user_blocks;
CREATE POLICY user_blocks_delete_own
ON public.user_blocks FOR DELETE TO authenticated
USING (blocker_id = (SELECT auth.uid()));

REVOKE ALL ON public.user_blocks FROM anon, authenticated;
GRANT SELECT, DELETE ON public.user_blocks TO authenticated;
GRANT INSERT (blocker_id, blocked_id) ON public.user_blocks TO authenticated;

CREATE OR REPLACE FUNCTION public.capture_blocked_user_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT username, full_name, avatar_url
  INTO NEW.blocked_username, NEW.blocked_full_name, NEW.blocked_avatar_url
  FROM public.profiles
  WHERE id = NEW.blocked_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_blocked_user_snapshot() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_blocks_capture_profile ON public.user_blocks;
CREATE TRIGGER user_blocks_capture_profile
BEFORE INSERT ON public.user_blocks
FOR EACH ROW EXECUTE FUNCTION public.capture_blocked_user_snapshot();

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid,
  post_id uuid,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate', 'inappropriate', 'other')),
  details text CHECK (char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_has_target CHECK (reported_user_id IS NOT NULL OR post_id IS NOT NULL),
  CONSTRAINT content_reports_not_self CHECK (reported_user_id IS NULL OR reporter_id <> reported_user_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_open_created
ON public.content_reports (created_at DESC) WHERE status = 'open';

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_reports_insert_own ON public.content_reports;
CREATE POLICY content_reports_insert_own
ON public.content_reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS content_reports_read_own ON public.content_reports;
CREATE POLICY content_reports_read_own
ON public.content_reports FOR SELECT TO authenticated
USING (
  reporter_id = (SELECT auth.uid())
  OR COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator', false)
);

DROP POLICY IF EXISTS content_reports_moderator_update ON public.content_reports;
CREATE POLICY content_reports_moderator_update
ON public.content_reports FOR UPDATE TO authenticated
USING (COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator', false))
WITH CHECK (COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator', false));

REVOKE ALL ON public.content_reports FROM anon, authenticated;
GRANT SELECT ON public.content_reports TO authenticated;
GRANT INSERT (reporter_id, reported_user_id, post_id, reason, details)
ON public.content_reports TO authenticated;
GRANT UPDATE (status) ON public.content_reports TO authenticated;

CREATE OR REPLACE FUNCTION public.is_user_blocked(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_user_id IS NOT NULL
    AND target_user_id <> (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_blocks
      WHERE (blocker_id = (SELECT auth.uid()) AND blocked_id = target_user_id)
         OR (blocked_id = (SELECT auth.uid()) AND blocker_id = target_user_id)
    );
$$;

REVOKE ALL ON FUNCTION public.is_user_blocked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_blocked(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_user_blocked(target_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_user_id IS NOT NULL
    AND target_user_id <> (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1
      FROM public.user_blocks
      WHERE (blocker_id = (SELECT auth.uid()) AND blocked_id::text = target_user_id)
         OR (blocked_id = (SELECT auth.uid()) AND blocker_id::text = target_user_id)
    );
$$;

REVOKE ALL ON FUNCTION public.is_user_blocked(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_blocked(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.room_has_blocked_member(target_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_members AS member
    JOIN public.user_blocks AS block
      ON (block.blocker_id = (SELECT auth.uid()) AND block.blocked_id = member.user_id)
      OR (block.blocked_id = (SELECT auth.uid()) AND block.blocker_id = member.user_id)
    WHERE member.room_id = target_room_id
  );
$$;

REVOKE ALL ON FUNCTION public.room_has_blocked_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.room_has_blocked_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_blocked_user_follows()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.follows
  WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);

  DELETE FROM public.room_members AS member
  USING public.room_members AS counterpart
  WHERE member.room_id = counterpart.room_id
    AND member.user_id IN (NEW.blocker_id, NEW.blocked_id)
    AND counterpart.user_id IN (NEW.blocker_id, NEW.blocked_id)
    AND member.user_id <> counterpart.user_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_blocked_user_follows() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_blocks_remove_follows ON public.user_blocks;
CREATE TRIGGER user_blocks_remove_follows
AFTER INSERT ON public.user_blocks
FOR EACH ROW EXECUTE FUNCTION public.remove_blocked_user_follows();

DROP POLICY IF EXISTS profiles_read_all ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY profiles_read_all
ON public.profiles FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid())
  OR NOT public.is_user_blocked(id)
);

DROP POLICY IF EXISTS posts_read_all ON public.posts;
DROP POLICY IF EXISTS "posts_read_all" ON public.posts;
CREATE POLICY posts_read_all
ON public.posts FOR SELECT TO authenticated
USING (NOT public.is_user_blocked(user_id));

DROP POLICY IF EXISTS follows_read_all ON public.follows;
DROP POLICY IF EXISTS "follows_read_all" ON public.follows;
CREATE POLICY follows_read_all
ON public.follows FOR SELECT TO authenticated
USING (
  NOT public.is_user_blocked(follower_id)
  AND NOT public.is_user_blocked(following_id)
);

DROP POLICY IF EXISTS follows_insert_own ON public.follows;
DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
CREATE POLICY follows_insert_own
ON public.follows FOR INSERT TO authenticated
WITH CHECK (
  follower_id = (SELECT auth.uid())
  AND NOT public.is_user_blocked(following_id)
);

DROP POLICY IF EXISTS likes_read_all ON public.likes;
DROP POLICY IF EXISTS "likes_read_all" ON public.likes;
CREATE POLICY likes_read_all
ON public.likes FOR SELECT TO authenticated
USING (
  NOT public.is_user_blocked(user_id)
  AND EXISTS (
    SELECT 1 FROM public.posts
    WHERE public.posts.id = likes.post_id
      AND NOT public.is_user_blocked(public.posts.user_id)
  )
);

DROP POLICY IF EXISTS likes_insert_own ON public.likes;
DROP POLICY IF EXISTS "likes_insert_own" ON public.likes;
CREATE POLICY likes_insert_own
ON public.likes FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.posts
    WHERE public.posts.id = likes.post_id
      AND NOT public.is_user_blocked(public.posts.user_id)
  )
);

DROP POLICY IF EXISTS messages_read_own ON public.messages;
DROP POLICY IF EXISTS "messages_read_own" ON public.messages;
CREATE POLICY messages_read_own
ON public.messages FOR SELECT TO authenticated
USING (
  (sender_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()))
  AND NOT public.is_user_blocked(
    CASE WHEN sender_id = (SELECT auth.uid()) THEN receiver_id ELSE sender_id END
  )
);

DROP POLICY IF EXISTS messages_insert_own ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY messages_insert_own
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND NOT public.is_user_blocked(receiver_id)
);

DROP POLICY IF EXISTS messages_receiver_update_read ON public.messages;
CREATE POLICY messages_receiver_update_read
ON public.messages FOR UPDATE TO authenticated
USING (
  receiver_id = (SELECT auth.uid())
  AND NOT public.is_user_blocked(sender_id)
)
WITH CHECK (
  receiver_id = (SELECT auth.uid())
  AND NOT public.is_user_blocked(sender_id)
);

DROP POLICY IF EXISTS profile_views_insert_own ON public.profile_views;
CREATE POLICY profile_views_insert_own
ON public.profile_views FOR INSERT TO authenticated
WITH CHECK (
  viewer_id = (SELECT auth.uid())
  AND NOT public.is_user_blocked(profile_id)
);

DROP POLICY IF EXISTS rooms_block_visibility ON public.rooms;
CREATE POLICY rooms_block_visibility
ON public.rooms AS RESTRICTIVE
FOR SELECT TO authenticated
USING (
  NOT public.is_user_blocked(created_by)
  AND NOT public.room_has_blocked_member(id)
);

DROP POLICY IF EXISTS room_members_block_visibility ON public.room_members;
CREATE POLICY room_members_block_visibility
ON public.room_members AS RESTRICTIVE
FOR SELECT TO authenticated
USING (
  NOT public.is_user_blocked(user_id)
  AND EXISTS (
    SELECT 1 FROM public.rooms
    WHERE public.rooms.id = room_members.room_id
      AND NOT public.is_user_blocked(public.rooms.created_by)
      AND NOT public.room_has_blocked_member(public.rooms.id)
  )
);

DROP POLICY IF EXISTS room_members_block_join ON public.room_members;
CREATE POLICY room_members_block_join
ON public.room_members AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms
    WHERE public.rooms.id = room_members.room_id
      AND NOT public.is_user_blocked(public.rooms.created_by)
  )
  AND NOT public.room_has_blocked_member(room_id)
);

DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS comments_block_visibility ON public.comments';
    EXECUTE $policy$
      CREATE POLICY comments_block_visibility
      ON public.comments AS RESTRICTIVE
      FOR SELECT TO authenticated
      USING (
        NOT public.is_user_blocked(user_id)
        AND EXISTS (
          SELECT 1 FROM public.posts
          WHERE public.posts.id = comments.post_id
            AND NOT public.is_user_blocked(public.posts.user_id)
        )
      )
    $policy$;
    EXECUTE 'DROP POLICY IF EXISTS comments_block_insert ON public.comments';
    EXECUTE $policy$
      CREATE POLICY comments_block_insert
      ON public.comments AS RESTRICTIVE
      FOR INSERT TO authenticated
      WITH CHECK (
        user_id = (SELECT auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.posts
          WHERE public.posts.id = comments.post_id
            AND NOT public.is_user_blocked(public.posts.user_id)
        )
      )
    $policy$;
  END IF;
END
$$;

DROP POLICY IF EXISTS voice_notes_insert_sender ON storage.objects;
CREATE POLICY voice_notes_insert_sender
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND NOT public.is_user_blocked((storage.foldername(name))[2])
);

DROP POLICY IF EXISTS voice_notes_read_participant ON storage.objects;
CREATE POLICY voice_notes_read_participant
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      AND NOT public.is_user_blocked((storage.foldername(name))[2])
    )
    OR (
      (storage.foldername(name))[2] = (SELECT auth.uid())::text
      AND NOT public.is_user_blocked((storage.foldername(name))[1])
    )
  )
);