import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useMessages } from '@/context/MessagesContext';
import { useDirectCall } from '@/hooks/useDirectCall';
import Avatar from '@/components/Avatar';
import { Send, ArrowLeft, Loader2, MessageCircle, Mic, Square, AudioLines, Video, VideoOff, MicOff, PhoneOff, Search, X, PhoneIncoming } from 'lucide-react';
import { formatTime } from '@/utils/format';
import type { Profile, Message } from '@/types';

export default function ChatPage() {
  const { user, profile: myProfile } = useAuth();
  const { refreshUnread } = useMessages();
  const { userId: activeUserId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<{ otherUser: Profile; lastMessage: Message | null; unreadCount: number }[]>([]);
  const [activeUser, setActiveUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageError, setMessageError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioFilter, setAudioFilter] = useState<'natural' | 'warm' | 'bright'>('natural');
  const [voiceError, setVoiceError] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const directCall = useDirectCall(user?.id, activeUserId);

  const filteredConversations = conversations.filter(({ otherUser }) =>
    `${otherUser.username} ${otherUser.full_name ?? ''}`.toLocaleLowerCase().includes(conversationSearch.trim().toLocaleLowerCase())
  );

  // Load conversations list
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadConversations = async () => {
      // Get all messages involving this user
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (cancelled || !msgs) return;

      // Build a map of other user ID -> last message + unread count
      const convMap = new Map<string, { lastMessage: Message; unreadCount: number }>();
      for (const msg of msgs as Message[]) {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const existing = convMap.get(otherId);
        if (!existing) {
          convMap.set(otherId, {
            lastMessage: msg,
            unreadCount: msg.receiver_id === user.id && !msg.read_at ? 1 : 0,
          });
        } else {
          if (msg.receiver_id === user.id && !msg.read_at) {
            existing.unreadCount++;
          }
        }
      }

      // Load profiles for all conversation partners
      const userIds = Array.from(convMap.keys());
      if (userIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (cancelled || !profiles) return;

      const convList = userIds.map((uid) => ({
        otherUser: (profiles as Profile[]).find((p) => p.id === uid)!,
        lastMessage: convMap.get(uid)!.lastMessage,
        unreadCount: convMap.get(uid)!.unreadCount,
      })).filter((c) => c.otherUser);

      setConversations(convList);
      setLoading(false);
    };

    loadConversations();
    return () => { cancelled = true; };
  }, [user]);

  // Load active user profile when param changes
  useEffect(() => {
    if (!activeUserId) {
      setActiveUser(null);
      return;
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', activeUserId)
      .maybeSingle()
      .then(({ data }) => setActiveUser(data as Profile | null));
  }, [activeUserId]);

  // Load messages for active conversation
  const loadMessages = useCallback(async () => {
    if (!user || !activeUserId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    setMessages((data as Message[]) ?? []);

    // Mark received messages as read
    if (data) {
      void refreshUnread();
      const unread = (data as Message[]).filter(
        (m) => m.receiver_id === user.id && !m.read_at
      );
      for (const m of unread) {
        await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', m.id);
      }
    }
  }, [user, activeUserId, refreshUnread]);

  useEffect(() => {
    const _tc = setTimeout(() => { setLoading(false); }, 3000);
    loadMessages().finally(() => clearTimeout(_tc));
  }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !activeUserId) return;

    const channel = supabase
      .channel(`chat-${user.id}-${activeUserId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          const isRelevant =
            (newMsg.sender_id === user.id && newMsg.receiver_id === activeUserId) ||
            (newMsg.sender_id === activeUserId && newMsg.receiver_id === user.id);
          if (!isRelevant) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (newMsg.receiver_id === user.id) {
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeUserId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    microphoneRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close();
  }, []);

  const sendVoiceNote = async (blob: Blob, durationMs: number) => {
    if (!user || !activeUserId || !blob.size) return;
    const extension = blob.type.includes('mp4') ? 'm4a' : 'webm';
    const path = `${user.id}/${activeUserId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('voice-notes').upload(path, blob, {
      contentType: blob.type || 'audio/webm',
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeUserId,
      content: '',
      message_type: 'audio',
      audio_url: path,
      audio_duration_ms: durationMs,
    }).select().single();
    if (error) {
      await supabase.storage.from('voice-notes').remove([path]);
      throw error;
    }
    setMessages((previous) => [...previous, data as Message]);
    void refreshUnread();
  };

  const startVoiceRecording = async () => {
    if (!user || !activeUserId || isRecording || sending) return;
    setVoiceError('');
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneRef.current = microphone;
      let recordingStream = microphone;

      if (audioFilter !== 'natural') {
        const context = new AudioContext();
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(microphone);
        const filter = context.createBiquadFilter();
        filter.type = audioFilter === 'warm' ? 'lowshelf' : 'highshelf';
        filter.frequency.value = audioFilter === 'warm' ? 240 : 2600;
        filter.gain.value = audioFilter === 'warm' ? 5 : 3;
        const destination = context.createMediaStreamDestination();
        source.connect(filter);
        filter.connect(destination);
        recordingStream = destination.stream;
      }

      const recorder = new MediaRecorder(recordingStream);
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const duration = Date.now() - recordingStartedAtRef.current;
        const voiceBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setIsRecording(false);
        microphoneRef.current?.getTracks().forEach((track) => track.stop());
        microphoneRef.current = null;
        void audioContextRef.current?.close();
        audioContextRef.current = null;
        setSending(true);
        void sendVoiceNote(voiceBlob, duration)
          .catch((error) => setVoiceError(error instanceof Error ? error.message : 'تعذر إرسال التسجيل'))
          .finally(() => setSending(false));
      };
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      recorder.start(250);
      setIsRecording(true);
    } catch (error) {
      microphoneRef.current?.getTracks().forEach((track) => track.stop());
      setVoiceError(error instanceof Error ? error.message : 'تحقق من إذن استخدام الميكروفون');
    }
  };

  const stopVoiceRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !activeUserId) return;
    setSending(true);
    setMessageError('');
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ sender_id: user.id, receiver_id: activeUserId, content })
        .select()
        .single();
      if (error || !data) throw error ?? new Error('Message was not saved');
      setMessages((prev) => [...prev, data as Message]);
    } catch {
      setNewMessage(content);
      setMessageError('تعذر إرسال الرسالة. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  const displayName = (p: Profile) => p.full_name || p.username;

  return (
    <div className="h-[calc(100dvh-154px)] min-h-[480px] overflow-hidden border-y border-white/[0.09] bg-[#0b1012] text-white shadow-[0_18px_60px_rgba(0,0,0,0.24)] md:h-[calc(100vh-104px)] md:min-h-[540px]" dir="rtl">
      <div className="flex h-full min-w-0">
        <aside className={`flex w-full shrink-0 flex-col border-l border-white/[0.08] bg-[#0d1315] md:w-[260px] xl:w-[286px] ${activeUserId ? 'hidden md:flex' : 'flex'}`}>
          <header className="border-b border-white/[0.08] px-4 pb-4 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-[9px] font-semibold text-[#b9e978]">DS / DIRECT</p>
                <h1 className="mt-1 font-serif text-xl font-bold">المحادثات</h1>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-[#b9e978]"><MessageCircle className="h-[18px] w-[18px]" /></span>
            </div>
            <label className="relative block">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="search"
                value={conversationSearch}
                onChange={(event) => setConversationSearch(event.target.value)}
                placeholder="قلب على محادثة"
                className="h-10 w-full rounded-md border border-white/[0.08] bg-black/20 pe-9 ps-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#b9e978]/45"
              />
            </label>
          </header>

          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <h2 className="text-[10px] font-bold text-white/40">آخر المحادثات</h2>
            <span className="font-mono text-[9px] text-white/25">{filteredConversations.length.toString().padStart(2, '0')}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#b9e978]" /></div>
            ) : filteredConversations.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <MessageCircle className="mx-auto mb-3 h-7 w-7 text-white/20" />
                <p className="text-xs leading-5 text-white/45">{conversationSearch ? 'ما لقينا حتى محادثة بهاد الاسم.' : 'مازال ما عندك محادثات. قلب على شخص وبدا أول حديث.'}</p>
                <button type="button" onClick={() => navigate('/search')} className="mt-4 border-b border-[#b9e978]/60 pb-1 text-xs font-semibold text-[#b9e978]">البحث عن أشخاص</button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeUserId === conv.otherUser.id;
                return (
                  <button
                    key={conv.otherUser.id}
                    type="button"
                    onClick={() => navigate(`/chat/${conv.otherUser.id}`)}
                    className={`mb-1 flex w-full items-center gap-3 border-r-2 px-3 py-3 text-right transition ${isActive ? 'border-[#b9e978] bg-[#b9e978]/[0.07]' : 'border-transparent hover:bg-white/[0.035]'}`}
                  >
                    <span className="relative shrink-0"><Avatar src={conv.otherUser.avatar_url} name={displayName(conv.otherUser)} size="md" /><span className="absolute bottom-0 left-0 h-2.5 w-2.5 rounded-full border-2 border-[#0d1315] bg-[#b9e978]" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-xs font-semibold ${isActive ? 'text-white' : 'text-white/80'}`}>{displayName(conv.otherUser)}</span>
                        {conv.lastMessage && <time className="shrink-0 text-[9px] text-white/35">{formatTime(conv.lastMessage.created_at)}</time>}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-white/40">
                        {conv.lastMessage?.sender_id === user?.id ? 'أنت: ' : ''}
                        {conv.lastMessage?.message_type === 'audio' ? 'رسالة صوتية' : conv.lastMessage?.content || 'ابدأ محادثة'}
                      </span>
                    </span>
                    {conv.unreadCount > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#b9e978] px-1 text-[9px] font-bold text-[#11180c]">{conv.unreadCount}</span>}
                  </button>
                );
              })
            )}
          </div>
          <footer className="border-t border-white/[0.08] px-4 py-3 text-[9px] text-white/30">
            <span className="font-mono">PRIVATE SIGNAL</span><span className="float-left text-[#b9e978]">● متصل</span>
          </footer>
        </aside>

        <section className={`min-w-0 flex-1 flex-col bg-[#0a0f11] ${activeUserId ? 'flex' : 'hidden md:flex'}`}>
          {activeUser ? (
            <>
              <header className="flex min-h-[68px] items-center gap-3 border-b border-white/[0.08] px-3 sm:px-5">
                <button type="button" onClick={() => navigate('/chat')} aria-label="العودة للمحادثات" className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white/55 transition hover:bg-white/[0.06] hover:text-white md:hidden"><ArrowLeft className="h-5 w-5" /></button>
                <button type="button" onClick={() => navigate(`/profile/${activeUser.id}`)} className="shrink-0"><Avatar src={activeUser.avatar_url} name={displayName(activeUser)} size="sm" /></button>
                <button type="button" onClick={() => navigate(`/profile/${activeUser.id}`)} className="min-w-0 flex-1 text-right">
                  <span className="block truncate text-sm font-bold text-white">{displayName(activeUser)}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-[#b9e978]/75">@{activeUser.username} <span className="text-white/30">· مباشر</span></span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => void directCall.startCall()} disabled={!directCall.channelReady || directCall.status !== 'idle'} aria-label="بدء مكالمة فيديو" title="مكالمة فيديو" className="grid h-9 w-9 place-items-center rounded-md text-[#b9e978] transition hover:bg-[#b9e978]/10 disabled:opacity-40"><Video className="h-[18px] w-[18px]" /></button>
                </div>
              </header>

              {directCall.error && <p role="alert" className="border-b border-rose-400/15 bg-rose-400/[0.05] px-4 py-2 text-xs text-rose-200">{directCall.error}</p>}

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6" style={{ backgroundImage: 'radial-gradient(rgba(185,233,120,0.055) 0.7px, transparent 0.7px)', backgroundSize: '18px 18px' }}>
                {messages.length === 0 ? (
                  <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                    <span className="mb-4 rounded-full border border-[#b9e978]/20 bg-[#b9e978]/[0.06] p-1"><Avatar src={activeUser.avatar_url} name={displayName(activeUser)} size="xl" /></span>
                    <p className="font-serif text-lg font-bold text-white">{displayName(activeUser)}</p>
                    <p className="mt-2 max-w-xs text-xs leading-5 text-white/45">بداية إشارة جديدة. كتب رسالة أو بدا مكالمة فيديو مباشرة.</p>
                    <button type="button" onClick={() => void directCall.startCall()} disabled={!directCall.channelReady} className="mt-5 inline-flex items-center gap-2 border border-[#b9e978]/25 px-3 py-2 text-xs font-semibold text-[#b9e978] transition hover:bg-[#b9e978]/10 disabled:opacity-40"><Video className="h-4 w-4" /> مكالمة فيديو</button>
                  </div>
                ) : (
                  <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-3">
                    <div className="mb-2 flex items-center gap-3 py-3">
                      <span className="h-px flex-1 bg-white/[0.08]" /><span className="font-mono text-[9px] text-white/30">بداية الإشارة</span><span className="h-px flex-1 bg-white/[0.08]" />
                    </div>
                    {messages.map((msg, index) => {
                      const isMine = msg.sender_id === user?.id;
                      const prevMessage = messages[index - 1];
                      const showAvatar = !isMine && (!prevMessage || prevMessage.sender_id !== msg.sender_id);
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-start' : 'justify-end'} animate-slide-up`}>
                          {!isMine && <div className="w-7 shrink-0">{showAvatar && <Avatar src={activeUser.avatar_url} name={displayName(activeUser)} size="xs" />}</div>}
                          <div className={`max-w-[min(78%,560px)] px-4 py-2.5 text-sm leading-6 ${isMine ? 'rounded-[14px_14px_4px_14px] border border-[#b9e978]/15 bg-[#b9e978]/[0.09] text-white' : 'rounded-[14px_14px_14px_4px] border border-white/[0.08] bg-white/[0.045] text-white/90'}`}>
                            {msg.message_type === 'audio' && msg.audio_url ? <VoiceNotePlayer path={msg.audio_url} durationMs={msg.audio_duration_ms ?? 0} /> : <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                            <time className={`mt-1 block text-[9px] ${isMine ? 'text-[#b9e978]/55' : 'text-white/35'}`}>{formatTime(msg.created_at)}</time>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.08] bg-[#0c1214] px-3 py-3 sm:px-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-[10px] text-white/45">
                    <AudioLines className="h-3.5 w-3.5 text-[#b9e978]" /> فلتر الصوت
                    <select value={audioFilter} onChange={(event) => setAudioFilter(event.target.value as typeof audioFilter)} disabled={isRecording} className="rounded border border-white/10 bg-[#11191a] px-2 py-1 text-[10px] text-white/75 outline-none disabled:opacity-40">
                      <option value="natural">طبيعي</option><option value="warm">دافئ</option><option value="bright">واضح</option>
                    </select>
                  </label>
                  <button type="button" onClick={isRecording ? stopVoiceRecording : () => void startVoiceRecording()} disabled={sending || !activeUserId} className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[10px] font-semibold transition disabled:opacity-40 ${isRecording ? 'bg-rose-500/15 text-rose-200' : 'text-[#b9e978] hover:bg-white/[0.05]'}`}>
                    {isRecording ? <Square className="h-3 w-3 fill-current" /> : <Mic className="h-3.5 w-3.5" />}
                    {isRecording ? `إيقاف ${recordingSeconds}s` : sending ? 'جارٍ الإرسال...' : 'رسالة صوتية'}
                  </button>
                  {voiceError && <p role="alert" className="w-full text-[10px] text-rose-300">{voiceError}</p>}
                </div>
                <div className="flex items-end gap-2 rounded-md border border-white/[0.1] bg-white/[0.035] p-1.5 focus-within:border-[#b9e978]/35">
                  <textarea
                    value={newMessage}
                    onChange={(event) => { setNewMessage(event.target.value); setMessageError(''); }}
                    onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend(); } }}
                    placeholder={`راسل ${activeUser.username}...`}
                    rows={1}
                    className="max-h-28 min-h-10 flex-1 resize-y bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
                  />
                  <button type="button" onClick={() => void handleSend()} disabled={!newMessage.trim() || sending} aria-label="إرسال الرسالة" className="grid h-10 w-10 shrink-0 place-items-center rounded bg-[#b9e978] text-[#10170b] transition hover:bg-[#d0f29b] disabled:opacity-35"><Send className="h-[17px] w-[17px]" /></button>
                </div>
                {messageError && <p role="alert" className="mt-2 text-xs text-rose-300">{messageError}</p>}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="relative mb-5 grid h-20 w-20 place-items-center border border-[#b9e978]/20 bg-[#b9e978]/[0.055] text-[#b9e978]"><MessageCircle className="h-8 w-8" /><span className="absolute -left-1 -top-1 h-3 w-3 border-2 border-[#0a0f11] bg-[#ff8068]" /></div>
              <p className="mb-2 font-mono text-[9px] text-[#b9e978]">A SIGNAL IS WAITING</p>
              <h2 className="font-serif text-2xl font-bold">مساحتك، على ترددك</h2>
              <p className="mt-3 max-w-sm text-xs leading-6 text-white/45">اختار محادثة من اللائحة، أو قلب على شخص وابدأ حديث خاص بالصوت والصورة.</p>
              {myProfile && <p className="mt-6 border-t border-white/[0.08] pt-4 text-[10px] text-white/30">متصل باسم @{myProfile.username}</p>}
            </div>
          )}
        </section>

        {activeUser && (
          <aside className="hidden w-[220px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0d1315] xl:flex">
            <div className="border-b border-white/[0.08] px-4 py-5">
              <p className="font-mono text-[9px] text-white/35">SIGNAL PROFILE</p>
              <button type="button" onClick={() => navigate(`/profile/${activeUser.id}`)} className="mt-5 flex w-full flex-col items-center text-center"><span className="rounded-full border border-[#b9e978]/20 p-1"><Avatar src={activeUser.avatar_url} name={displayName(activeUser)} size="xl" /></span><span className="mt-3 max-w-full truncate text-sm font-bold text-white">{displayName(activeUser)}</span><span className="mt-1 max-w-full truncate text-[10px] text-white/40">@{activeUser.username}</span></button>
            </div>
            <div className="px-4 py-5">
              <p className="mb-3 text-[9px] font-bold text-white/40">الاتصال</p>
              <div className="flex items-center gap-2 text-[10px] text-white/65"><span className="h-2 w-2 rounded-full bg-[#b9e978]" /> متاح للمحادثة</div>
              <button type="button" onClick={() => void directCall.startCall()} disabled={!directCall.channelReady || directCall.status !== 'idle'} className="mt-4 flex w-full items-center justify-center gap-2 border border-[#b9e978]/20 py-2.5 text-[10px] font-semibold text-[#b9e978] transition hover:bg-[#b9e978]/[0.08] disabled:opacity-40"><Video className="h-3.5 w-3.5" /> بدء مكالمة فيديو</button>
            </div>
            <div className="mt-auto border-t border-white/[0.08] px-4 py-3 font-mono text-[8px] text-white/25">END-TO-END SIGNAL / DS</div>
          </aside>
        )}
      </div>

      {activeUser && directCall.status !== 'idle' && (
        <DirectCallOverlay
          name={displayName(activeUser)}
          status={directCall.status}
          localStream={directCall.localStream}
          remoteStream={directCall.remoteStream}
          error={directCall.error}
          microphoneEnabled={directCall.microphoneEnabled}
          cameraEnabled={directCall.cameraEnabled}
          onAccept={() => void directCall.acceptCall()}
          onDecline={directCall.declineCall}
          onEnd={directCall.endCall}
          onToggleMicrophone={directCall.toggleMicrophone}
          onToggleCamera={directCall.toggleCamera}
        />
      )}
    </div>
  );
}

function DirectCallOverlay({
  name,
  status,
  localStream,
  remoteStream,
  error,
  microphoneEnabled,
  cameraEnabled,
  onAccept,
  onDecline,
  onEnd,
  onToggleMicrophone,
  onToggleCamera,
}: {
  name: string;
  status: 'incoming' | 'calling' | 'connecting' | 'connected';
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string;
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
}) {
  const statusLabel = status === 'incoming' ? 'مكالمة فيديو واردة' : status === 'calling' ? 'كنعيطو...' : status === 'connected' ? 'المكالمة مباشرة' : 'كنربطو الاتصال...';

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#050808]/90 p-3 backdrop-blur-md sm:p-6" dir="rtl">
      <section role="dialog" aria-modal="true" aria-label="مكالمة فيديو" className="flex max-h-[min(780px,95dvh)] w-full max-w-5xl flex-col overflow-hidden border border-white/[0.12] bg-[#0b1112] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-5">
          <div className="min-w-0"><p className="font-mono text-[9px] text-[#b9e978]">DEEP-SIGNAL / LIVE</p><h2 className="mt-1 truncate text-sm font-bold">{name}</h2></div>
          <span className="flex shrink-0 items-center gap-2 text-[10px] text-white/55"><span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-[#b9e978]' : 'animate-pulse bg-[#ff8068]'}`} />{statusLabel}</span>
          <button type="button" onClick={onEnd} aria-label="إغلاق المكالمة" className="grid h-8 w-8 shrink-0 place-items-center text-white/40 transition hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto p-2 sm:p-3 lg:grid-cols-2">
          <VideoTile stream={remoteStream} name={name} label="الطرف الآخر" />
          <VideoTile stream={localStream} name="أنت" label="كاميرتك" muted={!cameraEnabled} mirror />
        </div>

        {error && <p role="alert" className="px-4 pb-2 text-center text-xs text-rose-200">{error}</p>}
        <footer className="flex min-h-[68px] items-center justify-center gap-3 border-t border-white/[0.08] px-4 py-3">
          {status === 'incoming' ? (
            <>
              <button type="button" onClick={onDecline} className="inline-flex items-center gap-2 bg-rose-500/15 px-4 py-2.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/25"><PhoneOff className="h-4 w-4" /> رفض</button>
              <button type="button" onClick={onAccept} className="inline-flex items-center gap-2 bg-[#b9e978] px-4 py-2.5 text-xs font-bold text-[#10170b] transition hover:bg-[#d0f29b]"><PhoneIncoming className="h-4 w-4" /> قبول المكالمة</button>
            </>
          ) : (
            <>
              <button type="button" onClick={onToggleMicrophone} aria-label={microphoneEnabled ? 'كتم الميكروفون' : 'تشغيل الميكروفون'} className={`grid h-10 w-10 place-items-center border transition ${microphoneEnabled ? 'border-white/10 bg-white/[0.05] text-white' : 'border-rose-400/20 bg-rose-400/10 text-rose-200'}`}>{microphoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>
              <button type="button" onClick={onToggleCamera} aria-label={cameraEnabled ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'} className={`grid h-10 w-10 place-items-center border transition ${cameraEnabled ? 'border-white/10 bg-white/[0.05] text-white' : 'border-rose-400/20 bg-rose-400/10 text-rose-200'}`}>{cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}</button>
              <button type="button" onClick={onEnd} aria-label="إنهاء المكالمة" className="grid h-10 w-12 place-items-center bg-rose-500 text-white transition hover:bg-rose-400"><PhoneOff className="h-4 w-4" /></button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}

function VideoTile({ stream, name, label, muted = false, mirror = false }: { stream: MediaStream | null; name: string; label: string; muted?: boolean; mirror?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) void video.play().catch(() => undefined);
    return () => { video.srcObject = null; };
  }, [stream]);

  return (
    <div className="relative min-h-[220px] overflow-hidden border border-white/[0.08] bg-[#11191a] sm:min-h-[300px]">
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted={muted || mirror} className={`h-full min-h-[220px] w-full object-cover sm:min-h-[300px] ${mirror ? '-scale-x-100' : ''}`} />
      ) : (
        <div className="grid h-full min-h-[220px] place-items-center sm:min-h-[300px]">
          <div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#b9e978]/15 bg-[#b9e978]/[0.06] text-xl font-bold text-[#b9e978]">{name.slice(0, 1).toUpperCase()}</span><p className="mt-3 text-xs font-semibold text-white/75">{name}</p><p className="mt-1 text-[10px] text-white/35">{label === 'كاميرتك' ? 'بانتظار تشغيل الكاميرا' : 'بانتظار الطرف الآخر'}</p></div>
        </div>
      )}
      <span className="absolute bottom-3 right-3 bg-black/55 px-2.5 py-1.5 text-[10px] text-white/85 backdrop-blur-sm">{label}</span>
    </div>
  );
}

function VoiceNotePlayer({ path, durationMs }: { path: string; durationMs: number }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void supabase.storage.from('voice-notes').createSignedUrl(path, 60 * 60).then(({ data, error: signingError }) => {
      if (!active) return;
      if (signingError || !data?.signedUrl) setError('تعذر فتح الرسالة الصوتية');
      else setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);

  if (error) return <p className="text-xs text-white/60">{error}</p>;
  return (
    <div className="min-w-[220px] space-y-1">
      {url ? <audio src={url} controls preload="none" className="h-9 w-full" /> : <span className="text-xs text-white/50">جارٍ تحميل التسجيل...</span>}
      {durationMs > 0 && <span className="block text-[9px] text-white/45">{Math.round(durationMs / 1000)} ثانية</span>}
    </div>
  );
}
