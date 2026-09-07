import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Share2, Loader2, Send, UserPlus, MessageSquare, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  username: string;
  avatar_url: string;
}

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  profiles?: Profile;
  likes_count?: number;
  user_has_liked?: boolean;
}

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadFeedData();
    }
  }, [user]);

  async function loadFeedData() {
    setLoading(true);
    try {
      // 1. جلب بيانات البروفايلات والمستخدمين
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url');

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]));
      setUsers(profilesData?.filter(p => p.id !== user?.id).slice(0, 6) || []);

      // 2. جلب المنشورات
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      // 3. جلب الإعجابات
      const { data: likesData } = await supabase
        .from('likes')
        .select('post_id, user_id');

      const formattedPosts = (postsData || []).map((post) => {
        const postLikes = likesData?.filter((l) => l.post_id === post.id) || [];
        const hasLiked = postLikes.some((l) => l.user_id === user?.id);
        const foundProfile = profilesMap.get(post.user_id);

        return {
          ...post,
          profiles: {
            id: post.user_id,
            username: foundProfile?.username || `user_${post.user_id.slice(0, 4)}`,
            avatar_url: foundProfile?.avatar_url || '',
          },
          likes_count: postLikes.length,
          user_has_liked: hasLiked,
        };
      });

      setPosts(formattedPosts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim() && !imageFile) return;

    setUploading(true);
    let finalImageUrl = '';

    try {
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user?.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, imageFile, { upsert: true });

        if (uploadError) {
          console.warn('Storage upload error, falling back to empty image:', uploadError.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName);
          finalImageUrl = publicUrlData.publicUrl;
        }
      }

      const { error: insertError } = await supabase.from('posts').insert([
        {
          user_id: user?.id,
          caption: caption.trim(),
          image_url: finalImageUrl,
        },
      ]);

      if (insertError) throw insertError;

      setCaption('');
      setImageFile(null);
      setImagePreview(null);
      await loadFeedData();
    } catch (err: any) {
      alert('خطأ أثناء النشر: ' + (err.message || 'تاكد من اعدادات قاعدة البيانات'));
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleLike(post: Post) {
    if (!user) return;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === post.id) {
          const newHasLiked = !p.user_has_liked;
          return {
            ...p,
            user_has_liked: newHasLiked,
            likes_count: newHasLiked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 0) - 1),
          };
        }
        return p;
      })
    );

    if (post.user_has_liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('likes').insert([{ post_id: post.id, user_id: user.id }]);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28 text-white min-h-screen">
      {users.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-neutral-400 mb-3">مستخدمون على المنصة</h2>
          <div className="grid grid-cols-3 gap-2">
            {users.map((u) => (
              <div key={u.id} className="bg-neutral-900 border border-white/10 rounded-2xl p-2.5 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 p-[2px] mb-1.5">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center text-xs font-bold text-rose-400">
                      {u.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-bold text-white truncate w-full mb-2">{u.username}</span>
                <div className="flex gap-1 w-full">
                  <button className="flex-1 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1">
                    <UserPlus className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => navigate('/messages')}
                    className="flex-1 py-1 bg-white/5 text-neutral-300 hover:bg-white/10 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="h-[1px] bg-white/10 my-6" />
        </div>
      )}

      <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 mb-6 shadow-lg">
        <h2 className="text-xs font-bold text-neutral-300 mb-3">إضافة منشور جديد</h2>
        <form onSubmit={handleCreatePost} className="space-y-3">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="بماذا تفكر اليوم؟"
            className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 resize-none h-20"
          />

          {imagePreview && (
            <div className="relative w-full h-36 bg-neutral-950 rounded-xl overflow-hidden border border-white/10">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 text-xs hover:bg-black"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer bg-neutral-950 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs text-neutral-300 transition">
              <Upload className="w-4 h-4 text-rose-500" />
              <span>{imageFile ? 'تغيير الصورة' : 'اختر صورة من الهاتف'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>

            <button
              type="submit"
              disabled={uploading || (!caption.trim() && !imageFile)}
              className="flex items-center gap-1.5 px-5 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              نشر
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-neutral-900/40 rounded-2xl border border-white/5 p-6">
          <p className="text-xs text-neutral-400 font-medium">لا توجد منشورات حالياً في Feed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 p-[2px]">
                    {post.profiles?.avatar_url ? (
                      <img src={post.profiles.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center text-xs font-bold text-rose-400">
                        {post.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{post.profiles?.username}</h3>
                    <p className="text-[10px] text-neutral-500">
                      {new Date(post.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>
              </div>

              {post.caption && (
                <p className="p-3 text-xs text-neutral-200 leading-relaxed">{post.caption}</p>
              )}
              {post.image_url && (
                <div className="w-full bg-neutral-950">
                  <img src={post.image_url} alt="Post Content" className="w-full max-h-80 object-cover" />
                </div>
              )}

              <div className="p-3 flex items-center justify-between border-t border-white/5 text-neutral-400">
                <button
                  onClick={() => handleToggleLike(post)}
                  className={`flex items-center gap-1.5 text-xs transition ${
                    post.user_has_liked ? 'text-rose-500 font-bold' : 'hover:text-rose-500'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.user_has_liked ? 'fill-rose-500' : ''}`} />
                  <span>{post.likes_count || 0} إعجاب</span>
                </button>
                <button className="flex items-center gap-1 text-xs hover:text-white transition">
                  <MessageCircle className="w-4 h-4" />
                  <span>تعليق</span>
                </button>
                <button className="flex items-center gap-1 text-xs hover:text-white transition">
                  <Share2 className="w-4 h-4" />
                  <span>مشاركة</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

