import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';
import { Loader2, Signal } from 'lucide-react';
import type { PostWithDetails } from '@/types';

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const { data: postData, error } = await supabase
      .from('posts')
      .select(`
        *,
        profile:profiles!posts_user_id_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading posts:', error.message);
      setLoading(false);
      return;
    }

    if (!postData || postData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const postIds = postData.map((p) => p.id);

    const { data: likesData } = await supabase
      .from('likes')
      .select('id, post_id, user_id, created_at')
      .in('post_id', postIds);

    const likesByPost = new Map<string, { id: string; post_id: string; user_id: string; created_at: string }[]>();
    likesData?.forEach((l) => {
      const arr = likesByPost.get(l.post_id) ?? [];
      arr.push(l);
      likesByPost.set(l.post_id, arr);
    });

    const enriched: PostWithDetails[] = postData.map((p) => {
      const likes = likesByPost.get(p.id) ?? [];
      return {
        ...p,
        profile: p.profile as PostWithDetails['profile'],
        likes,
        like_count: likes.length,
        has_liked: user ? likes.some((l) => l.user_id === user.id) : false,
      };
    });

    setPosts(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts, refreshKey]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Stories bar */}
      <div className="mb-6 flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 p-0.5">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <Signal className="w-7 h-7 text-neutral-500" />
            </div>
          </div>
          <span className="text-xs text-neutral-400">Your Story</span>
        </div>
        {posts.slice(0, 8).map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 p-0.5">
              <div className="w-full h-full rounded-full bg-black overflow-hidden">
                {p.profile?.avatar_url ? (
                  <img src={p.profile.avatar_url} alt={p.profile.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs font-bold">
                    {(p.profile?.username || '?').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-neutral-400 truncate max-w-[64px]">{p.profile?.username || 'unknown'}</span>
          </div>
        ))}
      </div>

      {/* Create post trigger */}
      <div className="mb-6">
        <CreatePostModal onPosted={() => setRefreshKey((k) => k + 1)} />
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-neutral-400 text-sm mt-3">Loading feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Signal className="w-10 h-10 text-neutral-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
          <p className="text-neutral-400 text-sm max-w-xs">
            Be the first to share something. Upload an image and start the conversation.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
