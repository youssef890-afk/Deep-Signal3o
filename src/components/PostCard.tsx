import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PostProps {
  post: {
    id: string;
    content: string;
    image_url?: string;
    video_url?: string;
    created_at: string;
    profiles?: {
      username: string;
      avatar_url: string;
    };
    likes_count?: number;
  };
}

export const PostCard: React.FC<PostProps> = ({ post }) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);

  const handleLike = async () => {
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
    // يمكنك إضافة كود حفظ الإعجاب فـ Supabase هنا
  };

  return (
    <div className="bg-neutral-900 text-white rounded-2xl p-4 mb-4 border border-neutral-800 shadow-md">
      {/* 1. الهيدر: معلومات صاحب المنشور */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3 space-x-reverse">
          <img
            src={post.profiles?.avatar_url || 'https://via.placeholder.com/150'}
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover border border-neutral-700"
          />
          <div>
            <h4 className="font-semibold text-sm">{post.profiles?.username || 'مستخدم'}</h4>
            <span className="text-xs text-neutral-500">
              {new Date(post.created_at).toLocaleDateString('ar-MA')}
            </span>
          </div>
        </div>
        <button className="text-neutral-400 hover:text-white">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* 2. نص المنشور */}
      {post.content && (
        <p className="text-sm text-neutral-200 mb-3 whitespace-pre-line dir-rtl text-right">
          {post.content}
        </p>
      )}

      {/* 3. الميديا: عرض الفيديو أو الصورة */}
      {post.video_url ? (
        <div className="w-full bg-black rounded-xl overflow-hidden mb-3 border border-neutral-800">
          <video
            src={post.video_url}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[450px] object-contain mx-auto"
          />
        </div>
      ) : post.image_url ? (
        <div className="w-full bg-neutral-950 rounded-xl overflow-hidden mb-3 border border-neutral-800">
          <img
            src={post.image_url}
            alt="Post content"
            className="w-full max-h-96 object-cover"
          />
        </div>
      ) : null}

      {/* 4. أزرار التفاعل (Likes, Comments, Share) */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-neutral-400 text-sm">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-1 space-x-reverse transition ${
            liked ? 'text-red-500' : 'hover:text-white'
          }`}
        >
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          <span>{likesCount}</span>
        </button>

        <button className="flex items-center space-x-1 space-x-reverse hover:text-white transition">
          <MessageCircle size={18} />
          <span>تعليق</span>
        </button>

        <button className="flex items-center space-x-1 space-x-reverse hover:text-white transition">
          <Share2 size={18} />
          <span>مشاركة</span>
        </button>
      </div>
    </div>
  );
};
