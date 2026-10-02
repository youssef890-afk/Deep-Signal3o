import { useCallback, useEffect, useRef, useState } from 'react';
import type { Participant, Room as LiveKitRoom, Track } from 'livekit-client';
import {
  Copy,
  Crown,
  Headphones,
  Mic,
  MicOff,
  Radio,
  Shield,
  Sparkles,
  Timer,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  applyClashAction,
  createLobbyState,
  startClashRound,
  type ClashAction,
  type ClashCard,
  type ClashState,
  type Team,
} from '@/components/voice-card-clash/gameLogic';

interface VoiceCardClash3DProps {
  onExit?: () => void;
}

interface PresencePlayer {
  userId: string;
  username: string;
  avatarUrl: string | null;
  seat: number;
  joinedAt: number;
  isHost: boolean;
}

interface VoiceStatus {
  microphone: boolean;
  speaking: boolean;
}

const LIVEKIT_URL = (import.meta.env as ImportMetaEnv & { VITE_LIVEKIT_URL?: string }).VITE_LIVEKIT_URL;

function makeRoomCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
}

function isClashState(value: unknown): value is ClashState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<ClashState>;
  return ['lobby', 'bidding', 'playing', 'round_end', 'match_end'].includes(String(state.phase))
    && typeof state.hostId === 'string'
    && Array.isArray(state.seatUserIds)
    && state.score !== undefined;
}

