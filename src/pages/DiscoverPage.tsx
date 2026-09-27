import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, MessageCircle, Loader2, Users } from 'lucide-react';
import type { Profile } from '@/types';

interface SuggestedUser extends Profile {
  isFollowing: boolean;
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = new Set((following || []).map((f: any) => f.following_id));
      followingIds.add(user.id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .limit(50);

      if (cancelled || !profiles) return;

      const list: SuggestedUser[] = (profiles as Profile[])
        .filter((p) => !followingIds.has(p.id))
        .map((p) => ({ ...p, isFollowing: false }));

      setUsers(list);
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [user]);

  const toggleFollow = async (userId: string) => {
    if (!user) return;
    const isFollowing = followingMap[userId];

    setFollowingMap((m) => ({ ...m, [userId]: !isFollowing }));

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-6 h-6 text-rose-400" />
          <h1 className="text-2xl font-bold text-white">اكتشف أشخاص</h1>
        </div>
        <p className="text-sm text-white/50">تابع أشخاص جدد ووسع شبكتك</p>
      </div>

      {users.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl bg-white/5 border border-white/10 p-10 text-center"
        >
          <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">ما كاينش مستخدمين جدد</h3>
          <p className="text-sm text-white/50">راك تابع كل المستخدمين المتوفرين</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {users.map((u, i) => {
            const isFollowing = followingMap[u.id] ?? false;
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all"
              >
                <Avatar
                  src={u.avatar_url}
                  name={u.full_name || u.username}
                  size="md"
                  onClick={() => navigate(`/profile/${u.id}`)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                  {u.full_name && (
                    <p className="text-xs text-white/50 truncate">{u.full_name}</p>
                  )}
                </div>

                <button
                  onClick={() => toggleFollow(u.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isFollowing
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:opacity-90'
                  }`}
                >
                  {isFollowing ? (
                    <><UserCheck className="w-4 h-4" /> متابَع</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> متابعة</>
                  )}
                </button>

                <button
                  onClick={() => navigate(`/chat/${u.id}`)}
                  className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
