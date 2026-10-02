import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useMessages } from '@/context/MessagesContext';
import Avatar from '@/components/Avatar';
import { Send, ArrowLeft, Loader2, MessageCircle, Mic, Square, AudioLines } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioFilter, setAudioFilter] = useState<'natural' | 'warm' | 'bright'>('natural');
  const [voiceError, setVoiceError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);

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
  }, [user, activeUserId]);

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
    const content = newMessage.trim();
    setNewMessage('');

    const { data } = await supabase
      .from('messages')
      .insert({ sender_id: user.id, receiver_id: activeUserId, content })
      .select()
      .single();

    if (data) {
      setMessages((prev) => [...prev, data as Message]);
    }
    setSending(false);
  };

  const displayName = (p: Profile) => p.full_name || p.username;

  return (
    <div className="h-screen flex">
      {/* Conversations list */}
      <div className={`w-full md:w-80 border-r border-white/10 flex flex-col ${activeUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-5 py-4 border-b border-white/10">
          <h1 className="text-xl font-bold">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <MessageCircle className="w-10 h-10 text-neutral-700 mb-3" />
              <p className="text-sm text-neutral-500">
                No conversations yet. Search for users and start chatting.
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.otherUser.id}
                onClick={() => navigate(`/chat/${conv.otherUser.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${
                  activeUserId === conv.otherUser.id ? 'bg-white/10' : ''
                }`}
              >
                <Avatar src={conv.otherUser.avatar_url} name={displayName(conv.otherUser)} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white truncate">{conv.otherUser.username}</p>
                    {conv.lastMessage && (
                      <span className="text-xs text-neutral-600 shrink-0">
                        {formatTime(conv.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 truncate mt-0.5">
                    {conv.lastMessage?.sender_id === user?.id ? 'You: ' : ''}
                    {conv.lastMessage?.message_type === 'audio' ? 'رسالة صوتية' : conv.lastMessage?.content || 'لا توجد رسائل'}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className={`flex-1 flex flex-col ${!activeUserId ? 'hidden md:flex' : 'flex'}`}>
        {activeUser ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/10">
              <button
                onClick={() => navigate('/chat')}
                className="md:hidden text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Avatar
                src={activeUser.avatar_url}
                name={displayName(activeUser)}
                size="sm"
                onClick={() => navigate(`/profile/${activeUser.id}`)}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${activeUser.id}`)}>
                <p className="text-sm font-semibold text-white truncate">{activeUser.username}</p>
                <p className="text-xs text-neutral-500 truncate">{activeUser.full_name || 'View profile'}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Avatar src={activeUser.avatar_url} name={displayName(activeUser)} size="xl" ring />
                  <p className="text-lg font-semibold text-white mt-4">{activeUser.username}</p>
                  <p className="text-sm text-neutral-500 mt-1">Start a conversation with {activeUser.username}</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.sender_id === user?.id;
                  const prevMsg = messages[idx - 1];
                  const showAvatar = !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'} animate-slide-up`}
                    >
                      {!isMine && (
                        <div className="w-8 shrink-0">
                          {showAvatar && (
                            <Avatar src={activeUser.avatar_url} name={displayName(activeUser)} size="xs" />
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-br-md'
                            : 'bg-neutral-800 text-neutral-100 rounded-bl-md'
                        }`}
                      >
                        {msg.message_type === 'audio' && msg.audio_url ? (
                          <VoiceNotePlayer path={msg.audio_url} durationMs={msg.audio_duration_ms ?? 0} />
                        ) : (
                          <p>{msg.content}</p>
                        )}
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-neutral-500'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/10">
              <div className="mb-3 flex flex-wrap items-center gap-2" dir="rtl">
                <label className="flex items-center gap-1.5 text-[11px] text-white/50">
                  <AudioLines className="h-4 w-4 text-emerald-300" /> فلتر الصوت
                  <select value={audioFilter} onChange={(event) => setAudioFilter(event.target.value as typeof audioFilter)} disabled={isRecording} className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1.5 text-[11px] text-white outline-none disabled:opacity-40">
                    <option value="natural">طبيعي</option>
                    <option value="warm">دافئ</option>
                    <option value="bright">واضح</option>
                  </select>
                </label>
                <button type="button" onClick={isRecording ? stopVoiceRecording : () => void startVoiceRecording()} disabled={sending || !activeUserId} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition disabled:opacity-40 ${isRecording ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'}`}>
                  {isRecording ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
                  {isRecording ? `إيقاف التسجيل ${recordingSeconds}s` : sending ? 'جارٍ الإرسال...' : 'رسالة صوتية'}
                </button>
                {voiceError && <p role="alert" className="w-full text-[10px] text-rose-300">{voiceError}</p>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 bg-neutral-800 border border-white/10 rounded-full px-5 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white disabled:opacity-40 hover:scale-105 active:scale-90 transition-all shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-neutral-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Your Messages</h3>
            <p className="text-sm text-neutral-500 max-w-xs">
              Select a conversation or search for users to start a new chat.
            </p>
            {myProfile && (
              <p className="text-xs text-neutral-700 mt-4">Signed in as @{myProfile.username}</p>
            )}
          </div>
        )}
      </div>
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
