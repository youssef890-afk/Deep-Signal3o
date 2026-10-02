CREATE TABLE public.voice_card_clash_rooms (
  room_code text PRIMARY KEY CHECK (room_code ~ '^[A-Z0-9]{6}$'),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.voice_card_clash_players (
  room_code text NOT NULL REFERENCES public.voice_card_clash_rooms(room_code) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seat smallint NOT NULL CHECK (seat BETWEEN 0 AND 7),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, user_id),
  UNIQUE (room_code, seat)
);

CREATE INDEX voice_card_clash_players_seen_idx
ON public.voice_card_clash_players (room_code, last_seen_at);

ALTER TABLE public.voice_card_clash_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_card_clash_players ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_voice_card_clash_member(target_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.voice_card_clash_players
    WHERE room_code = target_code
      AND user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_voice_card_clash_member(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_voice_card_clash_member(text) TO authenticated;

CREATE POLICY voice_card_clash_rooms_read_members
ON public.voice_card_clash_rooms FOR SELECT TO authenticated
USING (
  host_id = (SELECT auth.uid())
  OR public.is_voice_card_clash_member(room_code)
);

CREATE POLICY voice_card_clash_players_read_members
ON public.voice_card_clash_players FOR SELECT TO authenticated
USING (public.is_voice_card_clash_member(room_code));

GRANT SELECT ON public.voice_card_clash_rooms TO authenticated;
GRANT SELECT ON public.voice_card_clash_players TO authenticated;

CREATE OR REPLACE FUNCTION public.create_voice_card_clash_room(target_code text)
RETURNS smallint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF target_code !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'Invalid room code';
  END IF;

  INSERT INTO public.voice_card_clash_rooms (room_code, host_id)
  VALUES (target_code, current_user_id);

  INSERT INTO public.voice_card_clash_players (room_code, user_id, seat)
  VALUES (target_code, current_user_id, 0);

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_voice_card_clash_room(target_code text)
RETURNS smallint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
  assigned_seat smallint;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM 1
  FROM public.voice_card_clash_rooms
  WHERE room_code = target_code AND is_active
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  DELETE FROM public.voice_card_clash_players
  WHERE room_code = target_code
    AND user_id <> current_user_id
    AND last_seen_at < now() - interval '45 seconds';

  SELECT seat INTO assigned_seat
  FROM public.voice_card_clash_players
  WHERE room_code = target_code AND user_id = current_user_id;

  IF FOUND THEN
    UPDATE public.voice_card_clash_players
    SET last_seen_at = now()
    WHERE room_code = target_code AND user_id = current_user_id;
    RETURN assigned_seat;
  END IF;

  SELECT candidate.seat INTO assigned_seat
  FROM generate_series(0, 7) AS candidate(seat)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.voice_card_clash_players p
    WHERE p.room_code = target_code AND p.seat = candidate.seat
  )
  ORDER BY candidate.seat
  LIMIT 1;

  IF assigned_seat IS NULL THEN
    RAISE EXCEPTION 'Room is full';
  END IF;

  INSERT INTO public.voice_card_clash_players (room_code, user_id, seat)
  VALUES (target_code, current_user_id, assigned_seat);

  RETURN assigned_seat;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_voice_card_clash_room(target_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.voice_card_clash_players
  SET last_seen_at = now()
  WHERE room_code = target_code
    AND user_id = (SELECT auth.uid());
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_voice_card_clash_room(target_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
  is_room_host boolean;
BEGIN
  SELECT host_id = current_user_id INTO is_room_host
  FROM public.voice_card_clash_rooms
  WHERE room_code = target_code
  FOR UPDATE;

  IF is_room_host THEN
    UPDATE public.voice_card_clash_rooms SET is_active = false WHERE room_code = target_code;
    DELETE FROM public.voice_card_clash_players WHERE room_code = target_code;
    RETURN true;
  END IF;

  DELETE FROM public.voice_card_clash_players
  WHERE room_code = target_code
    AND user_id = current_user_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.create_voice_card_clash_room(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_voice_card_clash_room(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.heartbeat_voice_card_clash_room(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leave_voice_card_clash_room(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_voice_card_clash_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_voice_card_clash_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_voice_card_clash_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_voice_card_clash_room(text) TO authenticated;