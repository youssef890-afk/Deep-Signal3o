import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, Mic, MicOff, Users, LogOut, Gamepad2, X, ArrowLeft } from 'lucide-react';

export default function RoomDetailPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [gameAnswer, setGameAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    fetchRoom();
    fetchMembers();
    subscribeToMembers();
  }, [roomId]);

  async function fetchRoom() {
    const { data } = await supabase
      .from('rooms')
      .select(`*, profiles:created_by (username, avatar_url)`)
      .eq('id', roomId)
      .single();
    if (data) setRoom(data);
    else navigate('/rooms');
    setLoading(false);
  }

  async function fetchMembers() {
    const { data } = await supabase
      .from('room_members')
      .select(`*, profiles:user_id (username, avatar_url)`)
      .eq('room_id', roomId);
    setMembers(data || []);
  }

  function subscribeToMembers() {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        (payload) => setMembers((prev) => [...prev, payload.new])
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        (payload) => setMembers((prev) => prev.filter((m) => m.id !== payload.old.id))
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }

  async function joinRoom() {
    if (!user) return;
    await supabase.from('room_members').insert({ room_id: roomId, user_id: user.id });
  }

  async function leaveRoom() {
    if (!user) return;
    await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', user.id);
    navigate('/rooms');
  }

  async function removeMember(memberId: string) {
    if (!room || user?.id !== room.created_by) return;
    await supabase.from('room_members').delete().eq('id', memberId);
  }

  async function endRoom() {
    if (!room || user?.id !== room.created_by) return;
    if (window.confirm('هل أنت متأكد من إنهاء الجلسة؟')) {
      await supabase.from('rooms').update({ is_active: false }).eq('id', roomId);
      navigate('/rooms');
    }
  }

  function startGame() {
    const challenges = [
      { question: 'ما هو عكس كلمة "نور"؟', answer: 'ظلام' },
      { question: 'اذكر 3 دول عربية تبدأ بحرف "م"', answer: 'مصر، المغرب، موريتانيا' },
      { question: 'ما هو أطول نهر في العالم؟', answer: 'نهر النيل' },
      { question: 'كم عدد سور القرآن الكريم؟', answer: '114 سورة' },
      { question: 'ما هي عاصمة المغرب؟', answer: 'الرباط' },
    ];
    const random = challenges[Math.floor(Math.random() * challenges.length)];
    setChallenge(random.question);
    setGameAnswer(random.answer);
    setShowAnswer(false);
    setGameActive(true);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-rose-500" /></div>;
  if (!room) return <div className="text-center py-20 text-neutral-500">الغرفة غير موجودة</div>;

  const isCreator = user?.id === room.created_by;
  const isMember = members.some((m) => m.user_id === user?.id);
  const isFull = members.length >= 6;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/rooms')} className="text-neutral-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
              <h1 className="text-2xl font-bold text-white">{room.name}</h1>
            </div>
            <p className="text-neutral-400 text-sm mt-1">{room.description || 'لا يوجد وصف'}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
              <span>👤 {room.profiles?.username}</span>
              <span>👥 {members.length} / 6 أعضاء</span>
              <span className="text-green-400">● مباشر</span>
            </div>
          </div>
          <div className="flex gap-2">
            {isCreator && (
              <button onClick={endRoom} className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm">إنهاء الجلسة</button>
            )}
            <button onClick={leaveRoom} className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {!isMember ? (
        <button onClick={joinRoom} disabled={isFull} className={`w-full py-3 rounded-xl ${isFull ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 text-white'}`}>
          {isFull ? 'الغرفة ممتلئة (6/6)' : 'انضم إلى الجلسة'}
        </button>
      ) : (
        <>
          <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-rose-400" /> المتحدثون ({members.length}/6)</h2>
              <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-full ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-2 p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-xs text-rose-400">
                      {member.profiles?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-white truncate max-w-[60px]">{member.profiles?.username}</span>
                  </div>
                  {member.user_id === room.created_by && '👑'}
                  {isCreator && member.user_id !== user?.id && (
                    <button onClick={() => removeMember(member.id)} className="text-red-400 hover:text-red-300 text-xs"><X className="w-3 h-3" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2"><Gamepad2 className="w-5 h-5 text-rose-400" /> تحدي الألعاب</h2>
              {isCreator && (
                <button onClick={startGame} className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-sm">تحد جديد</button>
              )}
            </div>
            {gameActive ? (
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white text-lg font-semibold">❓ السؤال:</p>
                <p className="text-neutral-300 mt-2 text-lg">{challenge}</p>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowAnswer(!showAnswer)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm">
                    {showAnswer ? 'إخفاء الإجابة' : 'عرض الإجابة'}
                  </button>
                </div>
                {showAnswer && <p className="text-green-400 mt-3 text-lg">✅ الإجابة: {gameAnswer}</p>}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm text-center py-4">
                {isCreator ? 'اضغط على "تحد جديد" لبدء تحدي' : 'انتظر بدء التحدي من قبل المنشئ'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
