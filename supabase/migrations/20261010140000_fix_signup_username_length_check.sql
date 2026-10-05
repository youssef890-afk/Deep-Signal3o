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

  IF base_username = '' OR char_length(base_username) < 3 THEN
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

REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM anon, authenticated, public;