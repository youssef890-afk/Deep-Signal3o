import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Send, Heart, MessageSquare, Loader2 } from 'lucide-react';

export default function FeedPage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [posting, setPosting] = useState(false);

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
      fetchPosts();
    }
    setPosting(false);
  }

  return (
    <div className="max-w-xl mx-auto px-3 py-4 pb-24 text-white">
      {/* إنشاء منشور جديد */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
            {profile?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-white">{profile?.username || 'User'}</span>
        </div>

        <form onSubmit={handleCreatePost} className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with the world..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 resize-none h-20"
          />

          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={posting || (!content.trim() && !imageUrl.trim())}
              className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Post</>}
            </button>
          </div>
        </form>
      </div>

      {/* قائمة المنشورات */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-neutral-500 text-sm">لا توجد منشورات حالياً</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-neutral-900 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs">
                  {post.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{post.profiles?.username || 'unknown'}</h4>
                  <p className="text-[10px] text-neutral-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {post.content && <p className="text-xs text-neutral-200 mb-3">{post.content}</p>}

              {post.image_url && (
                <div className="rounded-xl overflow-hidden mb-3 border border-white/5 max-h-96">
                  <img src={post.image_url} alt="Post media" className="w-full object-cover" />
                </div>
              )}

              <div className="flex items-center gap-4 text-neutral-400 text-xs pt-2 border-t border-white/5">
                <button className="flex items-center gap-1 hover:text-rose-500">
                  <Heart className="w-4 h-4" /> Like
                </button>
                <button className="flex items-center gap-1 hover:text-white">
                  <MessageSquare className="w-4 h-4" /> Comment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
