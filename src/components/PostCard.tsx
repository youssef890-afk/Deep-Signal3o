import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import { Heart, MessageCircle, Share2, Edit2, Trash2, Loader2 } from 'lucide-react';
import type { PostWithDetails } from '@/types';

interface PostCardProps {
  post: PostWithDetails;
  onUpdate?: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [likes, setLikes] = useState(post.likes || []);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [hasLiked, setHasLiked] = useState(post.has_liked || false);

  const isOwner = user?.id === post.user_id;

  const handleLike = async () => {
    if (!user) return;
    setIsLiking(true);
    if (hasLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', post.id);
      if (!error) {
        setHasLiked(false);
        setLikeCount((prev) => prev - 1);
        setLikes(likes.filter((l) => l.user_id !== user.id));
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: user.id, post_id: post.id });
      if (!error) {
        setHasLiked(true);
        setLikeCount((prev) => prev + 1);
        setLikes([...likes, { id: 'temp', user_id: user.id, post_id: post.id }]);
      }
    }
    setIsLiking(false);
  };

  const handleDelete = async () => {
    if (!user) return;
    const confirm = window.confirm('Are you sure you want to delete this post?');
    if (!confirm) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id)
      .eq('user_id', user.id);
    setIsDeleting(false);
    if (!error) {
      alert('✅ Post deleted successfully');
      if (onUpdate) onUpdate();
    }
  };

  return (
    <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar
          src={post.profile?.avatar_url}
          name={post.profile?.full_name || post.profile?.username || 'User'}
          size="sm"
          onClick={() => navigate(`/profile/${post.user_id}`)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white text-sm truncate">
              {post.profile?.username || 'Unknown User'}
            </p>
            <p className="text-xs text-neutral-500">#{post.profile?.display_id || '0000'}</p>
          </div>
          <p className="text-xs text-neutral-500">{new Date(post.created_at).toLocaleDateString()}</p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-neutral-500 hover:text-red-500 transition"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {post.image_url && (
        <img
          src={post.image_url}
          alt="post"
          className="rounded-lg max-h-96 w-full object-cover mb-3"
        />
      )}
      {post.caption && (
        <p className="text-white text-sm mb-3">{post.caption}</p>
      )}

      <div className="flex items-center gap-6">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-1.5 transition ${
            hasLiked ? 'text-rose-500' : 'text-neutral-500 hover:text-rose-500'
          }`}
        >
          {isLiking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
          <span className="text-sm">{likeCount}</span>
        </button>
        <button
          onClick={() => navigate(`/post/${post.id}`)}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-white transition"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm">Comment</span>
        </button>
        <button
          onClick={() => navigator.share?.({ title: 'Deep Signal', text: post.caption || '', url: window.location.href })}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-white transition"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-sm">Share</span>
        </button>
      </div>
    </div>
  );
}
