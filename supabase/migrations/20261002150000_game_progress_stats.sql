CREATE OR REPLACE FUNCTION public.get_my_game_stats()
RETURNS TABLE (
  total_points bigint,
  total_games bigint,
  total_wins bigint,
  today_games bigint,
  today_wins bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    COALESCE(SUM(points), 0)::bigint,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE result = 'win')::bigint,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))::bigint,
    COUNT(*) FILTER (WHERE result = 'win' AND created_at >= date_trunc('day', now()))::bigint
  FROM public.game_scores
  WHERE user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_my_game_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_game_stats() TO authenticated;