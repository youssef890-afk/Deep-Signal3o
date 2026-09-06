import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Users, Mic, Gamepad2, X } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
  members: number;
  is_active: boolean;
}

export default function RoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        profiles:created_by (username, avatar_url)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    } else {
      // Count members for each room
      const roomsWithMembers = await Promise.all(
        (data || []).map(async (room) => {
          const { count } = await supabase
            .from('room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);
          return { ...room, members: count || 0 };
        })
      );
      setRooms(roomsWithMembers);
    }
    setLoading(false);
  }

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name: roomName,
        description: roomDescription,
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      alert('❌ فشل إنشاء الغرفة: ' + error.message);
      return;
    }

    if (data) {
      // انضم كأول عضو
      await supabase.from('room_members').insert({
        room_id: data.id,
        user_id: user.id,
      });
      navigate(`/room/${data.id}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">غرف صوتية</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> إنشاء غرفة
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-20">
          <Mic className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-500">لا توجد غرف نشطة حالياً</p>
          <p className="text-neutral-600 text-sm mt-2">قم بإنشاء غرفة جديدة للبدء</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-neutral-900/60 border border-white/10 rounded-xl p-4 hover:border-rose-500/50 transition cursor-pointer"
              onClick={() => navigate(`/room/${room.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <Mic className="w-6 h-6 text-rose-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{room.name}</h3>
                  <p className="text-sm text-neutral-400">{room.description || 'لا يوجد وصف'}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500">
                    <span>👤 {room.profiles?.username || 'مستخدم'}</span>
                    <span>👥 {room.members || 0} أعضاء</span>
                    <span>{new Date(room.created_at).toLocaleDateString('ar-MA')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">مباشر</span>
                  <Gamepad2 className="w-4 h-4 text-neutral-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal إنشاء غرفة */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">إنشاء غرفة جديدة</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-neutral-500 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={createRoom} className="space-y-4">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="اسم الغرفة"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500/50"
                required
              />
              <textarea
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                placeholder="وصف الغرفة (اختياري)"
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500/50"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition"
                >
                  إنشاء
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
