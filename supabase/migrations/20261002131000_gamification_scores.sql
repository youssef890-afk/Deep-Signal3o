CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game text NOT NULL DEFAULT 'tic-tac-toe',
  result text NOT NULL CHECK (result IN ('win', 'draw', 'loss')),
  points integer NOT NULL CHECK (points BETWEEN 0 AND 20),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_weekly
ON public.game_scores (created_at DESC, user_id);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS game_scores_read_authenticated ON public.game_scores;
CREATE POLICY game_scores_read_authenticated
ON public.game_scores
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS game_scores_insert_own ON public.game_scores;
CREATE POLICY game_scores_insert_own
ON public.game_scores
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));