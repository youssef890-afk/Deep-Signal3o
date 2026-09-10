/*
  Deep Signal
  Phase 1 — Foundation Repair

  Safe, additive/idempotent migration.

  Goals:
  - Ensure messages.read_at exists.
  - Add important query indexes.
  - Restrict messages updates to read_at only.
  - Allow message receivers to mark their own messages as read.
  - Allow room creators to kick members from their own rooms.
  - Harden handle_new_user search_path.
  - Remove direct execution permission from handle_new_user.
  - Ensure messages and room_members are in Supabase Realtime.

  No tables or columns are dropped.
*/

-- =========================================================
-- 1. MESSAGES — READ STATUS
-- =========================================================

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS read_at timestamptz;


-- =========================================================
-- 2. PERFORMANCE INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_messages_receiver_id
ON public.messages (receiver_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
ON public.messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_id
ON public.comments (post_id);

CREATE INDEX IF NOT EXISTS idx_comments_user_id
ON public.comments (user_id);

CREATE INDEX IF NOT EXISTS idx_follows_following_id
ON public.follows (following_id);

CREATE INDEX IF NOT EXISTS idx_likes_post_id
ON public.likes (post_id);

CREATE INDEX IF NOT EXISTS idx_posts_user_id
ON public.posts (user_id);

CREATE INDEX IF NOT EXISTS idx_reels_user_id
ON public.reels (user_id);

CREATE INDEX IF NOT EXISTS idx_room_members_user_id
ON public.room_members (user_id);

CREATE INDEX IF NOT EXISTS idx_rooms_created_by
ON public.rooms (created_by);

CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id
ON public.saved_posts (post_id);


-- =========================================================
-- 3. MESSAGES — ONLY READ_AT CAN BE UPDATED
-- =========================================================

REVOKE UPDATE
ON public.messages
FROM anon, authenticated;

GRANT UPDATE (read_at)
ON public.messages
TO authenticated;


-- =========================================================
-- 4. MESSAGES — RECEIVER CAN MARK MESSAGE AS READ
-- =========================================================

DROP POLICY IF EXISTS messages_receiver_update_read
ON public.messages;

CREATE POLICY messages_receiver_update_read
ON public.messages
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) = receiver_id
)
WITH CHECK (
  (SELECT auth.uid()) = receiver_id
);


-- =========================================================
-- 5. ROOM MEMBERS — CREATOR CAN KICK MEMBERS
-- =========================================================

DROP POLICY IF EXISTS room_members_creator_kick
ON public.room_members;

CREATE POLICY room_members_creator_kick
ON public.room_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rooms
    WHERE public.rooms.id =
          public.room_members.room_id
      AND public.rooms.created_by =
          (SELECT auth.uid())
  )
);


-- =========================================================
-- 6. SECURITY — FUNCTION SEARCH PATH
-- =========================================================

ALTER FUNCTION public.handle_new_user()
SET search_path = public, pg_temp;


-- =========================================================
-- 7. SECURITY — REMOVE DIRECT FUNCTION EXECUTION
-- =========================================================

REVOKE EXECUTE
ON FUNCTION public.handle_new_user()
FROM anon, authenticated, public;


-- =========================================================
-- 8. REALTIME — MESSAGES + ROOM MEMBERS
-- =========================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN

    EXECUTE
      'ALTER PUBLICATION supabase_realtime
       ADD TABLE public.messages';

  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'room_members'
  ) THEN

    EXECUTE
      'ALTER PUBLICATION supabase_realtime
       ADD TABLE public.room_members';

  END IF;

END
$$;
