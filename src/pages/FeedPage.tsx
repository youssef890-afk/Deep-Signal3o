import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Share2, Loader2, Send, ImagePlus, X } from 'lucide-react';

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  profiles?: { username: string; avatar_url: string };
  likes_count?: number;
  user_has_liked?: boolean;
}

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [user]);

  async function loadPosts() {
    setLoading(true);
    try {
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url');
      const { data: likesData } = await supabase.from('likes').select('post_id, user_id');

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]));

      const formatted = (postsData || []).map((post) => {
        const postLikes = likesData?.filter((l) => l.post_id === post.id) || [];
        const foundProfile = profilesMap.get(post.user_id);
        return {
          ...post,
          profiles: {
            username: foundProfile?.username || 'مستخدم',
            avatar_url: foundProfile?.avatar_url || '',
          },
          likes_count: postLikes.length,
          user_has_liked: postLikes.some((l) => l.user_id === user?.id),
        };
      });

      setPosts(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim() && !selectedFile) return;

    setUploading(true);
    let finalImageUrl = '';

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user?.id}_${Date.now()}.${fileExt}`;

        // رفع الصورة مباشرة إلى حافظة posts
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
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
      setSelectedFile(null);
      setPreviewUrl(null);
      await loadPosts();
    } catch (err: any) {
      alert('خطأ أثناء رفع المنشور: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28 text-white">
      {/* صندوق إضافة منشور جديد */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 mb-6">
        <h2 className="text-xs font-bold text-neutral-300 mb-3">إضافة منشور جديد</h2>
        <form onSubmit={handleCreatePost} className="space-y-3">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="بماذا تفكر اليوم؟"
            className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 resize-none h-20"
          />

          {previewUrl && (
            <div className="relative w-full h-40 bg-neutral-950 rounded-xl overflow-hidden border border-white/10">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                className="absolute top-2 right-2 bg-black/70 p-1 rounded-full text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer bg-neutral-950 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs text-neutral-300">
              <ImagePlus className="w-4 h-4 text-rose-500" />
              <span>{selectedFile ? 'تغيير الصورة' : 'اختر صورة من الهاتف'}</span>
              <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </label>

            <button
              type="submit"
              disabled={uploading || (!caption.trim() && !selectedFile)}
              className="flex items-center gap-1.5 px-5 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              نشر
            </button>
          </div>
        </form>
      </div>

      {/* عرض المنشورات */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-rose-500" /></div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-3 flex items-center gap-3 border-b border-white/5">
                <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center font-bold text-xs">
                  {post.profiles?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xs font-bold">{post.profiles?.username}</h3>
                  <p className="text-[10px] text-neutral-500">{new Date(post.created_at).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>

              {post.caption && <p className="p-3 text-xs text-neutral-200">{post.caption}</p>}
              {post.image_url && (
                <div className="w-full bg-neutral-950">
                  <img src={post.image_url} alt="Post" className="w-full max-h-80 object-cover" />
                </div>
              )}

              <div className="p-3 flex items-center justify-between text-neutral-400 text-xs">
                <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.likes_count || 0}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> تعليق</span>
                <span className="flex items-center gap-1"><Share2 className="w-4 h-4" /> مشاركة</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

