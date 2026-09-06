import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Send, Heart, MessageSquare, Loader2, Sparkles, PlusCircle, X, Share2 } from 'lucide-react';

export default function FeedPage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // التحكم في نافذة إنشاء منشور (Modal)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [posting, setPosting] = useState(false);

  // التحكم في التعليقات
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
    setLoading(false);
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !imageUrl.trim()) return;

    setPosting(true);
    const { error } = await supabase.from('posts').insert({
      user_id: user?.id,
      content,
      image_url: imageUrl || null,
    });

    if (!error) {
      setContent('');
      setImageUrl('');
      setShowCreateModal(false);
      fetchPosts();
    }
    setPosting(false);
  }

  async function openComments(postId: string) {
    setActivePostId(postId);
    setLoadingComments(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profiles:user_id(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    setComments(data || []);
    setLoadingComments(false);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !activePostId) return;

    const { error } = await supabase.from('comments').insert({
      post_id: activePostId,
      user_id: user?.id,
      content: commentText,
    });

    if (!error) {
      setCommentText('');
      openComments(activePostId);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 text-white min-h-screen bg-black">
      {/* هيدر مع تأثير النيون والزجاج */}
      <div className="flex items-center justify-between mb-6 bg-neutral-900/60 backdrop-blur-xl border border-rose-500/20 p-4 rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.15)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
          <h1 className="text-lg font-extrabold bg-gradient-to-r from-rose-500 via-purple-500 to-amber-500 bg-clip-text text-transparent">
            Deep Signal
          </h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition shadow-[0_0_12px_rgba(244,63,94,0.4)] active:scale-95"
        >
          <PlusCircle className="w-4 h-4" /> منشور جديد
        </button>
      </div>

      {/* قائمة المنشورات */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 text-sm">لا توجد منشورات حالياً</div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div 
              key={post.id} 
              className="bg-neutral-900/80 backdrop-blur-md border border-white/10 hover:border-rose-500/30 rounded-3xl overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.5)] transition duration-300"
            >
              {/* الناشر والتاريخ */}
              <div className="flex items-center gap-3 p-4 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 via-purple-500 to-amber-500 p-[2px] shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-xs text-rose-400">
                    {post.profiles?.username ? post.profiles.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">
                    {post.profiles?.username || 'مستخدم'}
                  </h4>
                  <p className="text-[10px] text-neutral-400">
                    {new Date(post.created_at).toLocaleDateString('ar-EG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* نص المنشور */}
              {post.content && (
                <p className="px-4 py-3 text-xs text-neutral-200 leading-relaxed font-normal">
                  {post.content}
                </p>
              )}

              {/* الصورة */}
              {post.image_url && (
                <div className="w-full max-h-96 overflow-hidden bg-black/60 relative">
                  <img src={post.image_url} alt="Post media" className="w-full object-cover" />
                </div>
              )}

              {/* أزرار التفاعل نيون */}
              <div className="flex items-center justify-around py-3 px-4 bg-black/40 border-t border-white/5 text-neutral-400 text-xs">
                <button className="flex items-center gap-1.5 hover:text-rose-500 transition duration-200 hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]">
                  <Heart className="w-4 h-4" /> إعجاب
                </button>
                <button 
                  onClick={() => openComments(post.id)}
                  className="flex items-center gap-1.5 hover:text-cyan-400 transition duration-200 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                >
                  <MessageSquare className="w-4 h-4" /> تعليق
                </button>
                <button className="flex items-center gap-1.5 hover:text-purple-400 transition duration-200 hover:drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]">
                  <Share2 className="w-4 h-4" /> مشاركة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة إنشاء منشور Popup نيون */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-rose-500/30 w-full max-w-sm rounded-3xl p-5 relative shadow-[0_0_30px_rgba(244,63,94,0.2)]">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 left-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" /> منشور جديد
            </h3>
            <form onSubmit={handleCreatePost} className="space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="ما الذي يدور في ذهنك؟..."
                className="w-full bg-black/50 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 h-24 resize-none"
              />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="رابط الصورة (اختياري)"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={posting || (!content.trim() && !imageUrl.trim())}
                className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'نشر الآن'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* نافذة التعليقات Popup Modal */}
      {activePostId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-neutral-900 border border-cyan-500/30 w-full max-w-md h-[75vh] sm:h-[550px] rounded-t-3xl sm:rounded-3xl p-4 flex flex-col relative shadow-[0_0_30px_rgba(34,211,238,0.2)]">
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3">
              <h3 className="text-xs font-bold text-cyan-400">التعليقات</h3>
              <button onClick={() => setActivePostId(null)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* قائمة التعليقات */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-xs text-neutral-500 py-8">لا توجد تعليقات، كن أول من يعلق!</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-black/40 p-3 rounded-2xl border border-white/5 text-xs">
                    <span className="font-bold text-rose-400 block mb-1">
                      {c.profiles?.username || 'مستخدم'}
                    </span>
                    <p className="text-neutral-200">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* إدخال تعليق جديد */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-3 border-t border-white/10 mt-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="اكتب تعليقك..."
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl disabled:opacity-50 transition shadow-[0_0_10px_rgba(34,211,238,0.4)]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
