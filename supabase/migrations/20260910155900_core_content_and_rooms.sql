ALTER TABLE public.posts
  ALTER COLUMN image_url DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS post_type text,
  ADD COLUMN IF NOT EXISTS background_style text,
  ADD COLUMN IF NOT EXISTS media_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_type text;

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_created
ON public.comments (post_id, created_at);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comments_read_authenticated ON public.comments;
CREATE POLICY comments_read_authenticated
ON public.comments FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS comments_insert_own ON public.comments;
CREATE POLICY comments_insert_own
ON public.comments FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS comments_delete_own ON public.comments;
CREATE POLICY comments_delete_own
ON public.comments FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description text CHECK (char_length(description) <= 500),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_rooms_active_created
ON public.rooms (is_active, created_at DESC);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rooms_read_active ON public.rooms;
CREATE POLICY rooms_read_active
ON public.rooms FOR SELECT TO authenticated
USING (is_active OR created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS rooms_insert_own ON public.rooms;
CREATE POLICY rooms_insert_own
ON public.rooms FOR INSERT TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS rooms_update_own ON public.rooms;
CREATE POLICY rooms_update_own
ON public.rooms FOR UPDATE TO authenticated
USING (created_by = (SELECT auth.uid()))
WITH CHECK (created_by = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  CONSTRAINT room_members_unique_user UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_user_id
ON public.room_members (user_id);

CREATE INDEX IF NOT EXISTS idx_room_members_room_joined
ON public.room_members (room_id, joined_at);

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_members_read_active ON public.room_members;
CREATE POLICY room_members_read_active
ON public.room_members FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.rooms
  WHERE public.rooms.id = room_members.room_id
    AND (public.rooms.is_active OR public.rooms.created_by = (SELECT auth.uid()))
));

DROP POLICY IF EXISTS room_members_insert_own ON public.room_members;
CREATE POLICY room_members_insert_own
ON public.room_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND role = 'member'
  AND EXISTS (
    SELECT 1 FROM public.rooms
    WHERE public.rooms.id = room_members.room_id
      AND public.rooms.is_active
  )
);

DROP POLICY IF EXISTS room_members_delete_own ON public.room_members;
CREATE POLICY room_members_delete_own
ON public.room_members FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_room_member_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  active_room_id uuid;
  current_members integer;
BEGIN
  IF NEW.role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = NEW.room_id AND created_by = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Only the room creator may be its owner';
    END IF;
    RETURN NEW;
  END IF;

  SELECT id INTO active_room_id
  FROM public.rooms
  WHERE id = NEW.room_id AND is_active
  FOR UPDATE;

  IF active_room_id IS NULL THEN
    RAISE EXCEPTION 'Room is not active';
  END IF;

  SELECT count(*) INTO current_members
  FROM public.room_members
  WHERE room_id = NEW.room_id;

  IF current_members >= 6 THEN
    RAISE EXCEPTION 'Room is full';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_room_member_capacity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS room_members_enforce_capacity ON public.room_members;
CREATE TRIGGER room_members_enforce_capacity
BEFORE INSERT ON public.room_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_room_member_capacity();

CREATE OR REPLACE FUNCTION public.add_room_creator_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.add_room_creator_membership() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS rooms_add_creator_membership ON public.rooms;
CREATE TRIGGER rooms_add_creator_membership
AFTER INSERT ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.add_room_creator_membership();

REVOKE ALL ON public.comments, public.rooms, public.room_members FROM anon;
GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rooms TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.room_members TO authenticated;