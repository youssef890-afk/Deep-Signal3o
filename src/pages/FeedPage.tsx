import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Heart, MessageCircle, Share2, Loader2, Send, 
  ImagePlus, X, PlusCircle, MessageSquare 
} from 'lucide-react';

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  profiles?: { username: string; avatar_url: string };
  likes_count: number;
  user_has_liked: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles?: { username: string };
}

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Comments State
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

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

  // Toggle Like
  async function handleToggleLike(post: Post) {
    if (!user) return;

    // Optimistic UI Update
    setPosts(prev => prev.map(p => {
      if (p.id === post.id) {
        return {
          ...p,
          user_has_liked: !p.user_has_liked,
          likes_count: p.user_has_liked ? p.likes_count - 1 : p.likes_count + 1
        };
      }
      return p;
    }));

    if (post.user_has_liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('likes').insert([{ post_id: post.id, user_id: user.id }]);
    }
  }

  // Share Post
  function handleShare(postId: string) {
    const url = `${window.location.origin}/#post-${postId}`;
    navigator.clipboard.writeText(url);
    alert('تم نسخ رابط المنشور بنجاح!');
  }

  // Load Comments
  async function toggleComments(postId: string) {
    if (activePostId === postId) {
      setActivePostId(null);
      return;
    }
    setActivePostId(postId);
    setLoadingComments(true);

    const { data: commentsData } = await supabase
      .from('comments')
      .select('*, profiles(username)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    setComments(commentsData || []);
    setLoadingComments(false);
  }

  // Add Comment
  async function handleAddComment(postId: string) {
    if (!newComment.trim() || !user) return;

    const { data, error } = await supabase
      .from('comments')
      .insert([{ post_id: postId, user_id: user.id, content: newComment.trim() }])
      .select('*, profiles(username)')
      .single();

    if (!error && data) {
      setComments(prev => [...prev, data]);
      setNewComment('');
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
      setIsModalOpen(false);
      await loadPosts();
    } catch (err: any) {
      alert('خطأ أثناء النشر: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28 text-white">
      {/* زر إطلاق واجهة إضافة منشور جديد */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full mb-6 py-3 px-4 bg-neutral-900 border border-white/10 hover:border-rose-500/50 rounded-2xl flex items-center justify-between text-neutral-400 text-xs shadow-lg transition-all"
      >
        <span className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-rose-500" />
          ماذا يدور في ذهنك اليوم؟
        </span>
        <span className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-xl font-semibold text-[11px]">
          + منشور جديد
        </span>
      </button>

      {/* Modal - نافذة النشر الانبثاقية */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md p-4 relative shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <h3 className="text-sm font-bold text-white">إنشاء منشور جديد</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="اكتب موضوع المنشور هنا..."
                className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 resize-none h-28"
              />

              {previewUrl && (
                <div className="relative w-full h-44 bg-neutral-950 rounded-xl overflow-hidden border border-white/10">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 bg-black/80 p-1.5 rounded-full text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-neutral-950 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs text-neutral-300">
                  <ImagePlus className="w-4 h-4 text-rose-500" />
                  <span>{selectedFile ? 'تغيير الصورة' : 'إضافة صورة'}</span>
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                </label>

                <button
                  type="submit"
                  disabled={uploading || (!caption.trim() && !selectedFile)}
                  className="flex items-center gap-1.5 px-5 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  نشر الان
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* قائمة المنشورات */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-rose-500" /></div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} id={`post-${post.id}`} className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-3 flex items-center gap-3 border-b border-white/5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center font-bold text-xs">
                  {post.profiles?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xs font-bold">{post.profiles?.username}</h3>
                  <p className="text-[10px] text-neutral-500">{new Date(post.created_at).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>

              {post.caption && <p className="p-3 text-xs text-neutral-200 leading-relaxed">{post.caption}</p>}
              {post.image_url && (
                <div className="w-full bg-neutral-950">
                  <img src={post.image_url} alt="Post" className="w-full max-h-96 object-contain" />
                </div>
              )}

              {/* أزرار التفاعل (Like, Comment, Share) */}
              <div className="p-3 flex items-center justify-between border-t border-white/5 text-neutral-400 text-xs">
                <button 
                  onClick={() => handleToggleLike(post)} 
                  className={`flex items-center gap-1.5 transition-colors ${post.user_has_liked ? 'text-rose-500 font-bold' : 'hover:text-white'}`}
                >
                  <Heart className={`w-4 h-4 ${post.user_has_liked ? 'fill-rose-500' : ''}`} />
                  <span>{post.likes_count} إعجاب</span>
                </button>

                <button 
                  onClick={() => toggleComments(post.id)} 
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تعليق</span>
                </button>

                <button 
                  onClick={() => handleShare(post.id)} 
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>مشاركة</span>
                </button>
              </div>

              {/* قسم التعليقات الانزلاقي */}
              {activePostId === post.id && (
                <div className="bg-neutral-950 p-3 border-t border-white/10 space-y-3">
                  {loadingComments ? (
                    <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-rose-500" /></div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {comments.length === 0 ? (
                        <p className="text-[11px] text-neutral-500 text-center py-2">لا توجد تعليقات بعد. كن أول من يعلق!</p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="bg-neutral-900 p-2 rounded-xl text-xs">
                            <span className="font-bold text-rose-400 block text-[11px]">{c.profiles?.username || 'مستخدم'}</span>
                            <span className="text-neutral-200">{c.content}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="اكتب تعليقاً..."
                      className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-xl"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
