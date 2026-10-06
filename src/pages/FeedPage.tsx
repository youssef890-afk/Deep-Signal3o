import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import PostCard, { type PostCardPost } from '@/components/PostCard';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';

const videoUrls = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://www.w3schools.com/html/movie.mp4',
  'https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080.mp4',
  'https://videos.pexels.com/video-files/855885/855885-hd_1920_1080.mp4',
  'https://videos.pexels.com/video-files/856019/856019-hd_1920_1080.mp4',
];

export const MOCK_POSTS: PostCardPost[] = Array.from({ length: 20 }, (_, index) => {
  const isVideo = index >= 14;
  const seed = (index % 14) + 1;
  const username = `youssef_${index + 1}`;
  const createdAt = new Date(Date.now() - (index + 1) * 47 * 60 * 1000).toISOString();

  return {
    id: `mock-${index + 1}`,
    type: isVideo ? 'video' : 'image',
    url: isVideo ? videoUrls[index - 14] : `https://picsum.photos/seed/${seed}/800/800`,
    userId: `mock-user-${index + 1}`,
    author: username,
    avatar: `https://picsum.photos/seed/avatar-${seed}/128/128`,
    caption: index % 2 === 0
      ? 'لحظات صغيرة كتخلي النهار أجمل. شاركوني أجمل لقطة عندكم اليوم ✨'
      : 'نهار جديد، أماكن جديدة، وذكريات كتستاهل تبقى. 🌿',
    likes: 1234 + index * 37,
    comments: [
      { id: `comment-${index}-1`, author: 'sara', text: 'زوين بزاف 😍' },
      { id: `comment-${index}-2`, author: 'amine', text: 'فين هاد البلاصة؟' },
      { id: `comment-${index}-3`, author: 'meryem', text: 'التصويرة رائعة!' },
    ],
    createdAt,
  };
});

const stories = ['salma', 'amine', 'sara', 'yassine', 'meryem', 'adam', 'nour'];
const suggestions = ['lina.photo', 'omar_travels', 'sara.art', 'mehdi.fit', 'nour.daily'];

