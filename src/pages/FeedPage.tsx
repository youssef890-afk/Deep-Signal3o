import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LogOut, Edit3, Grid, Camera, Loader2 } from 'lucide-react';
import EditProfileModal from '@/components/EditProfileModal';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
  }, [user]);

  async function loadProfileData() {
    setLoading(true);
    // جلب بيانات الملف الشخصي
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // جلب منشورات المستخدم
    const { data: userPosts } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    setPosts(userPosts || []);
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28 text-white min-h-screen">
      {/* شريط أعلى البروفايل يتضمن زر تسجيل الخروج */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-bold text-white">الملف الشخصي</h1>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-xs font-semibold transition"
        >
          <LogOut className="w-4 h-4" /> خروج
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      ) : (
        <>
          {/* الصورة المعروضة والمعلومات */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 p-[3px] shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-bold text-2xl text-rose-400">
                    {profile?.username ? profile.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-base font-bold text-white mb-1">
              {profile?.username || 'مستخدم'}
            </h2>
            
            {profile?.bio && (
              <p className="text-xs text-neutral-400 max-w-xs mb-4 leading-relaxed">
                {profile.bio}
              </p>
            )}

            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold transition"
            >
              <Edit3 className="w-3.5 h-3.5 text-rose-400" /> تعديل البروفايل
            </button>
          </div>

          {/* شبكة منشورات المستخدم */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 mb-4">
              <Grid className="w-4 h-4 text-rose-500" /> منشوراتي ({posts.length})
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-12 bg-neutral-900/50 rounded-2xl border border-white/5 p-6">
                <Camera className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-xs text-neutral-400 font-medium">انشر أول منشور لك</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {posts.map((post) => (
                  <div key={post.id} className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden">
                    {post.image_url ? (
                      <img src={post.image_url} alt="Post" className="w-full h-32 object-cover" />
                    ) : (
                      <div className="p-3 text-[11px] text-neutral-300 line-clamp-4 h-32 bg-white/5">
                        {post.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* نافذة تعديل البروفايل */}
      {isEditOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsEditOpen(false)}
          onUpdated={loadProfileData}
        />
      )}
    </div>
  );
}

