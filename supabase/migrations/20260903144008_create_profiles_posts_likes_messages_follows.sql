/*
# Deep Signal — Core Schema

## Overview
Creates the full social media backend for Deep Signal: profiles, posts, likes,
follows, and direct messages. All tables are owner-scoped with RLS for an
authenticated (sign-in required) app.

## New Tables

1. **profiles**
   - `id` (uuid, PK, FK → auth.users) — one row per user, same id as auth user
   - `username` (text, unique, not null) — display handle
   - `full_name` (text) — optional display name
   - `avatar_url` (text) — optional profile image URL
   - `bio` (text) — optional bio
   - `created_at` (timestamptz)

2. **posts**
   - `id` (uuid, PK)
   - `user_id` (uuid, FK → auth.users, DEFAULT auth.uid())
   - `image_url` (text, not null) — post image
   - `caption` (text) — optional caption
   - `created_at` (timestamptz)

3. **likes**
   - `id` (uuid, PK)
   - `post_id` (uuid, FK → posts ON DELETE CASCADE)
   - `user_id` (uuid, FK → auth.users, DEFAULT auth.uid())
   - `created_at` (timestamptz)
   - UNIQUE(post_id, user_id) — one like per user per post

4. **follows**
   - `id` (uuid, PK)
   - `follower_id` (uuid, FK → auth.users, DEFAULT auth.uid())
   - `following_id` (uuid, FK → auth.users)
   - `created_at` (timestamptz)
   - UNIQUE(follower_id, following_id) — one follow per pair

5. **messages**
   - `id` (uuid, PK)
   - `sender_id` (uuid, FK → auth.users, DEFAULT auth.uid())
   - `receiver_id` (uuid, FK → auth.users)
   - `content` (text, not null)
   - `created_at` (timestamptz)
   - `read_at` (timestamptz) — null until read

## Security (RLS)
- All tables have RLS enabled.
- profiles: anyone authenticated can read all profiles (social app); users can
  only update their own profile.
- posts: anyone authenticated can read all posts; only owner can insert/update/
  delete their own posts.
- likes: anyone authenticated can read all likes; only owner can insert/delete
  their own likes.
- follows: anyone authenticated can read all follows; only the follower can
  insert/delete their own follows.
- messages: users can read messages where they are sender OR receiver; only
  sender can insert; only receiver can update read_at; only sender can delete
  their own sent messages.

## Notes
1. Owner columns default to auth.uid() so frontend inserts that omit user_id
   still pass RLS WITH CHECK.
2. Storage bucket 'avatars' and 'posts' are used for image uploads — created
   separately via storage API.
3. Realtime is enabled on the messages table for live chat.
*/

-- ===== PROFILES =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
CREATE POLICY "profiles_read_all"
ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== POSTS =====
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_read_all" ON posts;
CREATE POLICY "posts_read_all"
ON posts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own"
ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own"
ON posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own"
ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== LIKES =====
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_read_all" ON likes;
CREATE POLICY "likes_read_all"
ON likes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "likes_insert_own" ON likes;
CREATE POLICY "likes_insert_own"
ON likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "likes_delete_own" ON likes;
CREATE POLICY "likes_delete_own"
ON likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== FOLLOWS =====
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_read_all" ON follows;
CREATE POLICY "follows_read_all"
ON follows FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "follows_insert_own" ON follows;
CREATE POLICY "follows_insert_own"
ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_delete_own" ON follows;
CREATE POLICY "follows_delete_own"
ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ===== MESSAGES =====
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_read_own" ON messages;
CREATE POLICY "messages_read_own"
ON messages FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_insert_own" ON messages;
CREATE POLICY "messages_insert_own"
ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_update_own"
ON messages FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_delete_own" ON messages;
CREATE POLICY "messages_delete_own"
ON messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ===== ENABLE REALTIME ON MESSAGES =====
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ===== AUTO-CREATE PROFILE ON SIGNUP =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();