export default function FeedPage() {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [followedSuggestions, setFollowedSuggestions] = useState<string[]>([]);
  const [storyNotice, setStoryNotice] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFeed = async () => {
      try {
        setLoading(true);
        setFeedError(null);

        const { data, error } = await supabase
          .from('posts')
          .select('id, user_id, image_url, video_url, caption, created_at, likes_count, profiles:profiles(id, username, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(40);

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        const normalizedPosts: PostCardPost[] = (data ?? []).map((post) => {
          const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
          const videoUrl = typeof post.video_url === 'string' ? post.video_url : null;
          return {
            id: String(post.id),
            type: videoUrl ? 'video' : 'image',
            url: videoUrl ?? (typeof post.image_url === 'string' ? post.image_url : ''),
            userId: String(post.user_id),
            author: profile && typeof profile.username === 'string' ? profile.username : 'مستخدم',
            avatar: profile && typeof profile.avatar_url === 'string' ? profile.avatar_url : null,
            caption: typeof post.caption === 'string' ? post.caption : null,
            likes: Number(post.likes_count ?? 0),
            comments: [],
            createdAt: typeof post.created_at === 'string' ? post.created_at : new Date().toISOString(),
          };
        });

        setPosts(normalizedPosts.length > 0 ? normalizedPosts : MOCK_POSTS);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error('Feed load error:', error);
        setFeedError('مشكل فالتحميل، عاود جرب');
        setPosts([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadFeed();
    return () => {
      isMounted = false;
    };
  }, [retryCount, user?.id]);

  return (
    <div className="min-h-screen text-white" dir="rtl">
      <div className="mx-auto w-full max-w-[1240px] px-0 pb-24 sm:px-4 lg:pb-8">
        <div className="sticky top-[64px] z-20 border-b border-white/10 bg-black/90 px-3 py-3 backdrop-blur-xl sm:top-[72px] sm:rounded-b-xl sm:border-x">
          <div className="flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" dir="ltr" aria-label="القصص">
            <button
              type="button"
              onClick={() => setStoryNotice((current) => !current)}
              aria-label="أضف قصتك"
              className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
            >
              <span className="relative grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-[#151515] text-white transition hover:scale-105">
                <img src="https://picsum.photos/seed/my-story/128/128" alt="" className="h-full w-full rounded-full object-cover opacity-70" />
                <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full border-2 border-black bg-sky-400 text-black"><Plus className="h-4 w-4" /></span>
              </span>
              <span className="w-full truncate text-[11px] text-white/70" dir="rtl">قصتك</span>
            </button>
            {stories.map((story, index) => (
              <button key={story} type="button" onClick={() => navigate(`/profile/${story}`)} className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center" dir="rtl">
                <span className="h-16 w-16 rounded-full bg-gradient-to-tr from-yellow-400 via-rose-500 to-fuchsia-600 p-[2px] transition hover:scale-105">
                  <img src={`https://picsum.photos/seed/story-${index + 1}/128/128`} alt="" className="h-full w-full rounded-full border-2 border-black object-cover" />
                </span>
                <span className="w-full truncate text-[11px] text-white/80">{story}</span>
              </button>
            ))}
          </div>
          {storyNotice && <p className="mt-2 text-center text-xs text-white/55">إضافة القصص قريباً</p>}
        </div>

        <div className="mx-auto grid w-full max-w-[900px] grid-cols-1 gap-8 pt-4 xl:grid-cols-[minmax(0,600px)_280px] xl:gap-6">
          <section className="min-w-0" aria-label="المنشورات">
            {feedError && posts.length === 0 && !loading && (
              <div role="alert" className="mx-3 rounded-xl border border-rose-400/20 bg-[#111] p-6 text-center sm:mx-0">
                <p className="text-sm text-rose-200">{feedError}</p>
                <button type="button" onClick={() => { setLoading(true); setRetryCount((count) => count + 1); }} className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold transition hover:scale-[1.02] hover:bg-white/15">إعادة المحاولة</button>
              </div>
            )}

            {loading && (
              <div className="space-y-4 px-3 sm:px-0" aria-label="جاري تحميل المنشورات">
                {Array.from({ length: 2 }, (_, index) => (
                  <article key={index} className="animate-pulse overflow-hidden rounded-xl border border-white/10 bg-[#111]">
                    <div className="flex h-14 items-center gap-3 px-3"><span className="h-9 w-9 rounded-full bg-white/10" /><span className="h-3 w-28 rounded bg-white/10" /></div>
                    <div className="aspect-square bg-white/[0.06]" />
                    <div className="space-y-3 p-3"><div className="h-5 w-24 rounded bg-white/10" /><div className="h-3 w-3/4 rounded bg-white/10" /></div>
                  </article>
                ))}
              </div>
            )}

            {!loading && !feedError && posts.length === 0 && (
              <div className="mx-3 rounded-xl border border-white/10 bg-[#111] p-8 text-center text-sm text-white/60 sm:mx-0">ما كاين حتى منشور</div>
            )}

            {!loading && posts.length > 0 && (
              <div className="space-y-4">
                {posts.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            )}
          </section>

          <aside className="hidden min-w-0 xl:block" aria-label="اقتراحات المتابعة">
            <div className="sticky top-[88px] space-y-5">
              <section className="rounded-xl border border-white/10 bg-[#111] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold">مقترح لك</h2>
                  <button type="button" className="text-xs font-semibold text-sky-300">عرض الكل</button>
                </div>
                <div className="space-y-4">
                  {suggestions.map((username, index) => {
                    const isFollowed = followedSuggestions.includes(username);
                    return (
                      <div key={username} className="flex min-w-0 items-center gap-2" dir="rtl">
                        <button type="button" onClick={() => navigate(`/profile/${username}`)} className="h-9 w-9 shrink-0 rounded-full ring-1 ring-white/10 transition hover:scale-105">
                          <img src={`https://picsum.photos/seed/suggestion-${index}/96/96`} alt="" className="h-full w-full rounded-full object-cover" />
                        </button>
                        <button type="button" onClick={() => navigate(`/profile/${username}`)} className="min-w-0 flex-1 truncate text-right text-xs font-semibold">{username}</button>
                        <button type="button" onClick={() => setFollowedSuggestions((current) => isFollowed ? current.filter((name) => name !== username) : [...current, username])} className={`shrink-0 text-xs font-bold transition hover:scale-105 ${isFollowed ? 'text-white/55' : 'text-sky-300'}`}>{isFollowed ? 'متابَع' : 'متابعة'}</button>
                      </div>
                    );
                  })}
                </div>
              </section>
              <footer className="px-2 text-[11px] leading-6 text-white/35">
                <nav className="flex flex-wrap gap-x-2" aria-label="روابط مساعدة">
                  <a href="#about" className="hover:text-white/60">حول</a><a href="#help" className="hover:text-white/60">مساعدة</a><a href="#privacy" className="hover:text-white/60">خصوصية</a><a href="#terms" className="hover:text-white/60">شروط</a>
                </nav>
                <p className="mt-2">© 2026 DeepSignal</p>
              </footer>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
