import { useCallback, useEffect, useRef, useState } from 'react';
import { Gamepad2, RotateCcw, Bot, Users, Trophy, Wifi, Copy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
}

export default function GamesPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState<Array<string | null>>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [vsAI, setVsAI] = useState(true);
  const [onlineMode, setOnlineMode] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [onlineRole, setOnlineRole] = useState<'host' | 'guest' | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const scoreRecordedRef = useRef(false);

  // حساب الفائز
  const calculateWinner = (squares: Array<string | null>) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // أفقياً
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // عمودياً
      [0, 4, 8], [2, 4, 6]             // قطرياً
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const winner = calculateWinner(board);
  const isDraw = !winner && board.every((square) => square !== null);

  const loadLeaderboard = useCallback(async () => {
    if (!user) return;
    const monday = new Date();
    monday.setUTCHours(0, 0, 0, 0);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));

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

  function connectToMatch(code: string, role: 'host' | 'guest') {
    if (channelRef.current) void supabase.removeChannel(channelRef.current);
    const channel = supabase.channel(`ttt:${code}`, { config: { broadcast: { self: false } } });
    channel
      .on('broadcast', { event: 'joined' }, () => setOpponentConnected(true))
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        if (!Array.isArray(payload.board) || payload.board.length !== 9) return;
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
    setBoard(Array(9).fill(null));
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

  // حركة الكمبيوتر (AI بسيط)
  const makeAIMove = (currentBoard: Array<string | null>) => {
    const emptyIndices = currentBoard
      .map((val, idx) => (val === null ? idx : null))
      .filter((val): val is number => val !== null);

    if (emptyIndices.length > 0) {
      const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      const newBoard = [...currentBoard];
      newBoard[randomIndex] = 'O';
      setBoard(newBoard);
      setIsXNext(true);
    }
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
      void channelRef.current?.send({ type: 'broadcast', event: 'state', payload: { board: newBoard, isXNext: nextIsX } });
      return;
    }

    if (vsAI && isXNext && !calculateWinner(newBoard)) {
      setIsXNext(false);
      setTimeout(() => makeAIMove(newBoard), 400);
    } else {
      setIsXNext(!isXNext);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
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
          <div className="grid grid-cols-3 gap-3">
            {board.map((value, index) => (
              <button
                key={index}
                onClick={() => handleClick(index)}
                disabled={Boolean(
                  board[index] || winner || (onlineMode && (
                    !opponentConnected || (isXNext ? onlineRole !== 'host' : onlineRole !== 'guest')
                  ))
                )}
                className={`h-24 rounded-2xl text-3xl font-black flex items-center justify-center transition-all bg-black/40 border border-white/10 hover:border-purple-500/50 hover:bg-white/5 active:scale-95 ${
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

        <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-5" dir="rtl">
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