function PlayerSeat({
  seat,
  player,
  hand,
  active,
  local,
  voice,
  onPlay,
}: {
  seat: number;
  player?: PresencePlayer;
  hand: ClashCard[];
  active: boolean;
  local: boolean;
  voice?: VoiceStatus;
  onPlay: (cardId: string) => void;
}) {
  const team: Team = seat < 4 ? 'alpha' : 'beta';
  const isMuted = voice?.microphone !== true;

  return (
    <article className={`min-w-0 rounded-xl border p-2.5 transition-colors ${active ? 'border-amber-200/50 bg-amber-200/[0.08] shadow-[0_0_24px_rgba(251,191,36,0.12)]' : 'border-white/[0.08] bg-black/20'}`}>
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          {player ? (
            <Avatar src={player.avatarUrl} name={player.username} size="sm" ring={active} />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-full border border-dashed border-white/15 text-white/25">
              <Users className="h-4 w-4" />
            </div>
          )}
          {player?.isHost && <Crown className="absolute -right-1 -top-1 h-3.5 w-3.5 text-amber-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white/90">{player?.username ?? `المقعد ${seat + 1}`}{local ? ' (أنت)' : ''}</p>
          <p className={`text-[9px] ${team === 'alpha' ? 'text-cyan-200/60' : 'text-rose-200/60'}`}>{team === 'alpha' ? 'Alpha' : 'Beta'}</p>
        </div>
        <span className={`flex h-6 w-8 items-center justify-center gap-0.5 rounded-full ${voice?.speaking ? 'bg-emerald-300/15' : 'bg-white/[0.04]'}`} aria-label={voice?.speaking ? 'يتحدث' : isMuted ? 'الميكروفون مغلق' : 'الميكروفون مفتوح'}>
          {voice?.speaking ? (
            <>
              <i className="h-2 w-0.5 animate-pulse rounded bg-emerald-300" />
              <i className="h-3 w-0.5 animate-pulse rounded bg-emerald-200 [animation-delay:120ms]" />
              <i className="h-1.5 w-0.5 animate-pulse rounded bg-emerald-300 [animation-delay:240ms]" />
            </>
          ) : isMuted ? <MicOff className="h-3 w-3 text-white/35" /> : <Mic className="h-3 w-3 text-emerald-200" />}
        </span>
      </div>
      <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1" aria-label="بطاقات اللاعب المكشوفة">
        {hand.length ? hand.map((card) => (
          <button
            key={card.id}
            type="button"
            disabled={!local || !active}
            onClick={() => onPlay(card.id)}
            aria-label={`العب ${card.label} ${card.suit}`}
            className={`grid h-7 min-w-7 place-items-center rounded border bg-white text-[10px] font-bold shadow-sm transition ${card.suit === '♥' || card.suit === '♦' ? 'text-rose-600' : 'text-slate-900'} ${local && active ? '-translate-y-0.5 border-amber-300 hover:-translate-y-1 hover:shadow-amber-200/30' : 'border-slate-200/70 disabled:cursor-default'}`}
          >
            {card.label}{card.suit}
          </button>
        )) : <span className="text-[9px] text-white/25">{player ? 'بانتظار الجولة' : 'مقعد فارغ'}</span>}
      </div>
    </article>
  );
}

export default function VoiceCardClash3D({ onExit }: VoiceCardClash3DProps) {
  const { user, profile } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [mySeat, setMySeat] = useState<number | null>(null);
  const [players, setPlayers] = useState<PresencePlayer[]>([]);
  const [gameState, setGameState] = useState<ClashState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('غير متصل');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [teamOnly, setTeamOnly] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceStatus, setVoiceStatus] = useState<Record<string, VoiceStatus>>({});
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const stateRef = useRef<ClashState | null>(null);
  const roomRef = useRef<LiveKitRoom | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const timerKeyRef = useRef('');
  const micEnabledRef = useRef(false);
  const speakingBroadcastAtRef = useRef(0);

  const username = profile?.username ?? user?.user_metadata?.username ?? 'لاعب';
  const stateSeat = gameState?.seatUserIds.indexOf(user?.id ?? '') ?? -1;
  const localSeat = stateSeat >= 0 ? stateSeat : mySeat ?? -1;
  const localTeam: Team = localSeat >= 4 ? 'beta' : 'alpha';
  const currentTurnId = gameState?.seatUserIds[gameState.turnSeat];
  const currentTurnName = players.find((player) => player.userId === currentTurnId)?.username ?? 'اللاعب';
  const isLocalTurn = currentTurnId === user?.id;
  const isHost = gameState?.hostId === user?.id || isOwner;

  const syncGameState = useCallback((nextState: ClashState) => {
    stateRef.current = nextState;
    setGameState(nextState);
    void channelRef.current?.send({ type: 'broadcast', event: 'game-state', payload: { state: nextState } });
  }, []);

  useEffect(() => {
    if (!roomCode || !user) return;
    let active = true;
    const joinedAt = Date.now();
    const channel = supabase.channel(`voice-card-clash:${roomCode}`, {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    const refreshPresence = () => {
      const presence = Object.values(channel.presenceState()).flat() as Array<Partial<PresencePlayer>>;
      const uniquePlayers = new Map<string, PresencePlayer>();
      for (const item of presence) {
        if (!item.userId || uniquePlayers.has(item.userId)) continue;
        uniquePlayers.set(item.userId, {
          userId: item.userId,
          username: item.username ?? 'لاعب',
          avatarUrl: item.avatarUrl ?? null,
          seat: Number.isInteger(item.seat) ? Number(item.seat) : 8,
          joinedAt: Number(item.joinedAt ?? 0),
          isHost: Boolean(item.isHost),
        });
      }
      const nextPlayers = [...uniquePlayers.values()].sort((first, second) => first.seat - second.seat).slice(0, 8);
      setPlayers(nextPlayers);

      const host = nextPlayers.find((player) => player.isHost);
      if (host && host.userId === user.id && !stateRef.current) {
        syncGameState(createLobbyState(user.id));
      } else if (host && host.userId === user.id && stateRef.current) {
        void channel.send({ type: 'broadcast', event: 'game-state', payload: { state: stateRef.current } });
      }
    };

    channel
      .on('presence', { event: 'sync' }, refreshPresence)
      .on('broadcast', { event: 'game-state' }, ({ payload }) => {
        if (active && isClashState(payload?.state)) {
          stateRef.current = payload.state;
          setGameState(payload.state);
        }
      })
      .on('broadcast', { event: 'action' }, ({ payload }) => {
        const state = stateRef.current;
        if (!active || !state || state.hostId !== user.id) return;
        if (typeof payload?.actorId !== 'string' || !payload.action) return;
        const nextState = applyClashAction(state, payload.actorId, payload.action as ClashAction);
        if (nextState) syncGameState(nextState);
      })
      .on('broadcast', { event: 'voice-status' }, ({ payload }) => {
        if (!active || typeof payload?.userId !== 'string') return;
        setVoiceStatus((current) => ({
          ...current,
          [payload.userId]: { microphone: Boolean(payload.microphone), speaking: Boolean(payload.speaking) },
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('متصل');
          await channel.track({
            userId: user.id,
            username,
            avatarUrl: profile?.avatar_url ?? null,
            seat: mySeat ?? 8,
            joinedAt,
            isHost: isOwner,
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('تعذر الاتصال');
          setError('تعذر الاتصال بالغرفة. تحقق من Supabase Realtime وحاول مرة أخرى.');
        }
      });

    return () => {
      active = false;
      if (channelRef.current === channel) channelRef.current = null;
      void supabase.removeChannel(channel);
      setConnectionStatus('غير متصل');
    };
  }, [isOwner, mySeat, profile?.avatar_url, roomCode, syncGameState, user, username]);

  useEffect(() => {
    if (!roomCode) return;
    const heartbeat = () => {
      void supabase.rpc('heartbeat_voice_card_clash_room', { target_code: roomCode });
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 15_000);
    return () => window.clearInterval(interval);
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode || !user || !LIVEKIT_URL) return;
    let active = true;
    let liveKitRoom: LiveKitRoom | null = null;

    const connectVoice = async () => {
      setVoiceError('');
      try {
        const { Room, RoomEvent } = await import('livekit-client');
        if (!active) return;
        liveKitRoom = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = liveKitRoom;

        liveKitRoom.on(RoomEvent.ActiveSpeakersChanged, (participants: Participant[]) => {
          const speaking = participants.some((participant) => participant.identity === user.id);
          setLocalSpeaking(speaking);
          const now = Date.now();
          if (now - speakingBroadcastAtRef.current > 350) {
            speakingBroadcastAtRef.current = now;
            void channelRef.current?.send({
              type: 'broadcast',
              event: 'voice-status',
              payload: { userId: user.id, microphone: micEnabledRef.current, speaking },
            });
          }
        });

        liveKitRoom.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
          if (track.kind !== 'audio' || !audioContainerRef.current) return;
          const audio = track.attach();
          audio.autoplay = true;
          audio.dataset.participant = participant.identity;
          audioContainerRef.current.appendChild(audio);
        });

        liveKitRoom.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
          track.detach().forEach((element) => element.remove());
        });

        const voiceRoomName = teamOnly ? `${roomCode}-team-${localTeam}` : `${roomCode}-all`;
        const { data, error: tokenError } = await supabase.functions.invoke('livekit-token', {
          body: { roomName: voiceRoomName },
        });
        if (tokenError || !data?.token) throw tokenError ?? new Error('LiveKit token endpoint is not configured');
        await liveKitRoom.connect(LIVEKIT_URL, data.token);
        if (!active) {
          await liveKitRoom.disconnect();
          return;
        }
        await liveKitRoom.localParticipant.setMicrophoneEnabled(micEnabledRef.current);
        if (active) setVoiceConnected(true);
      } catch (connectError) {
        if (liveKitRoom) void liveKitRoom.disconnect();
        if (roomRef.current === liveKitRoom) roomRef.current = null;
        if (active) {
          setVoiceConnected(false);
          setVoiceError(connectError instanceof Error ? connectError.message : 'تعذر الاتصال بالصوت');
        }
      }
    };

    void connectVoice();
    return () => {
      active = false;
      setVoiceConnected(false);
      setLocalSpeaking(false);
      if (liveKitRoom) void liveKitRoom.disconnect();
      if (roomRef.current === liveKitRoom) roomRef.current = null;
    };
  }, [localTeam, roomCode, teamOnly, user]);

  useEffect(() => {
    const state = gameState;
    if (!state || (state.phase !== 'bidding' && state.phase !== 'playing')) {
      setSecondsLeft(15);
      return;
    }

    const timerKey = `${state.round}:${state.phase}:${state.turnSeat}:${state.turnStartedAt}`;
    const tick = () => {
      const seconds = Math.max(0, 15 - Math.floor((Date.now() - state.turnStartedAt) / 1000));
      setSecondsLeft(seconds);
      if (seconds > 0 || state.hostId !== user?.id || timerKeyRef.current === timerKey) return;
      timerKeyRef.current = timerKey;
      const playerId = state.seatUserIds[state.turnSeat];
      const timeoutAction: ClashAction = state.phase === 'bidding'
        ? { type: 'bid', value: 0 }
        : { type: 'play', cardId: state.hands[playerId]?.[0]?.id ?? '' };
      const nextState = applyClashAction(state, playerId, timeoutAction);
      if (nextState) syncGameState(nextState);
    };

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [gameState, syncGameState, user?.id]);

  const createRoom = async () => {
    if (!user) return;
    const newCode = makeRoomCode();
    stateRef.current = null;
    setGameState(null);
    setError('');
    const { data: seat, error: roomError } = await supabase.rpc('create_voice_card_clash_room', { target_code: newCode });
    if (roomError) {
      setError(roomError.message);
      return;
    }
    setMySeat(Number(seat));
    setIsOwner(true);
    setRoomCode(newCode);
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (code.length !== 6) return;
    stateRef.current = null;
    setGameState(null);
    setError('');
    const { data: seat, error: roomError } = await supabase.rpc('join_voice_card_clash_room', { target_code: code });
    if (roomError) {
      setError(roomError.message);
      return;
    }
    setMySeat(Number(seat));
    setIsOwner(false);
    setRoomCode(code);
  };

  const leaveRoom = async () => {
    if (roomCode) await supabase.rpc('leave_voice_card_clash_room', { target_code: roomCode });
    setRoomCode('');
    setGameState(null);
    stateRef.current = null;
    setPlayers([]);
    setMySeat(null);
    setVoiceStatus({});
    setTeamOnly(false);
    setMicEnabled(false);
    micEnabledRef.current = false;
  };

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const applyAction = (action: ClashAction) => {
    const state = stateRef.current;
    if (!state || !user || !isLocalTurn) return;
    if (state.hostId === user.id) {
      const nextState = applyClashAction(state, user.id, action);
      if (nextState) syncGameState(nextState);
      return;
    }
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'action',
      payload: { actorId: user.id, action },
    });
  };

  const startRound = () => {
    if (!user || !gameState || !isHost || players.length !== 8) return;
    syncGameState(startClashRound(gameState, players.map((player) => player.userId)));
  };

  const toggleMicrophone = async () => {
    const room = roomRef.current;
    if (!room || !voiceConnected) return;
    const enabled = !micEnabledRef.current;
    try {
      await room.localParticipant.setMicrophoneEnabled(enabled);
      micEnabledRef.current = enabled;
      setMicEnabled(enabled);
      setVoiceStatus((current) => ({ ...current, [user?.id ?? '']: { microphone: enabled, speaking: localSpeaking } }));
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'voice-status',
        payload: { userId: user?.id, microphone: enabled, speaking: localSpeaking },
      });
    } catch (micError) {
      setVoiceError(micError instanceof Error ? micError.message : 'تعذر تشغيل الميكروفون');
    }
  };

  if (!user) {
    return <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-sm text-white/60">سجل الدخول باش تلعب.</div>;
  }

  const playerById = new Map(players.map((player) => [player.userId, player]));
  const liveSeats = gameState?.seatUserIds ?? players.map((player) => player.userId);
  const teamPlayers = (team: Team) => Array.from({ length: 4 }, (_, position) => {
    const seat = team === 'alpha' ? position : position + 4;
    const playerId = liveSeats[seat];
    return { seat, player: playerId ? playerById.get(playerId) : undefined, hand: gameState?.hands[playerId ?? ''] ?? [] };
  });
  const phaseLabel = gameState?.phase === 'bidding'
    ? 'المزايدة'
    : gameState?.phase === 'playing'
      ? `الخدعة ${gameState.trick + 1} من 3`
      : gameState?.phase === 'round_end'
        ? 'نهاية الجولة'
        : gameState?.phase === 'match_end'
          ? 'انتهت المباراة'
          : 'غرفة الانتظار';

  return (
    <section className="relative mx-auto w-full max-w-[1280px] overflow-hidden rounded-2xl border border-white/10 bg-[#0c1212] text-white shadow-2xl" dir="rtl" aria-label="Voice Card Clash 4 ضد 4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(19,99,73,0.16),transparent_58%)]" />
      <header className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200/15 bg-emerald-300/[0.08] text-emerald-100"><Sparkles className="h-5 w-5" /></div>
          <div>
            <h1 className="text-base font-bold sm:text-lg">Voice Card Clash</h1>
            <p className="text-[10px] text-white/45">مواجهة 4 ضد 4 · خدع ومزايدات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onExit && <button type="button" onClick={onExit} aria-label="إغلاق اللعبة" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/55 hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button>}
          {roomCode && <button type="button" onClick={() => void leaveRoom()} className="rounded-full border border-white/10 px-3 py-2 text-[11px] text-white/60 hover:bg-white/[0.05]">مغادرة الغرفة</button>}
        </div>
      </header>

      {!roomCode ? (
        <div className="relative mx-auto grid max-w-3xl gap-6 p-5 sm:p-8 md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center">
            <div className="mb-3 flex items-center gap-2 text-emerald-200"><Radio className="h-4 w-4" /><span className="text-xs font-semibold">طاولة مباشرة</span></div>
            <h2 className="max-w-md text-2xl font-bold leading-tight sm:text-3xl">اجمع فريقك.<br />واكسب الخدعة.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/50">ثمانية لاعبين، مزايدات سريعة، وثلاث خدع في كل جولة. أوراق مكشوفة للجميع، والدور عندك 15 ثانية.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[10px] text-white/50">
              <span className="rounded-full border border-white/10 px-3 py-1.5">4 × Alpha</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">4 × Beta</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">15 ثانية لكل دور</span>
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <button type="button" onClick={createRoom} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-bold text-emerald-950 transition hover:bg-emerald-200"><Radio className="h-4 w-4" /> إنشاء غرفة جديدة</button>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-white/30"><span className="h-px flex-1 bg-white/10" /> أو انضم بكود <span className="h-px flex-1 bg-white/10" /></div>
            <div className="flex gap-2">
              <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} maxLength={6} placeholder="ABC123" aria-label="كود الغرفة" dir="ltr" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#090e0e] px-3 text-center font-mono text-sm tracking-[0.16em] text-white outline-none focus:border-emerald-200/40" />
              <button type="button" onClick={joinRoom} disabled={joinCode.length !== 6} className="rounded-xl border border-white/10 px-4 text-xs font-semibold text-white/75 transition hover:bg-white/[0.06] disabled:opacity-30">انضمام</button>
            </div>
            <div className="flex items-center gap-2 border-t border-white/[0.07] pt-3 text-[10px] text-white/35"><Shield className="h-3.5 w-3.5 shrink-0 text-emerald-200/60" /> الصوت يحتاج إعداد LiveKit server-side.</div>
          </div>
        </div>
      ) : (
        <div className="relative space-y-4 p-3 sm:space-y-5 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5 text-emerald-100"><span className={`h-2 w-2 rounded-full ${connectionStatus === 'متصل' ? 'bg-emerald-300' : 'bg-amber-300'}`} />{connectionStatus}</span>
              <span className="text-white/45">{players.length}/8 لاعبين</span>
              <span className="text-white/45">الغرفة <b className="font-mono tracking-[0.14em] text-white/80" dir="ltr">{roomCode}</b></span>
            </div>
            <button type="button" onClick={() => void copyRoomCode()} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.06]"><Copy className="h-3 w-3" />{copied ? 'تم النسخ' : 'نسخ الدعوة'}</button>
          </div>

          <div className="grid items-start gap-3 lg:grid-cols-[minmax(175px,0.82fr)_minmax(320px,1.5fr)_minmax(175px,0.82fr)] lg:items-center">
            <section className="order-1 space-y-2 rounded-xl border border-cyan-200/10 bg-cyan-200/[0.025] p-2.5 sm:p-3" aria-label="فريق Alpha">
              <div className="flex items-center justify-between px-1"><h2 className="text-xs font-bold text-cyan-100">Alpha</h2><span className="text-[10px] text-white/35">{gameState?.tricksWon.alpha ?? 0} خدعة</span></div>
              {teamPlayers('alpha').map(({ seat, player, hand }) => (
                <PlayerSeat key={seat} seat={seat} player={player} hand={hand} active={Boolean(gameState && gameState.seatUserIds[gameState.turnSeat] === player?.userId && (gameState.phase === 'bidding' || gameState.phase === 'playing'))} local={Boolean(gameState && player?.userId === user?.id && isLocalTurn && gameState.phase === 'playing')} voice={voiceStatus[player?.userId ?? '']} onPlay={(cardId) => applyAction({ type: 'play', cardId })} />
              ))}
            </section>

            <section className="order-2 min-w-0 rounded-xl border border-emerald-100/15 bg-[#10231c]/80 p-3 shadow-[inset_0_0_40px_rgba(16,185,129,0.05)] sm:p-5" aria-label="طاولة اللعب">
              <div className="flex items-center justify-between gap-2">
                <div><p className="text-[9px] uppercase tracking-[0.14em] text-emerald-100/45">الجولة {gameState?.round ?? 0}</p><h2 className="mt-0.5 text-sm font-bold">{phaseLabel}</h2></div>
                {(gameState?.phase === 'bidding' || gameState?.phase === 'playing') && <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-mono text-xs ${secondsLeft <= 5 ? 'bg-rose-300/10 text-rose-200' : 'bg-white/[0.05] text-white/70'}`}><Timer className="h-3.5 w-3.5" />00:{String(secondsLeft).padStart(2, '0')}</div>}
              </div>

              <div className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5 text-center">
                <div><p className="text-[9px] text-cyan-100/50">ALPHA</p><p className="text-xl font-bold text-cyan-100">{gameState?.score.alpha ?? 0}</p></div>
                <span className="text-[10px] text-white/25">:</span>
                <div><p className="text-[9px] text-rose-100/50">BETA</p><p className="text-xl font-bold text-rose-100">{gameState?.score.beta ?? 0}</p></div>
              </div>

              <div className="flex min-h-28 flex-wrap items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-100/10 bg-black/15 p-3 sm:min-h-36">
                {gameState?.playedCards.length ? gameState.playedCards.map((played) => (
                  <div key={`${played.playerId}-${played.card.id}`} className={`grid h-[62px] w-[44px] place-items-center rounded-md border border-slate-200 bg-white text-sm font-bold shadow-lg ${played.card.suit === '♥' || played.card.suit === '♦' ? 'text-rose-600' : 'text-slate-900'}`} aria-label={`${playerById.get(played.playerId)?.username ?? 'لاعب'} لعب ${played.card.label} ${played.card.suit}`}>
                    <span>{played.card.label}<br />{played.card.suit}</span>
                  </div>
                )) : <div className="text-center"><div className="mb-2 flex justify-center gap-1.5 text-emerald-100/25"><span className="grid h-9 w-7 place-items-center rounded border border-current">♠</span><span className="grid h-9 w-7 place-items-center rounded border border-current">♥</span><span className="grid h-9 w-7 place-items-center rounded border border-current">♣</span></div><p className="text-[10px] text-white/35">{players.length === 8 ? 'الطاولة جاهزة' : `بانتظار ${8 - players.length} لاعبين`}</p></div>}
              </div>

              <div className="mt-3 min-h-8 text-center text-[11px] text-white/55">
                {gameState?.phase === 'lobby' && (isHost
                  ? <span>اجمعو 8 لاعبين باش تبداو</span>
                  : <span>المضيف {playerById.get(gameState.hostId)?.username ?? 'لاعب'} غادي يبدا الجولة</span>)}
                {(gameState?.phase === 'bidding' || gameState?.phase === 'playing') && <span>الدور على <b className="text-white">{currentTurnName}</b>{isLocalTurn ? ' · دورك دابا' : ''}</span>}
                {gameState?.phase === 'round_end' && <span>Alpha: {gameState.lastRoundTricks?.alpha ?? 0}/{gameState.lastRoundBids?.alpha ?? 0} · Beta: {gameState.lastRoundTricks?.beta ?? 0}/{gameState.lastRoundBids?.beta ?? 0}</span>}
                {gameState?.phase === 'match_end' && <span className="font-semibold text-amber-100">{gameState.score.alpha >= 50 ? 'Alpha' : 'Beta'} ربح المباراة!</span>}
              </div>

              {gameState?.phase === 'lobby' && isHost && <button type="button" onClick={startRound} disabled={players.length !== 8} className="mt-2 min-h-10 w-full rounded-lg bg-emerald-300 px-3 text-xs font-bold text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-35">{players.length === 8 ? 'ابدأ المزايدة' : `بانتظار ${8 - players.length} لاعبين`}</button>}
              {gameState?.phase === 'bidding' && isLocalTurn && <div className="mt-2 grid grid-cols-4 gap-1.5">{[0, 1, 2, 3].map((value) => <button key={value} type="button" onClick={() => applyAction({ type: 'bid', value })} className="min-h-10 rounded-lg border border-white/10 bg-white/[0.05] text-sm font-bold hover:border-amber-200/30 hover:bg-amber-200/10">{value}</button>)}</div>}
              {gameState?.phase === 'playing' && <p className="mt-2 text-center text-[9px] text-white/35">اختار بطاقة من يدك المكشوفة تحت اسمك</p>}
              {gameState?.phase === 'round_end' && isHost && <button type="button" onClick={() => syncGameState(startClashRound(gameState, gameState.seatUserIds))} className="mt-2 min-h-10 w-full rounded-lg border border-emerald-100/20 bg-emerald-100/[0.08] text-xs font-semibold text-emerald-50 hover:bg-emerald-100/[0.14]">الجولة التالية</button>}
              {gameState?.phase === 'match_end' && isHost && <button type="button" onClick={() => syncGameState({ ...createLobbyState(user.id), score: { alpha: 0, beta: 0 } })} className="mt-2 min-h-10 w-full rounded-lg border border-amber-100/20 bg-amber-100/[0.08] text-xs font-semibold text-amber-50 hover:bg-amber-100/[0.14]">مباراة جديدة</button>}
            </section>

            <section className="order-3 space-y-2 rounded-xl border border-rose-200/10 bg-rose-200/[0.025] p-2.5 sm:p-3" aria-label="فريق Beta">
              <div className="flex items-center justify-between px-1"><h2 className="text-xs font-bold text-rose-100">Beta</h2><span className="text-[10px] text-white/35">{gameState?.tricksWon.beta ?? 0} خدعة</span></div>
              {teamPlayers('beta').map(({ seat, player, hand }) => (
                <PlayerSeat key={seat} seat={seat} player={player} hand={hand} active={Boolean(gameState && gameState.seatUserIds[gameState.turnSeat] === player?.userId && (gameState.phase === 'bidding' || gameState.phase === 'playing'))} local={Boolean(gameState && player?.userId === user.id && isLocalTurn && gameState.phase === 'playing')} voice={voiceStatus[player?.userId ?? '']} onPlay={(cardId) => applyAction({ type: 'play', cardId })} />
              ))}
            </section>
          </div>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 sm:px-4" aria-label="الصوت">
            <div className="flex items-center gap-2"><Headphones className="h-4 w-4 text-emerald-100/70" /><div><p className="text-[11px] font-semibold">الصوت الجماعي</p><p className="text-[9px] text-white/35">{voiceConnected ? 'LiveKit متصل' : voiceError ? 'الصوت غير متاح' : LIVEKIT_URL ? 'جارٍ الاتصال...' : 'إعداد LiveKit مطلوب'}</p></div></div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full border border-white/10 p-0.5" role="group" aria-label="نطاق الصوت">
                <button type="button" onClick={() => setTeamOnly(false)} aria-pressed={!teamOnly} className={`rounded-full px-3 py-1.5 text-[10px] ${!teamOnly ? 'bg-white/10 text-white' : 'text-white/45'}`}>الكل</button>
                <button type="button" onClick={() => setTeamOnly(true)} aria-pressed={teamOnly} className={`rounded-full px-3 py-1.5 text-[10px] ${teamOnly ? 'bg-emerald-200/15 text-emerald-100' : 'text-white/45'}`}>فريقي فقط</button>
              </div>
              <button type="button" onClick={() => void toggleMicrophone()} disabled={!voiceConnected} aria-label={micEnabled ? 'كتم الميكروفون' : 'تشغيل الميكروفون'} className={`grid h-9 w-9 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-35 ${micEnabled ? 'border-emerald-200/30 bg-emerald-200/10 text-emerald-100' : 'border-white/10 bg-white/[0.04] text-white/55'}`}>{micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>
              <span className="inline-flex items-center gap-1 text-[9px] text-white/35">{voiceConnected ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}{teamOnly ? `Alpha / Beta: ${localTeam}` : 'كل اللاعبين'}</span>
            </div>
            {voiceError && <p role="status" className="w-full text-[10px] text-amber-200/75">{voiceError}</p>}
          </section>

          {error && <p role="alert" className="rounded-lg border border-rose-200/15 bg-rose-200/[0.05] px-3 py-2 text-xs text-rose-100/80">{error}</p>}
          <div ref={audioContainerRef} className="hidden" aria-hidden="true" />
        </div>
      )}
    </section>
  );
}