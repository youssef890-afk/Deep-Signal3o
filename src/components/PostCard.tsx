import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import { Heart, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { timeAgo } from '@/utils/format';
import type { PostWithDetails } from '@/types';

interface PostCardProps {
  post: PostWithDetails;
}

export default function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.has_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showMenu, setShowMenu] = useState(false);
  const [burst, setBurst] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));

    if (!wasLiked) {
      setBurst(true);
      setTimeout(() => setBurst(false), 800);
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
    } else {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    }
  };

  const handleDelete = async () => {
    if (!user || post.user_id !== user.id) return;
    await supabase.from('posts').delete().eq('id', post.id);
    setShowMenu(false);
    window.location.reload();
  };

  const profile = post.profile;
  const displayName = profile?.full_name || profile?.username || 'Unknown';

  return (
    <article className="bg-neutral-900/60 border border-white/10 rounded-2xl overflow-hidden animate-slide-up hover:border-white/20 transition-all">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar
          src={profile?.avatar_url}
          name={displayName}
          size="sm"
          onClick={() => profile && navigate(`/profile/${profile.id}`)}
        />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => profile && navigate(`/profile/${profile.id}`)}>
          <p className="text-sm font-semibold text-white truncate">{profile?.username || 'unknown'}</p>
          <p className="text-xs text-neutral-500">{timeAgo(post.created_at)} ago</p>
        </div>

        {post.user_id === user?.id && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-neutral-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-neutral-800 border border-white/10 rounded-xl shadow-xl py-1 z-10 animate-scale-in">
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image */}
      <div className="relative bg-black overflow-hidden" onDoubleClick={handleLike}>
        <img
          src={post.image_url}
          alt={post.caption || 'post'}
          className="w-full max-h-[600px] object-cover"
          loading="lazy"
        />
        {burst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="w-24 h-24 text-white fill-white heart-burst" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 transition-all hover:scale-105 active:scale-90 ${
              liked ? 'text-rose-500' : 'text-neutral-300 hover:text-rose-400'
            }`}
          >
            <Heart className={`w-6 h-6 ${liked ? 'fill-rose-500' : ''} ${liked ? 'animate-pop' : ''}`} />
          </button>
          <button
            onClick={() => profile && navigate(`/chat/${profile.id}`)}
            className="text-neutral-300 hover:text-white transition-all hover:scale-105 active:scale-90"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Likes count */}
        <p className="text-sm font-semibold text-white mb-1.5">
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </p>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-neutral-200 leading-relaxed">
            <span className="font-semibold text-white">{profile?.username || 'unknown'}</span>{' '}
            {post.caption}
          </p>
        )}
      </div>
    </article>
  );
}
