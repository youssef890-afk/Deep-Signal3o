import { useEffect, useState, type FormEvent } from 'react';
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Play, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface PostComment {
  id: string;
  author: string;
  text: string;
}

export interface PostCardPost {
  id: string;
  type: 'image' | 'video';
  url: string;
  userId: string;
  author: string;
  avatar: string | null;
  caption: string | null;
  likes: number;
  comments: PostComment[];
  createdAt: string;
}

interface PostCardProps {
  post: PostCardPost;
}

const PostCard = ({ post }: PostCardProps) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedCaption, setExpandedCaption] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [comments, setComments] = useState(post.comments);
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const hasVideo = post.type === 'video';
  const captionIsLong = (post.caption?.length ?? 0) > 120;
  const displayedComments = showAllComments ? comments : comments.slice(0, 2);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [lightboxOpen]);

  const openMedia = () => {
    if (hasVideo) {
      navigate('/reels');
      return;
    }
    setLightboxOpen(true);
  };

  const addComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setComments((current) => [...current, { id: `${post.id}-${Date.now()}`, author: 'أنت', text }]);
    setCommentText('');
    setShowAllComments(true);
  };

  const relativeTime = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  const minutesAgo = Math.max(1, Math.floor((Date.now() - Date.parse(post.createdAt)) / 60000));
  const postedAt = minutesAgo < 60
    ? relativeTime.format(-minutesAgo, 'minute')
    : minutesAgo < 1440
      ? relativeTime.format(-Math.floor(minutesAgo / 60), 'hour')
      : relativeTime.format(-Math.floor(minutesAgo / 1440), 'day');

  return (
    <article className="overflow-hidden border-y border-white/10 bg-[#0a0a0a] sm:rounded-xl sm:border sm:bg-[#111]" dir="rtl">
      <header className="flex h-[58px] items-center gap-3 px-3">
        <button type="button" onClick={() => navigate(`/profile/${post.author}`)} aria-label={`عرض الملف الشخصي ${post.author}`} className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-white/20 transition hover:scale-105">
          <img src={post.avatar ?? `https://picsum.photos/seed/${post.userId}/96/96`} alt="" className="h-full w-full object-cover" />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => navigate(`/profile/${post.author}`)} className="block max-w-full truncate text-right text-sm font-semibold">{post.author}</button>
          <time dateTime={post.createdAt} className="block text-[11px] text-white/50">{postedAt}</time>
        </div>
        <button type="button" aria-label="خيارات المنشور" className="rounded-full p-2 text-white/80 transition hover:scale-110 hover:bg-white/10"><MoreHorizontal className="h-5 w-5" /></button>
      </header>

      <button type="button" onClick={openMedia} aria-label={hasVideo ? 'فتح الفيديو في ريلز' : 'عرض الصورة بالحجم الكامل'} className="group/media block w-full overflow-hidden bg-black text-right">
        <div className="relative aspect-square max-h-[750px] w-full overflow-hidden bg-[#0a0a0a]">
          {hasVideo ? (
            <>
              <video
                src={post.url}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                <span className="grid h-14 w-14 place-items-center rounded-full border border-white/40 bg-black/40 text-white shadow-lg backdrop-blur-sm transition group-hover/media:scale-110">
                  <Play className="h-6 w-6 fill-current" />
                </span>
              </div>
            </>
          ) : (
            <img
              src={post.url}
              alt={post.caption ?? 'منشور'}
              className="h-full w-full object-cover transition duration-500 group-hover/media:scale-[1.015]"
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
      </button>

      <div className="px-3 pb-3 pt-2">
        <div className="mb-2 flex items-center gap-1" dir="ltr">
          <button type="button" onClick={() => setLiked((current) => !current)} aria-label={liked ? 'إزالة الإعجاب' : 'إعجاب'} aria-pressed={liked} className={`rounded-full p-2 transition hover:scale-110 ${liked ? 'text-rose-500' : 'text-white hover:text-white/60'}`}><Heart className="h-6 w-6" fill={liked ? 'currentColor' : 'none'} /></button>
          <button type="button" onClick={() => document.getElementById(`comment-input-${post.id}`)?.focus()} aria-label="التعليقات" className="rounded-full p-2 text-white transition hover:scale-110 hover:text-white/60"><MessageCircle className="h-6 w-6" /></button>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(window.location.href); }} aria-label="مشاركة المنشور" className="rounded-full p-2 text-white transition hover:scale-110 hover:text-white/60"><Send className="h-6 w-6" /></button>
          <button type="button" onClick={() => setSaved((current) => !current)} aria-label={saved ? 'إزالة من المحفوظات' : 'حفظ المنشور'} aria-pressed={saved} className="ml-auto rounded-full p-2 text-white transition hover:scale-110 hover:text-white/60"><Bookmark className="h-6 w-6" fill={saved ? 'currentColor' : 'none'} /></button>
        </div>

        <p className="mb-2 text-sm font-semibold">{(post.likes + Number(liked)).toLocaleString('en-US')} إعجاب</p>
        {post.caption && (
          <p className="text-sm leading-6 text-white/90">
            <button type="button" onClick={() => navigate(`/profile/${post.author}`)} className="ml-1 font-semibold text-white">{post.author}</button>
            {captionIsLong && !expandedCaption ? `${post.caption.slice(0, 120)}…` : post.caption}
            {captionIsLong && <button type="button" onClick={() => setExpandedCaption((current) => !current)} className="mr-1 text-white/50">{expandedCaption ? 'أقل' : 'المزيد'}</button>}
          </p>
        )}
        {comments.length > 0 && (
          <div className="mt-2 space-y-1">
            {!showAllComments && comments.length > 2 && <button type="button" onClick={() => setShowAllComments(true)} className="text-sm text-white/50">شوف كل التعليقات ({comments.length})</button>}
            {displayedComments.map((comment) => <p key={comment.id} className="text-sm leading-5"><span className="ml-1 font-semibold">{comment.author}</span><span className="text-white/80">{comment.text}</span></p>)}
          </div>
        )}
        <form onSubmit={addComment} className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2">
          <input id={`comment-input-${post.id}`} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="أضف تعليقاً..." aria-label="أضف تعليقاً" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/40" />
          <button type="submit" disabled={!commentText.trim()} className="text-xs font-semibold text-sky-300 transition hover:scale-105 disabled:opacity-40">نشر</button>
        </form>
      </div>

      {lightboxOpen && !hasVideo && (
        <div role="dialog" aria-modal="true" aria-label="عرض الصورة" onClick={() => setLightboxOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 sm:p-8">
          <button type="button" onClick={() => setLightboxOpen(false)} aria-label="إغلاق الصورة" className="absolute left-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:scale-105 hover:bg-white/20"><X className="h-6 w-6" /></button>
          <img src={post.url} alt={post.caption ?? 'منشور'} onClick={(event) => event.stopPropagation()} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </article>
  );
};

export default PostCard;
