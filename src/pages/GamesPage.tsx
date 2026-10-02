import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Gamepad2, RotateCcw, Bot, Users, Trophy, Wifi, Copy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
}

interface GameStats {
  totalPoints: number;
  totalGames: number;
  totalWins: number;
  todayGames: number;
  todayWins: number;
}

const gameCatalog = [
  { name: 'إكس-أو المتقدمة', category: 'ألعاب لوحية', status: 'متاحة', icon: '❌⭕' },
  { name: 'الحنش الملوّن', category: 'أركيد', status: 'قريباً', icon: '🐍' },
  { name: 'بلياردو 8', category: 'رياضة', status: 'قريباً', icon: '🎱' },
  { name: 'Connect Four', category: 'ألعاب لوحية', status: 'قريباً', icon: '🔴' },
  { name: 'تنس الطاولة', category: 'رياضة', status: 'قريباً', icon: '🏓' },
  { name: 'الشطرنج', category: 'ألعاب لوحية', status: 'قريباً', icon: '♟️' },
  { name: 'الداما', category: 'ألعاب لوحية', status: 'قريباً', icon: '⚫' },
  { name: 'الحنش والسلالم', category: 'ألعاب لوحية', status: 'قريباً', icon: '🎲' },
];

export default function GamesPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState<Array<string | null>>(Array(9).fill(null));
  const [boardSize, setBoardSize] = useState(3);
  const [isXNext, setIsXNext] = useState(true);
  const [vsAI, setVsAI] = useState(true);
  const [onlineMode, setOnlineMode] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [onlineRole, setOnlineRole] = useState<'host' | 'guest' | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [progressError, setProgressError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const scoreRecordedRef = useRef(false);

  // حساب الفائز
  const calculateWinner = (squares: Array<string | null>, size: number) => {
    const target = size === 3 ? 3 : 4;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        const mark = squares[row * size + column];
        if (!mark) continue;

        for (const [rowStep, columnStep] of directions) {
          let matches = 1;
          for (let step = 1; step < target; step++) {
            const nextRow = row + rowStep * step;
            const nextColumn = column + columnStep * step;
            if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) break;
            if (squares[nextRow * size + nextColumn] !== mark) break;
            matches++;
          }
          if (matches === target) return mark;
        }
      }
    }
    return null;
  };

  const winner = calculateWinner(board, boardSize);
  const isDraw = !winner && board.every((square) => square !== null);
  const playerLost = Boolean(winner && (onlineMode
    ? (winner === 'X') !== (onlineRole === 'host')
    : vsAI && winner === 'O'));

  const loadLeaderboard = useCallback(async () => {
    if (!user) return;
    const monday = new Date();
    monday.setUTCHours(0, 0, 0, 0);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));

    const { data: statsRows, error: statsError } = await supabase.rpc('get_my_game_stats');
    const stats = statsRows?.[0];
    if (statsError || !stats) {
      setGameStats(null);
      setProgressError('طبّق migration ديال تقدم الألعاب باش يبان المستوى والمهام.');
    } else {
      setGameStats({
        totalPoints: Number(stats.total_points),
        totalGames: Number(stats.total_games),
        totalWins: Number(stats.total_wins),
        todayGames: Number(stats.today_games),
        todayWins: Number(stats.today_wins),
      });
      setProgressError('');
    }

    const { data: follows, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    if (followError) {
      setLeaderboardError('طبّق migration ديال النقاط باش يبان الترتيب.');
      return;
    }

    const friendIds = [...new Set([user.id, ...(follows ?? []).map((item) => item.following_id)])];
    const { data: scores, error: scoreError } = await supabase
      .from('game_scores')
      .select('user_id, points')
      .in('user_id', friendIds)
      .gte('created_at', monday.toISOString());

    if (scoreError) {
      setLeaderboardError('طبّق migration ديال النقاط باش يبان الترتيب.');
      return;
    }

    const totals = new Map<string, number>();
    for (const score of scores ?? []) totals.set(score.user_id, (totals.get(score.user_id) ?? 0) + score.points);
    const ids = [...totals.keys()];
    const { data: profiles } = ids.length
      ? await supabase.from('profiles').select('id, username').in('id', ids)
      : { data: [] };
    const usernames = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
    setLeaderboard([...totals].map(([userId, points]) => ({ userId, points, username: usernames.get(userId) ?? 'مستخدم' })).sort((a, b) => b.points - a.points).slice(0, 10));
    setLeaderboardError('');
  }, [user]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => () => {
    if (channelRef.current) void supabase.removeChannel(channelRef.current);
  }, []);

  useEffect(() => {
    if ((!winner && !isDraw) || !user || scoreRecordedRef.current) return;
    scoreRecordedRef.current = true;
    const result = isDraw ? 'draw' : onlineMode && (winner === 'X') !== (onlineRole === 'host') ? 'loss' : 'win';
    const points = result === 'win' ? 5 : result === 'draw' ? 2 : 0;
    void supabase.from('game_scores').insert({ user_id: user.id, game: 'tic-tac-toe', result, points })
      .then(({ error }) => {
        if (error) setLeaderboardError('طبّق migration ديال النقاط باش تتحفظ النتائج.');
        else void loadLeaderboard();
      });
  }, [isDraw, loadLeaderboard, onlineMode, onlineRole, user, winner]);

  function connectToMatch(code: string, role: 'host' | 'guest', size = boardSize) {
    if (channelRef.current) void supabase.removeChannel(channelRef.current);
    const channel = supabase.channel(`ttt:${code}`, { config: { broadcast: { self: false } } });
    channel
      .on('broadcast', { event: 'joined' }, () => setOpponentConnected(true))
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        const nextBoardSize = Number(payload.boardSize);
        if (!Array.isArray(payload.board) || ![3, 4, 5].includes(nextBoardSize) || payload.board.length !== nextBoardSize * nextBoardSize) return;
        setBoardSize(nextBoardSize);
        setBoard(payload.board as Array<string | null>);
        setIsXNext(Boolean(payload.isXNext));
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        if (role === 'guest') {
          setOpponentConnected(true);
          void channel.send({ type: 'broadcast', event: 'joined', payload: {} });
        }
      });
    channelRef.current = channel;
    setInviteCode(code);
    setOnlineRole(role);
    setOnlineMode(true);
    setBoardSize(size);
    setBoard(Array(size * size).fill(null));
    setIsXNext(true);
    setOpponentConnected(role === 'guest');
    scoreRecordedRef.current = false;
  }

  function createOnlineMatch() {
    if (!user) return;
    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    connectToMatch(code, 'host');
  }

  function joinOnlineMatch() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) return;
    connectToMatch(code, 'guest');
  }

  function leaveOnlineMatch() {
    if (channelRef.current) void supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    setInviteCode('');
    setOnlineRole(null);
    setOnlineMode(false);
    setOpponentConnected(false);
    resetGame();
  }

  // حركة الكمبيوتر
  const makeAIMove = (currentBoard: Array<string | null>) => {
    const emptyIndices = currentBoard
      .map((val, idx) => (val === null ? idx : null))
      .filter((val): val is number => val !== null);

    if (emptyIndices.length === 0) return;

    const findWinningMove = (mark: string) => emptyIndices.find((index) => {
      const candidate = [...currentBoard];
      candidate[index] = mark;
      return calculateWinner(candidate, boardSize) === mark;
    });

    let selectedIndex = findWinningMove('O') ?? findWinningMove('X');

    if (selectedIndex === undefined && boardSize === 3) {
      const minimax = (squares: Array<string | null>, xTurn: boolean, depth: number): number => {
        const result = calculateWinner(squares, 3);
        if (result === 'O') return 10 - depth;
        if (result === 'X') return depth - 10;
        if (squares.every((square) => square !== null)) return 0;

        const scores = squares.flatMap((square, index) => {
          if (square !== null) return [];
          const nextBoard = [...squares];
          nextBoard[index] = xTurn ? 'X' : 'O';
          return [minimax(nextBoard, !xTurn, depth + 1)];
        });
        return xTurn ? Math.max(...scores) : Math.min(...scores);
      };

      const moves = emptyIndices.map((index) => {
        const candidate = [...currentBoard];
        candidate[index] = 'O';
        return { index, score: minimax(candidate, true, 0) };
      });
      const bestScore = Math.min(...moves.map((move) => move.score));
      const bestMoves = moves.filter((move) => move.score === bestScore);
      selectedIndex = bestMoves[Math.floor(Math.random() * bestMoves.length)].index;
    }

    if (selectedIndex === undefined) {
      selectedIndex = Math.floor(boardSize / 2) * boardSize + Math.floor(boardSize / 2);
      if (currentBoard[selectedIndex] !== null) {
        selectedIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      }
    }

    const newBoard = [...currentBoard];
    newBoard[selectedIndex] = 'O';
    setBoard(newBoard);
    setIsXNext(true);
  };

  const handleClick = (index: number) => {
    if (board[index] || winner) return;
    if (onlineMode && (!opponentConnected || (isXNext ? onlineRole !== 'host' : onlineRole !== 'guest'))) return;

    const newBoard = [...board];
    const mark = isXNext ? 'X' : 'O';
    newBoard[index] = mark;
    setBoard(newBoard);

    if (onlineMode) {
      const nextIsX = !isXNext;
      setIsXNext(nextIsX);
      void channelRef.current?.send({ type: 'broadcast', event: 'state', payload: { board: newBoard, boardSize, isXNext: nextIsX } });
      return;
    }

    if (vsAI && isXNext && !calculateWinner(newBoard, boardSize)) {
      setIsXNext(false);
      setTimeout(() => makeAIMove(newBoard), 400);
    } else {
      setIsXNext(!isXNext);
    }
  };

  const resetGame = () => {
    setBoard(Array(boardSize * boardSize).fill(null));
    setIsXNext(true);
    scoreRecordedRef.current = false;
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1600);
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-white py-10 px-4" dir="rtl">
      <AnimatePresence>
        {winner && (
          <motion.div
            key={`${winner}-${boardSize}`}
            role="status"
            aria-live="assertive"
            className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${playerLost ? 'bg-rose-950/35' : 'bg-emerald-950/30'}`}
            initial={{ opacity: 0 }}
            animate={playerLost
              ? { opacity: 1, x: [0, -7, 7, -5, 5, 0] }
              : { opacity: 1, scale: [0.96, 1.02, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: playerLost ? 0.55 : 0.7 }}
          >
            {!playerLost && Array.from({ length: 24 }, (_, index) => (
              <motion.span
                key={index}
                className="absolute top-[-5%] h-2.5 w-2 rounded-sm"
                style={{ left: `${(index * 41) % 100}%`, backgroundColor: ['#fbbf24', '#34d399', '#fb7185', '#67e8f9'][index % 4] }}
                animate={{ y: ['0vh', '110vh'], rotate: [0, 540] }}
                transition={{ duration: 1.8 + (index % 5) * 0.25, delay: (index % 8) * 0.08, ease: 'linear' }}
              />
            ))}
            <motion.div
              className={`rounded-2xl border px-8 py-6 text-center shadow-2xl backdrop-blur-md ${playerLost ? 'border-rose-300/30 bg-rose-950/70 text-rose-100' : 'border-emerald-200/30 bg-emerald-950/70 text-emerald-100'}`}
              initial={{ y: 16, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
            >
              <p className="text-2xl font-black">{playerLost ? 'الجولة الجاية أحسن' : 'ربحتي الجولة!'}</p>
              <p className="mt-2 text-sm opacity-75">{onlineMode ? (winner === 'X' ? 'صاحب كود الدعوة ربح' : 'اللاعب المنضم ربح') : `الفائز ${winner}`}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-4xl mx-auto space-y-8">

        {/* عنوان قسم الألعاب */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium">
            <Gamepad2 className="w-4 h-4" /> مركز الألعاب السريعة
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            العاب وتحديات
          </h1>
        </div>

        <nav className="flex flex-wrap justify-center gap-2" aria-label="أقسام الألعاب">
          {[
            ['#game-library', 'الألعاب'],
            ['#game-modes', 'طرق اللعب'],
            ['#game-progress', 'المستويات والمهام'],
            ['#game-leaderboard', 'الترتيب والجوائز'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65 transition-colors hover:border-cyan-300/30 hover:text-white">
              {label}
            </a>
          ))}
        </nav>

        <Link to="/games/voice-card-clash" className="mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-emerald-200/15 bg-emerald-200/[0.045] px-4 py-3 transition hover:border-emerald-200/30 hover:bg-emerald-200/[0.08]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-200/10 text-emerald-100"><Gamepad2 className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">Voice Card Clash · 4 ضد 4</span><span className="mt-0.5 block text-[11px] text-white/45">مزايدات، خدع، وصوت جماعي مع فريقك</span></span>
          <span className="shrink-0 text-xs font-semibold text-emerald-100">فتح اللعبة</span>
        </Link>

        <section id="game-library" className="scroll-mt-24 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">مكتبة الألعاب</h2>
              <p className="mt-1 text-xs text-white/45">لوحية، أركيد، ورياضة</p>
            </div>
            <span className="text-xs text-white/40">8 ألعاب</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gameCatalog.map((game) => (
              <article key={game.name} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <span aria-hidden="true" className="text-xl">{game.icon}</span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${game.status === 'متاحة' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-white/[0.06] text-white/40'}`}>
                    {game.status}
                  </span>
                </div>
                <h3 className="mt-3 truncate text-sm font-semibold">{game.name}</h3>
                <p className="mt-1 text-[11px] text-white/40">{game.category}</p>
              </article>
            ))}
          </div>
        </section>

        <div id="game-modes" className="scroll-mt-24 space-y-3">
        <h2 className="text-center text-sm font-semibold text-white/75">طرق اللعب</h2>
        <div className="mx-auto flex max-w-md items-center justify-center gap-2" role="group" aria-label="حجم لوحة إكس-أو">
          {[3, 4, 5].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                setBoardSize(size);
                setBoard(Array(size * size).fill(null));
                setIsXNext(true);
                scoreRecordedRef.current = false;
              }}
              disabled={onlineMode}
              aria-pressed={boardSize === size}
              className={`rounded-full border px-4 py-2 text-xs transition-colors disabled:opacity-40 ${boardSize === size ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-white/55'}`}
            >
              {size} × {size}
            </button>
          ))}
          {boardSize > 3 && <span className="text-[10px] text-white/40">أول لاعب يربط 4 كيربح</span>}
        </div>

        <div className="mx-auto flex max-w-md items-center justify-center gap-2" role="group" aria-label="وضع اللعب">
          <button type="button" onClick={() => { if (onlineMode) leaveOnlineMatch(); setVsAI(true); resetGame(); }} className={`rounded-full border px-3 py-2 text-xs ${!onlineMode && vsAI ? 'border-rose-400/40 bg-rose-400/10 text-rose-200' : 'border-white/10 bg-white/[0.03] text-white/55'}`}>
            أوفلاين ضد الحاسوب
          </button>
          <button type="button" onClick={() => { if (onlineMode) leaveOnlineMatch(); setVsAI(false); resetGame(); }} className={`rounded-full border px-3 py-2 text-xs ${!onlineMode && !vsAI ? 'border-rose-400/40 bg-rose-400/10 text-rose-200' : 'border-white/10 bg-white/[0.03] text-white/55'}`}>
            أوفلاين محلي
          </button>
          <button type="button" onClick={() => { setOnlineMode(true); setVsAI(false); }} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs ${onlineMode ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-white/55'}`}>
            <Wifi className="h-3.5 w-3.5" /> مباشر
          </button>
        </div>

        {onlineMode && (
          <section className="mx-auto max-w-md space-y-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.035] p-4" dir="rtl">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={createOnlineMatch} className="flex-1 rounded-xl bg-emerald-500/15 px-3 py-2.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25">
                إنشاء مباراة مباشرة
              </button>
              <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} maxLength={6} placeholder="كود الدعوة" className="w-28 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-center font-mono text-sm uppercase text-white outline-none focus:border-emerald-300/40" />
              <button type="button" onClick={joinOnlineMatch} disabled={joinCode.length !== 6} className="rounded-xl bg-white/[0.08] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-35">
                انضمام
              </button>
            </div>
            {onlineRole && (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className={opponentConnected ? 'text-emerald-200' : 'text-amber-200'}>
                  {opponentConnected ? 'الخصم دخل للمباراة' : 'تسنى اللاعب يدخل بالكود'}
                </span>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-black/30 px-2 py-1 font-mono text-white">{inviteCode}</code>
                  {onlineRole === 'host' && <button type="button" onClick={() => void handleCopyCode()} aria-label={copiedCode ? 'تم نسخ كود الدعوة' : 'نسخ كود الدعوة'} title={copiedCode ? 'تم النسخ' : 'نسخ الكود'} className="text-white/65 hover:text-white"><Copy className="h-4 w-4" /></button>}
                  <button type="button" onClick={leaveOnlineMatch} className="text-rose-300 hover:text-rose-200">خروج</button>
                </div>
              </div>
            )}
            <p className="text-[10px] leading-5 text-white/40">المباراة المباشرة تحتاج اتصالاً بالإنترنت وSupabase Realtime.</p>
          </section>
        )}
        </div>

        {/* كارت لعبة إكس - أو (Tic-Tac-Toe) */}
        <div className="max-w-md mx-auto bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              ❌⭕ لعبة إكس - أو
            </h2>

            {/* زر التبديل بين اللعب مع حاسوب أو صديق */}
            <button
              onClick={() => { setVsAI(!vsAI); resetGame(); }}
              disabled={onlineMode}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-all"
            >
              {vsAI ? <Bot className="w-4 h-4 text-cyan-400" /> : <Users className="w-4 h-4 text-purple-400" />}
              {vsAI ? 'ضد الحاسوب' : 'ضد صديق'}
            </button>
          </div>

          {/* حالة اللعبة */}
          <div className="text-center text-sm font-medium py-2 rounded-xl bg-black/30 border border-white/5">
            {winner ? (
              <span className="text-emerald-400">الفائز هو: {onlineMode ? winner === 'X' ? 'صاحب الكود' : 'المنضم' : winner} 🎉</span>
            ) : isDraw ? (
              <span className="text-amber-400">تعادل! 🤝</span>
            ) : (
              <span className="text-white/70">
                الدور على: <strong className={isXNext ? 'text-purple-400' : 'text-cyan-400'}>{onlineMode ? (isXNext ? onlineRole === 'host' ? 'أنت (X)' : 'الخصم (X)' : onlineRole === 'guest' ? 'أنت (O)' : 'الخصم (O)') : isXNext ? 'X' : 'O'}</strong>
              </span>
            )}
          </div>

          {/* شبكة اللعبة (3x3) */}
          <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}>
            {board.map((value, index) => (
              <button
                key={index}
                onClick={() => handleClick(index)}
                disabled={Boolean(
                  board[index] || winner || (onlineMode && (
                    !opponentConnected || (isXNext ? onlineRole !== 'host' : onlineRole !== 'guest')
                  ))
                )}
                className={`aspect-square min-h-0 rounded-xl sm:rounded-2xl text-2xl sm:text-3xl font-black flex items-center justify-center transition-all bg-black/40 border border-white/10 hover:border-purple-500/50 hover:bg-white/5 active:scale-95 ${
                  value === 'X' ? 'text-purple-400' : 'text-cyan-400'
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          {/* زر إعادة اللعب */}
          <button
            onClick={resetGame}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 font-medium text-sm transition-all active:scale-98"
          >
            <RotateCcw className="w-4 h-4" /> إعادة اللعب
          </button>
        </div>

        <section id="game-progress" className="mx-auto max-w-md scroll-mt-24 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5" dir="rtl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">المستويات والمهام</h2>
              <p className="mt-1 text-[11px] text-white/40">كل 100 نقطة كتفتح مستوى جديد</p>
            </div>
            {gameStats && <span className="rounded-full bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100">المستوى {Math.floor(gameStats.totalPoints / 100) + 1}</span>}
          </div>
          {progressError ? (
            <p className="text-xs leading-5 text-amber-200/80">{progressError}</p>
          ) : !gameStats ? (
            <p className="text-xs text-white/45">كنجيبو تقدمك...</p>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px] text-white/55">
                <span>{gameStats.totalPoints % 100} / 100 XP</span>
                <span>المكافأة الجاية: شارة المستوى {Math.ceil((Math.floor(gameStats.totalPoints / 100) + 1) / 5) * 5}</span>
              </div>
              <div
                role="progressbar"
                aria-label="التقدم نحو المستوى التالي"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={gameStats.totalPoints % 100}
                className="h-2 overflow-hidden rounded-full bg-white/10"
              >
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-[width]" style={{ width: `${gameStats.totalPoints % 100}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-black/20 px-3 py-2"><p className="text-lg font-bold">{gameStats.totalGames}</p><p className="text-[10px] text-white/40">جولة إجمالاً</p></div>
                <div className="rounded-lg bg-black/20 px-3 py-2"><p className="text-lg font-bold">{gameStats.totalWins}</p><p className="text-[10px] text-white/40">فوز إجمالي</p></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-white/75">مهام اليوم</h3>
                {[
                  { label: 'العب 3 جولات', current: gameStats.todayGames, target: 3 },
                  { label: 'ربح جولة', current: gameStats.todayWins, target: 1 },
                ].map((mission) => (
                  <div key={mission.label} className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2 text-xs">
                    <span className="text-white/70">{mission.label}</span>
                    <span className={mission.current >= mission.target ? 'text-emerald-200' : 'text-white/45'}>{Math.min(mission.current, mission.target)} / {mission.target}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section id="game-leaderboard" className="mx-auto max-w-md scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] p-5" dir="rtl">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-semibold">ترتيب الأصدقاء هذا الأسبوع</h2>
          </div>
          {leaderboardError ? (
            <p className="text-xs leading-5 text-amber-200/80">{leaderboardError}</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-xs text-white/45">العب جولة باش تبدأ تجمع النقاط.</p>
          ) : (
            <ol className="space-y-2">
              {leaderboard.map((entry, index) => (
                <li key={entry.userId} className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2">
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${index === 0 ? 'bg-amber-300/15 text-amber-200' : 'bg-white/[0.05] text-white/50'}`}>{index + 1}</span>
                  <span className="flex-1 truncate text-xs text-white/80">{entry.username}{entry.userId === user?.id ? ' (أنت)' : ''}</span>
                  <span className="text-xs font-semibold text-emerald-200">{entry.points} نقطة</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-[10px] text-white/35">الفوز 5 نقاط، التعادل نقطتان. الترتيب من الاثنين حتى اليوم.</p>
        </section>

      </div>
    </div>
  );
}