import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  UserPlus, UserCheck, MessageSquare, Camera, 
  Loader2, Edit3, X, Check, Grid, Image as ImageIcon 
} from 'lucide-react';

interface ProfileData {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  display_id?: string;
}

interface PostData {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const targetUserId = id || user?.id;
  const isOwnProfile = user?.id === targetUserId;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load Profile Details
  const loadProfileData = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);

    try {
      // 1. Fetch Profile info
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profErr) throw profErr;
      setProfile(prof);
      setFullName(prof.full_name || '');
      setBio(prof.bio || '');

      // 2. Fetch User's Posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, image_url, caption, created_at')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      setUserPosts(posts || []);

      // 3. Fetch Followers Count
      const { count: fCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      setFollowersCount(fCount || 0);

      // 4. Fetch Following Count
      const { count: ingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);

      setFollowingCount(ingCount || 0);

      // 5. Check if current user is following this profile
      if (user && !isOwnProfile) {
        const { data: isFol } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .single();

        setIsFollowing(!!isFol);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user, isOwnProfile]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Handle Follow / Unfollow
  async function handleToggleFollow() {
    if (!user || isOwnProfile || followLoading) return;
    setFollowLoading(true);

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await supabase.from('follows').insert([
          { follower_id: user.id, following_id: targetUserId },
        ]);

        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  }

  // Handle Avatar Upload
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null));
    } catch (err: any) {
      alert('خطأ في تحميل الصورة: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Handle Update Profile Text
  async function handleUpdateProfile() {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), bio: bio.trim() })
        .eq('id', user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, full_name: fullName, bio } : null));
      setIsEditing(false);
    } catch (err: any) {
      alert('خطأ أثناء التحديث: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-28 text-white space-y-6">
      {/* 1. رأس البروفايل */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5 relative shadow-xl">
        <div className="flex items-center gap-4">
          {/* الصورة الشخصية */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center font-bold text-2xl overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile?.username?.charAt(0).toUpperCase() || 'U'
              )}
            </div>

            {isOwnProfile && (
              <label className="absolute bottom-0 right-0 bg-rose-500 hover:bg-rose-600 p-1.5 rounded-full cursor-pointer shadow-lg transition-transform active:scale-95">
                {uploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-white" />
                )}
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* تفاصيل الاسم والـ ID */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white truncate">
                {profile?.full_name || profile?.username}
              </h1>
              {profile?.display_id && (
                <span className="bg-rose-500/10 text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {profile.display_id}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400">@{profile?.username}</p>
            {profile?.bio && <p className="text-xs text-neutral-300 mt-2 leading-relaxed">{profile.bio}</p>}
          </div>
        </div>

        {/* إحصائيات البروفايل (المنشورات، المتابعين، المتابَعين) */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10 text-center">
          <div>
            <span className="block text-sm font-bold text-white">{userPosts.length}</span>
            <span className="text-[10px] text-neutral-400">منشورات</span>
          </div>
          <div>
            <span className="block text-sm font-bold text-white">{followersCount}</span>
            <span className="text-[10px] text-neutral-400">متابِعون</span>
          </div>
          <div>
            <span className="block text-sm font-bold text-white">{followingCount}</span>
            <span className="text-[10px] text-neutral-400">متابَعون</span>
          </div>
        </div>

        {/* الأزرار العلوية */}
        <div className="flex gap-2 mt-4 pt-2">
          {isOwnProfile ? (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-white/10"
            >
              <Edit3 className="w-4 h-4 text-rose-400" />
              تعديل الملف الشخصي
            </button>
          ) : (
            <>
              <button
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isFollowing
                    ? 'bg-neutral-800 text-neutral-300 border border-white/10'
                    : 'bg-rose-500 hover:bg-rose-600 text-white'
                }`}
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 text-green-400" />
                    مُتابع
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    متابعة
                  </>
                )}
              </button>

              <button
                onClick={() => navigate('/chat')}
                className="bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 text-neutral-200"
              >
                <MessageSquare className="w-4 h-4 text-rose-400" />
                رسالة
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. مودال تعديل البيانات */}
      {isEditing && (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <span className="text-xs font-bold text-white">تعديل المعلومات</span>
            <button onClick={() => setIsEditing(false)} className="text-neutral-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">الاسم الكامل</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">السيرة الذاتية (Bio)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 resize-none h-20"
              />
            </div>

            <button
              onClick={handleUpdateProfile}
              className="w-full bg-rose-500 hover:bg-rose-600 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 text-white"
            >
              <Check className="w-4 h-4" />
              حفظ التغيرات
            </button>
          </div>
        </div>
      )}

      {/* 3. شبكة منشورات البروفايل (Grid Layout) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 border-b border-white/10 pb-2">
          <Grid className="w-4 h-4 text-rose-500" />
          <span>المنشورات</span>
        </div>

        {userPosts.length === 0 ? (
          <div className="text-center py-10 bg-neutral-900/50 rounded-2xl border border-white/5 space-y-2">
            <ImageIcon className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-xs text-neutral-500">لا توجد منشورات بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {userPosts.map((p) => (
              <div
                key={p.id}
                className="aspect-square bg-neutral-900 rounded-xl overflow-hidden border border-white/10 relative group cursor-pointer"
              >
                {p.image_url ? (
                  <img src={p.image_url} alt="Post" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full p-2 bg-neutral-950 flex items-center justify-center text-[10px] text-neutral-400 text-center line-clamp-3">
                    {p.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
