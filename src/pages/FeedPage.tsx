import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Share2, Loader2, Image as ImageIcon, Send } from 'lucide-react';

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
  likes_count?: number;
  user_has_liked?: boolean;
}

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [user]);

  async function fetchPosts() {
    setLoading(true);

    // 1. جلب المنشورات مرتبة من الأحدث للأقدم
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      setLoading(false);
      return;
    }

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // 2. جلب معومات البروفايلات والإعجابات لكل منشور
    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(profilesData?.map((p) => [p.id, p]));

    // 3. دمج البيانات لبناء قائمة المنشورات الكاملة
    const formattedPosts = postsData.map((post) => ({
      ...post,
      profiles: profilesMap.get(post.user_id) || {
        username: 'مستخدم',
        avatar_url: '',
      },
    }));

    setPosts(formattedPosts);
    setLoading(false);
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim() && !imageUrl.trim()) return;

    setPosting(true);

    const { error } = await supabase.from('posts').insert([
      {
        user_id: user?.id,
        caption: caption.trim(),
        image_url: imageUrl.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      },
    ]);

    if (error) {
      alert('حدث خطأ أثناء نشر المنشور: ' + error.message);
    } else {
      setCaption('');
      setImageUrl('');
      fetchPosts(); // إعادة تحميل المنشورات بعد الإضافة
    }
    setPosting(false);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28 text-white min-h-screen">
      {/* 1.1 منطقة إنشاء منشور جديد */}
      <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 mb-6 shadow-lg">
        <h2 className="text-xs font-bold text-neutral-300 mb-3">إضافة منشور جديد</h2>
        <form onSubmit={handleCreatePost} className="space-y-3">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="بماذا تفكر اليوم؟"
            className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 resize-none h-20"
          />
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-neutral-950 border border-white/10 rounded-xl px-3 py-2">
              <ImageIcon className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="رابط الصورة (Image URL)"
                className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={posting || (!caption.trim() && !imageUrl.trim())}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              نشر
            </button>
          </div>
        </form>
      </div>

      {/* 1.3 & 1.6 عرض المنشورات */}
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
              {/* Header: البروفايل والمعلومات */}
              <div className="p-3 flex items-center gap-3 border-b border-white/5">
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

              {/* Middle: المحتوى والصورة */}
              {post.caption && (
                <p className="p-3 text-xs text-neutral-200 leading-relaxed">{post.caption}</p>
              )}
              {post.image_url && (
                <div className="w-full bg-neutral-950">
                  <img src={post.image_url} alt="Post Content" className="w-full max-h-80 object-cover" />
                </div>
              )}

              {/* Bottom: التفاعلات */}
              <div className="p-3 flex items-center justify-between border-t border-white/5 text-neutral-400">
                <button className="flex items-center gap-1 text-xs hover:text-rose-500 transition">
                  <Heart className="w-4 h-4" />
                  <span>إعجاب</span>
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
