import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, Mic, MicOff, Users, Gamepad2, X, ArrowLeft, Crown, UserPlus } from 'lucide-react';

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
    const cleanup = subscribeToMembers();
    return () => { if (cleanup) cleanup(); };
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        () => fetchMembers()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  async function joinRoom() {
    if (!user) return;
    if (members.length >= 6) return alert('الغرفة مكتملة العدد (6 مقاعد)');
    await supabase.from('room_members').insert({ room_id: roomId, user_id: user.id });
  }

  async function leaveRoom() {
    if (!user) return;
    await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', user.id);
    navigate('/rooms');
  }

  async function kickMember(memberTableId: string) {
    if (user?.id !== room.created_by) return;
    await supabase.from('room_members').delete().eq('id', memberTableId);
  }

  async function endRoom() {
    if (user?.id !== room.created_by) return;
    if (window.confirm('هل تريد إنهاء الجلسة للجميع؟')) {
      await supabase.from('rooms').update({ is_active: false }).eq('id', roomId);
      navigate('/rooms');
    }
  }

  function startGame() {
    const challenges = [
      { question: 'ما هو عكس كلمة "نور"؟', answer: 'ظلام' },
      { question: 'اذكر 3 دول عربية تبدأ بحرف "م"', answer: 'مصر، المغرب، موريتانيا' },
      { question: 'ما هو أطول نهر في العالم؟', answer: 'نهر النيل' },
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
  const seats = Array.from({ length: 6 });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5 mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/rooms')} className="text-neutral-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{room.name}</h1>
            <p className="text-xs text-neutral-400">{room.description || 'جلسة صوتية حية'}</p>
          </div>
        </div>
        {isCreator ? (
          <button onClick={endRoom} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs">إنهاء الجلسة</button>
        ) : isMember ? (
          <button onClick={leaveRoom} className="px-3 py-1.5 bg-neutral-800 text-white rounded-xl text-xs">مغادرة</button>
        ) : null}
      </div>

      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-500" /> المقاعد (6/{members.length})
          </h2>
          {isMember && (
            <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-full ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {seats.map((_, index) => {
            const member = members[index];
            return (
              <div key={index} className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-xl relative min-h-[100px]">
                {member ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-lg mb-2 relative">
                      {member.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                      {member.user_id === room.created_by && (
                        <Crown className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1" />
                      )}
                    </div>
                    <span className="text-xs text-white truncate max-w-[80px]">{member.profiles?.username}</span>
                    
                    {isCreator && member.user_id !== user?.id && (
                      <button onClick={() => kickMember(member.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-300">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-neutral-600">
                    <UserPlus className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">مقعد فارغ</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!isMember && (
          <button onClick={joinRoom} className="w-full mt-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium text-sm">
            صعود للمقعد
          </button>
        )}
      </div>

      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-rose-400" /> تحديات وألغاز
          </h2>
          {isCreator && (
            <button onClick={startGame} className="px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-xl text-xs">تحد جديد</button>
          )}
        </div>

        {gameActive ? (
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-neutral-400 text-xs mb-1">السؤال:</p>
            <p className="text-white font-medium text-base mb-4">{challenge}</p>
            <button onClick={() => setShowAnswer(!showAnswer)} className="px-4 py-2 bg-neutral-800 text-xs text-white rounded-lg">
              {showAnswer ? 'إخفاء الإجابة' : 'كشف الإجابة'}
            </button>
            {showAnswer && <p className="text-green-400 text-sm mt-3 font-semibold">الإجابة: {gameAnswer}</p>}
          </div>
        ) : (
          <p className="text-xs text-neutral-500 text-center py-4">
            {isCreator ? 'اضغط على "تحد جديد" لبدء التنافس بين الحضور' : 'في انتظار المنشئ لبدء التحدي...'}
          </p>
        )}
      </div>
    </div>
  );
}
