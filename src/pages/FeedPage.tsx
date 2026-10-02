import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  FileText,
  Image as ImageIcon,
  Video,
  Music2,
} from 'lucide-react';
import { CreatePostModal } from '@/components/CreatePostModal';
import PostSummarizer from '@/components/PostSummarizer';

interface UserProfile {
  id: string;
  username: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url: string | null;
}

interface ConnectionProfile extends UserProfile {
  followedByMe: boolean;
  followsMe: boolean;
  latestPostType: 'text' | 'image' | 'video' | 'reel' | 'audio' | null;
  latestPostAt: string | null;
  hasRecentPost: boolean;
}

interface Post {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  caption: string | null;
  created_at: string;
  post_type?: 'text' | 'image' | 'video' | 'reel';
  background_style?: string | null;
  media_urls?: string[];
  video_type?: 'video' | 'reel' | null;

  profiles?: UserProfile;

  likes_count: number;
  user_has_liked: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;

  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

/*
 * Cache بسيط باش Feed ما يبداش من الصفر
 * كل مرة المستخدم يرجع للصفحة.
 */
let feedCache: {
  userId: string;
  posts: Post[];
  connections: ConnectionProfile[];
} | null = null;

function readCachedFeed(userId?: string) {
  if (!userId) return null;
  if (feedCache?.userId === userId) return feedCache;

  try {
    const saved = localStorage.getItem(`ds-feed-v1:${userId}`);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as typeof feedCache;
    return parsed?.userId === userId && Array.isArray(parsed.posts) && Array.isArray(parsed.connections)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export default function FeedPage() {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const navigate = useNavigate();
  const cachedFeed = readCachedFeed(user?.id);

  const [posts, setPosts] = useState<Post[]>(
    cachedFeed?.posts || []
  );

  const [connections, setConnections] = useState<ConnectionProfile[]>(
    cachedFeed?.connections || []
  );

  const [feedError, setFeedError] = useState<string | null>(null);

  const [loading, setLoading] = useState(
    !cachedFeed?.posts.length
  );

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [activePostId, setActivePostId] =
    useState<string | null>(null);

  const [comments, setComments] =
    useState<Comment[]>([]);

  const [newComment, setNewComment] =
    useState('');

  const [loadingComments, setLoadingComments] =
    useState(false);

  const loadFeed = useCallback(async () => {
    if (!user) return;

    /*
     * إلا كان عندنا Cache:
     * نخلي البيانات تبان مباشرة
     * ونحدثها فالخلفية.
     */
    setFeedError(null);
    if (!cachedFeed?.posts.length) {
      setLoading(true);
    }

    try {
      const [followingResult, followersResult] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase.from('follows').select('follower_id').eq('following_id', user.id),
      ]);

      if (followingResult.error) throw followingResult.error;
      if (followersResult.error) throw followersResult.error;
      const followingIds = (followingResult.data ?? []).map((follow) => follow.following_id);
      const followerIds = (followersResult.data ?? []).map((follow) => follow.follower_id);
      const feedUserIds = [...new Set([user.id, ...followingIds])];
      const connectionIds = [...new Set([...followingIds, ...followerIds])].filter((id) => id !== user.id);

      /*
       * أولاً:
       * نجيب المستخدم الحالي.
       *
       * ثانياً:
       * نجيب المنشورات.
       *
       * بجوج في نفس الوقت.
       */
      const postsResult = await supabase
        .from('posts')
        .select(
          `
              id,
              user_id,
              image_url,
              video_url,
              audio_url,
              caption,
              created_at,
              post_type,
              background_style,
              media_urls,
              video_type
          `
        )
        .order('created_at', {
          ascending: false,
        })
        .in('user_id', feedUserIds)
        .limit(30);

      if (postsResult.error) {
        throw postsResult.error;
      }

      const postsData =
        postsResult.data || [];

      /*
       * ---------------------------------------
       * جلب Profiles ديال أصحاب المنشورات
       * ---------------------------------------
       *
       * كنستخرج غير IDs ديال أصحاب Posts
       * ومن بعد كنجيب Profiles باستعمال:
       *
       * .in('id', postUserIds)
       *
       * هكذا كل Post كيتربط مباشرة
       * بالـ Profile ديال صاحبو.
       */

      const postUserIds = [
        ...new Set(
          postsData
            .map((post) => post.user_id)
            .filter(
              (id): id is string =>
                Boolean(id)
            )
        ),
      ];

      let postProfiles: UserProfile[] = [];

      if (postUserIds.length > 0) {
        const profilesResult = await supabase
          .from('profiles')
          .select(
            'id, username, full_name, bio, avatar_url'
          )
          .in(
            'id',
            postUserIds
          );

        if (profilesResult.error) {
          console.error(
            'Post profiles error:',
            profilesResult.error
          );
        } else {
          postProfiles =
            profilesResult.data || [];
        }
      }

      /*
       * ---------------------------------------
       * Map ديال Profiles
       * ---------------------------------------
       *
       * المفتاح = profile.id
       *
       * ومن بعد نقدر نلقاو Profile ديال
       * كل Post باستعمال post.user_id.
       */

      const profilesMap = new Map<
        string,
        UserProfile
      >();

      for (const profile of postProfiles) {
        if (!profile?.id) continue;

        profilesMap.set(
          profile.id,
          profile
        );
      }

      /*
       * Debug فقط:
       * إلا كان شي Post ما عندوش Profile
       * كنشوفو ID ديالو فالـ console.
       */
      /*
       * ---------------------------------------
       * جلب Users للاقتراحات
       * ---------------------------------------
       */
      let connectionProfiles: ConnectionProfile[] = [];
      if (connectionIds.length > 0) {
        const [connectionProfilesResult, connectionPostsResult] = await Promise.all([
          supabase.from('profiles')
            .select('id, username, full_name, bio, avatar_url')
            .in('id', connectionIds),
          supabase.from('posts')
            .select('user_id, post_type, video_url, audio_url, created_at')
            .in('user_id', connectionIds)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(500),
        ]);

        if (connectionProfilesResult.error) throw connectionProfilesResult.error;
        if (connectionPostsResult.error) throw connectionPostsResult.error;

        const latestPosts = new Map<string, { type: ConnectionProfile['latestPostType']; createdAt: string }>();
        for (const post of connectionPostsResult.data ?? []) {
          if (latestPosts.has(post.user_id)) continue;
          const type = post.audio_url
            ? 'audio'
            : post.video_url
            ? post.post_type === 'reel' ? 'reel' : 'video'
            : post.post_type === 'text' || post.post_type === 'image' || post.post_type === 'reel'
              ? post.post_type
              : null;
          latestPosts.set(post.user_id, { type, createdAt: post.created_at });
        }

        const freshAfter = Date.now() - 24 * 60 * 60 * 1000;
        connectionProfiles = (connectionProfilesResult.data ?? []).map((profile) => {
          const latestPost = latestPosts.get(profile.id);
          return {
            ...profile,
            followedByMe: followingIds.includes(profile.id),
            followsMe: followerIds.includes(profile.id),
            latestPostType: latestPost?.type ?? null,
            latestPostAt: latestPost?.createdAt ?? null,
            hasRecentPost: Boolean(latestPost && Date.parse(latestPost.createdAt) >= freshAfter),
          };
        }).sort((first, second) =>
          Number(second.hasRecentPost) - Number(first.hasRecentPost) ||
          Date.parse(second.latestPostAt ?? '') - Date.parse(first.latestPostAt ?? '')
        );
      }
      setConnections(connectionProfiles);

      /*
       * ---------------------------------------
       * Likes
       * ---------------------------------------
       */
      const postIds =
        postsData.map(
          (post) => post.id
        );

      let likesData: {
        post_id: string;
        user_id: string;
      }[] = [];

      if (postIds.length > 0) {
        const likesResult = await supabase
          .from('likes')
          .select(
            'post_id, user_id'
          )
          .in(
            'post_id',
            postIds
          );

        if (likesResult.error) {
          console.error(
            'Likes error:',
            likesResult.error
          );
        } else {
          likesData =
            likesResult.data || [];
        }
      }

      /*
       * ---------------------------------------
       * تجميع Likes لكل Post
       * ---------------------------------------
       */
      const likesMap = new Map<
        string,
        {
          count: number;
          likedByCurrentUser: boolean;
        }
      >();

      for (const like of likesData) {
        const existing =
          likesMap.get(
            like.post_id
          ) || {
            count: 0,
            likedByCurrentUser: false,
          };

        existing.count += 1;

        if (
          like.user_id ===
          user.id
        ) {
          existing.likedByCurrentUser =
            true;
        }

        likesMap.set(
          like.post_id,
          existing
        );
      }

      /*
       * ---------------------------------------
       * تجهيز Posts
       * ---------------------------------------
       */
      const formattedPosts: Post[] =
        postsData.map(
          (post) => {
            /*
             * هنا الربط الحقيقي:
             *
             * post.user_id
             *       ↓
             * profilesMap
             *       ↓
             * profile
             */
            const profile =
              profilesMap.get(
                post.user_id
              );

            const likeInfo =
              likesMap.get(
                post.id
              ) || {
                count: 0,
                likedByCurrentUser:
                  false,
              };

            let mediaUrls: string[] =
              [];

            if (
              Array.isArray(
                post.media_urls
              )
            ) {
              mediaUrls =
                post.media_urls.filter(
                  (
                    url
                  ): url is string =>
                    typeof url ===
                      'string' &&
                    url.length > 0
                );
            }

            return {
              id: post.id,

              user_id:
                post.user_id,

              image_url:
                post.image_url ??
                null,

              video_url:
                post.video_url ??
                null,

              audio_url:
                post.audio_url ??
                null,

              caption:
                post.caption ??
                null,

              created_at:
                post.created_at,

              post_type:
                post.post_type ??
                'image',

              background_style:
                post.background_style ??
                null,

              media_urls:
                mediaUrls,

              video_type:
                post.video_type ??
                null,

              /*
               * مهم:
               * ما نصاوبوش Profile وهمي.
               *
               * إذا كان Profile موجود:
               * نستعملو.
               *
               * إذا ما كانش موجود:
               * نخلي profiles undefined.
               */
              profiles:
                profile,

              likes_count:
                likeInfo.count,

              user_has_liked:
                likeInfo.likedByCurrentUser,
            };
          }
        );

      setPosts(
        formattedPosts
      );

      /*
       * Cache
       */
      feedCache = {
        userId: user.id,
        posts:
          formattedPosts,
        connections:
          connectionProfiles,
      };
      try {
        localStorage.setItem(`ds-feed-v1:${user.id}`, JSON.stringify(feedCache));
      } catch (error) {
        console.warn('Feed cache storage is unavailable:', error);
      }
    } catch (error) {
      console.error(
        'Error loading feed:',
        error
      );
      setFeedError('ما قدرناش نحمّلو المنشورات دابا. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [cachedFeed?.posts.length, user]);

  useEffect(() => {
    if (!user) return;
    void loadFeed();
  }, [loadFeed, user]);

  useEffect(() => {
    const refreshWhenOnline = () => void loadFeed();
    window.addEventListener('online', refreshWhenOnline);
    return () => window.removeEventListener('online', refreshWhenOnline);
  }, [loadFeed]);

  /*
   * ---------------------------------------
   * LIKE
   * ---------------------------------------
   */
  async function handleToggleLike(
    post: Post
  ) {
    if (!user) return;

    const previousLiked =
      post.user_has_liked;

    /*
     * UI مباشرة
     */
    setPosts(
      (currentPosts) =>
        currentPosts.map(
          (item) => {
            if (
              item.id !==
              post.id
            ) {
              return item;
            }

            return {
              ...item,

              user_has_liked:
                !previousLiked,

              likes_count:
                previousLiked
                  ? Math.max(
                      0,
                      item.likes_count -
                        1
                    )
                  : item.likes_count +
                    1,
            };
          }
        )
    );

    try {
      if (previousLiked) {
        const { error } =
          await supabase
            .from('likes')
            .delete()
            .eq(
              'post_id',
              post.id
            )
            .eq(
              'user_id',
              user.id
            );

        if (error) {
          throw error;
        }
      } else {
        const { error } =
          await supabase
            .from('likes')
            .insert({
              post_id:
                post.id,
              user_id:
                user.id,
            });

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error(
        'Like error:',
        error
      );

      /*
       * Rollback
       */
      setPosts(
        (currentPosts) =>
          currentPosts.map(
            (item) => {
              if (
                item.id !==
                post.id
              ) {
                return item;
              }

              return {
                ...item,

                user_has_liked:
                  previousLiked,

                likes_count:
                  previousLiked
                    ? item.likes_count +
                      1
                    : Math.max(
                        0,
                        item.likes_count -
                          1
                      ),
              };
            }
          )
      );
    }
  }

  /*
   * ---------------------------------------
   * COMMENTS
   * ---------------------------------------
   */
  async function toggleComments(
    postId: string
  ) {
    if (
      activePostId ===
      postId
    ) {
      setActivePostId(null);
      return;
    }

    setActivePostId(
      postId
    );

    setLoadingComments(
      true
    );

    setComments([]);

    try {
      const {
        data,
        error,
      } = await supabase
        .from('comments')
        .select(
          '*, profiles(username, avatar_url)'
        )
        .eq(
          'post_id',
          postId
        )
        .order(
          'created_at',
          {
            ascending: true,
          }
        );

      if (error) {
        throw error;
      }

      setComments(
        data || []
      );
    } catch (error) {
      console.error(
        'Comments error:',
        error
      );
    } finally {
      setLoadingComments(
        false
      );
    }
  }

  /*
   * ---------------------------------------
   * ADD COMMENT
   * ---------------------------------------
   */
  async function handleAddComment(
    postId: string
  ) {
    if (
      !user ||
      !newComment.trim()
    ) {
      return;
    }

    const text =
      newComment.trim();

    try {
      const {
        data,
        error,
      } = await supabase
        .from('comments')
        .insert({
          post_id:
            postId,
          user_id:
            user.id,
          content:
            text,
        })
        .select(
          '*, profiles(username, avatar_url)'
        )
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setComments(
          (current) => [
            ...current,
            data,
          ]
        );
      }

      setNewComment('');
    } catch (error) {
      console.error(
        'Add comment error:',
        error
      );
    }
  }

  /*
   * ---------------------------------------
   * SHARE
   * ---------------------------------------
   */
  async function handleShare(
    postId: string
  ) {
    const url =
      `${window.location.origin}/post/${postId}`;

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            'Deep Signal',

          text:
            'شوف هاد المنشور في Deep Signal',

          url,
        });
      } else {
        await navigator.clipboard.writeText(
          url
        );

        alert(
          'تم نسخ رابط المنشور'
        );
      }
    } catch (error) {
      if (
        error instanceof
          DOMException &&
        error.name ===
          'AbortError'
      ) {
        return;
      }

      console.error(
        'Share error:',
        error
      );
    }
  }

  /*
   * ---------------------------------------
   * TEXT BACKGROUND
   * ---------------------------------------
   */
  function getTextBackground(
    style?: string | null
  ) {
    switch (style) {
      case 'sunset':
        return 'bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600';

      case 'purple':
        return 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500';

      case 'ocean':
        return 'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700';

      case 'fire':
        return 'bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500';

      case 'green':
        return 'bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700';

      case 'dark':
        return 'bg-gradient-to-br from-neutral-800 via-neutral-900 to-black';

      default:
        return 'bg-gradient-to-br from-purple-600 to-rose-500';
    }
  }

  /*
   * ---------------------------------------
   * POST MEDIA
   * ---------------------------------------
   */
  function renderPostMedia(
    post: Post
  ) {
    /*
     * VIDEO / REEL
     */
    if (post.video_url) {
      return (
        <div className="w-full bg-black overflow-hidden">
          <video
            src={
              post.video_url
            }
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[600px] object-contain"
          />
        </div>
      );
    }

    /*
     * TEXT POST
     */
    if (
      post.post_type ===
      'text'
    ) {
      return (
        <div
          className={`min-h-[280px] w-full flex items-center justify-center p-8 text-center ${getTextBackground(
            post.background_style
          )}`}
        >
          <p className="text-white text-xl font-bold leading-relaxed whitespace-pre-wrap">
            {
              post.caption
            }
          </p>
        </div>
      );
    }

    /*
     * IMAGES
     */
    const mediaUrls =
      post.media_urls &&
      post.media_urls.length >
        0
        ? post.media_urls
        : post.image_url
        ? [
            post.image_url,
          ]
        : [];

    /*
     * Multiple images
     */
    if (
      mediaUrls.length >
      1
    ) {
      return (
        <div className="grid grid-cols-2 gap-1 bg-black">
          {mediaUrls.map(
            (
              url,
              index
            ) => (
              <img
                key={`${url}-${index}`}
                src={url}
                alt={`صورة ${
                  index + 1
                }`}
                loading="lazy"
                className="w-full aspect-square object-cover"
              />
            )
          )}
        </div>
      );
    }

    /*
     * Single image
     */
    if (
      mediaUrls.length ===
      1
    ) {
      return (
        <div className="w-full bg-neutral-950">
          <img
            src={
              mediaUrls[0]
            }
            alt="Post"
            loading="lazy"
            className="w-full max-h-[600px] object-contain"
          />
        </div>
      );
    }

    return (
      <div className="min-h-[100px] bg-neutral-900 flex items-center justify-center text-neutral-500">
        لا توجد وسائط
      </div>
    );
  }

  /*
   * ---------------------------------------
   * LOADING
   * ---------------------------------------
   */
  if (
    loading &&
    posts.length === 0
  ) {
    return (
      <div className="min-h-[60vh] text-white">
        <div className="mx-auto w-full max-w-[680px] px-3 py-5 sm:px-5">

          <div className="h-12 w-40 bg-neutral-900 rounded-xl animate-pulse mb-6" />

          <div className="h-20 bg-neutral-900 rounded-2xl animate-pulse mb-4" />

          <div className="h-80 bg-neutral-900 rounded-2xl animate-pulse" />

        </div>
      </div>
    );
  }

  return (
    <div className="text-white">

      <div className="mx-auto w-full max-w-[680px] px-3 pt-5 pb-28 sm:px-5 lg:pb-8">

        {feedError && posts.length > 0 && (
          <p role="status" className="mb-4 rounded-lg border border-amber-300/10 bg-amber-300/[0.04] px-3 py-2 text-[10px] text-amber-100/70" dir="rtl">
            كتشوف آخر نسخة محفوظة؛ التحديث غير متاح دابا.
          </p>
        )}

        <section className="mb-5 flex items-center justify-between gap-3" dir="rtl">
          <div>
            <p className="text-[11px] font-medium text-rose-300/80">مساحة متابعاتك</p>
            <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">الرئيسية</h1>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-4 text-xs font-semibold text-white transition hover:brightness-110"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            منشور جديد
          </button>
        </section>

        {connections.length > 0 && (
          <section className="mb-7" dir="rtl" aria-label="المتابعون والمتابَعون">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold">دائرتك</h2>
                <p className="mt-1 text-[10px] text-white/40">الحسابات التي تتابعها أو تتابعك</p>
              </div>
              <span className="text-[10px] text-white/35">{connections.length} حساب</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {connections.map((profile) => {
                const MediaIcon = profile.latestPostType === 'audio'
                  ? Music2
                  : profile.latestPostType === 'video' || profile.latestPostType === 'reel'
                    ? Video
                    : profile.latestPostType === 'text'
                      ? FileText
                      : ImageIcon;
                const activityLabel = profile.latestPostType === 'audio'
                  ? 'تسجيل صوتي جديد'
                  : profile.latestPostType === 'video' || profile.latestPostType === 'reel'
                    ? 'فيديو جديد'
                    : profile.latestPostType === 'text'
                      ? 'كتابة جديدة'
                      : profile.latestPostType === 'image'
                        ? 'صورة جديدة'
                        : profile.followedByMe ? 'تتابعه' : 'يتابعك';

                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => navigate(`/profile/${profile.id}`)}
                    aria-label={`${profile.username}، ${activityLabel}، عرض الملف والمنشورات`}
                    className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center"
                  >
                    <span className={`relative block h-[66px] w-[66px] rounded-full p-[2.5px] transition-transform group-hover:scale-105 ${profile.hasRecentPost ? 'bg-gradient-to-tr from-rose-500 via-fuchsia-500 to-emerald-400' : 'bg-white/20'}`}>
                      <span className="flex h-full w-full items-center justify-center rounded-full bg-[#09090d] p-[2px]">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" loading="lazy" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center rounded-full bg-white/[0.08] text-lg font-semibold text-white/75">
                            {profile.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      {profile.hasRecentPost && (
                        <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-[#111116] text-rose-300 ring-2 ring-[#09090d]">
                          <MediaIcon className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-[11px] font-medium text-white/85">{profile.username}</span>
                    <span className={`w-full truncate text-[9px] ${profile.hasRecentPost ? 'text-emerald-300' : 'text-white/40'}`}>
                      {activityLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ================================= */}
        {/* POSTS */}
        {/* ================================= */}

        <section>

          <div className="flex items-center justify-between mb-4">

            <h2 className="text-base font-bold">
              المنشورات
            </h2>

            {loading && (
              <span className="text-[10px] text-neutral-500">
                تحديث...
              </span>
            )}

          </div>

          {feedError && posts.length === 0 ? (
            <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-6 text-center">
              <p className="text-sm text-rose-200">{feedError}</p>
              <button
                type="button"
                onClick={() => void loadFeed()}
                className="mt-4 rounded-full bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.14]"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-8 text-center">

              <p className="text-neutral-400 text-sm">
                ما كاين حتى منشور دابا
              </p>

              <button
                type="button"
                onClick={() =>
                  setIsModalOpen(
                    true
                  )
                }
                className="mt-4 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold"
              >
                إنشاء أول منشور
              </button>

            </div>
          ) : (
            <div className="space-y-5">

              {posts.map(
                (post) => (
                  <article
                    key={
                      post.id
                    }
                    className="rounded-2xl overflow-hidden bg-neutral-950 border border-white/10"
                  >

                    <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5" dir="rtl">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                      <p className="min-w-0 truncate text-[11px] text-white/60">
                        <span className="font-semibold text-white/85">{post.profiles?.username || 'مستخدم'}</span>
                        {' '}قام بإضافة منشور
                      </p>
                      <time className="mr-auto shrink-0 text-[10px] text-white/35">
                        {new Date(post.created_at).toLocaleDateString('ar-MA')}
                      </time>
                    </div>

                    {/* POST HEADER */}

                    <div className="flex items-center justify-between p-3">

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/profile/${post.user_id}`
                          )
                        }
                        className="flex items-center gap-3 min-w-0"
                      >

                        <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden shrink-0">

                          {post.profiles?.avatar_url ? (
                            <img
                              src={
                                post.profiles.avatar_url
                              }
                              alt={
                                post.profiles.username
                              }
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold">
                              {post.profiles?.username
                                ?.charAt(
                                  0
                                )
                                .toUpperCase() ||
                                'U'}
                            </div>
                          )}

                        </div>

                        <div className="text-left min-w-0">

                          <span className="text-sm font-bold truncate block">
                            {
                              post.profiles
                                ?.username ||
                              'مستخدم'
                            }
                          </span>

                          {post.profiles
                            ?.full_name && (
                            <span className="text-[10px] text-neutral-500 truncate block">
                              {
                                post.profiles
                                  .full_name
                              }
                            </span>
                          )}

                        </div>

                      </button>

                    </div>

                    {/* MEDIA */}

                    {renderPostMedia(
                      post
                    )}

                    {/* CAPTION */}

                    {post.caption &&
                      post.post_type !==
                        'text' && (
                        <div className="px-4 pt-3">

                          <p className="text-sm text-neutral-200 whitespace-pre-wrap">
                            {
                              post.caption
                            }
                          </p>

                        </div>
                      )}

                    {(post.caption?.length ?? 0) > 180 || post.video_url ? (
                      <PostSummarizer text={post.caption || ''} />
                    ) : null}

                    {/* ACTIONS */}

                    <div className="flex items-center gap-2 px-3 pt-3">

                      <button
                        type="button"
                        onClick={() =>
                          void handleToggleLike(
                            post
                          )
                        }
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition ${
                          post.user_has_liked
                            ? 'text-rose-500 bg-rose-500/10'
                            : 'text-neutral-300 bg-neutral-900'
                        }`}
                      >

                        <Heart
                          className="w-5 h-5"
                          fill={
                            post.user_has_liked
                              ? 'currentColor'
                              : 'none'
                          }
                        />

                        <span className="text-xs">
                          {
                            post.likes_count
                          }
                        </span>

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void toggleComments(
                            post.id
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-neutral-900 text-neutral-300"
                      >

                        <MessageCircle className="w-5 h-5" />

                        <span className="text-xs">
                          تعليق
                        </span>

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleShare(
                            post.id
                          )
                        }
                        className="ml-auto p-2 rounded-full bg-neutral-900 text-neutral-300"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>

                    </div>

                    {/* COMMENTS */}

                    {activePostId ===
                      post.id && (
                      <div className="mt-3 border-t border-white/10 p-3">

                        {loadingComments ? (
                          <p className="text-xs text-neutral-500 text-center py-3">
                            جاري تحميل التعليقات...
                          </p>
                        ) : (
                          <div className="space-y-3 max-h-60 overflow-y-auto">

                            {comments.length ===
                            0 ? (
                              <p className="text-xs text-neutral-500 text-center py-2">
                                لا توجد تعليقات بعد
                              </p>
                            ) : (
                              comments.map(
                                (
                                  comment
                                ) => (
                                  <div
                                    key={
                                      comment.id
                                    }
                                    className="flex gap-2"
                                  >

                                    <div className="w-7 h-7 rounded-full bg-neutral-800 shrink-0 overflow-hidden">

                                      {comment
                                        .profiles
                                        ?.avatar_url ? (
                                        <img
                                          src={
                                            comment
                                              .profiles
                                              .avatar_url
                                          }
                                          alt=""
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                                          {comment
                                            .profiles
                                            ?.username
                                            ?.charAt(
                                              0
                                            )
                                            .toUpperCase() ||
                                            'U'}
                                        </div>
                                      )}

                                    </div>

                                    <div className="bg-neutral-900 rounded-xl px-3 py-2 min-w-0">

                                      <p className="text-[11px] font-bold">
                                        {
                                          comment
                                            .profiles
                                            ?.username ||
                                          'مستخدم'
                                        }
                                      </p>

                                      <p className="text-xs text-neutral-300 break-words">
                                        {
                                          comment.content
                                        }
                                      </p>

                                    </div>

                                  </div>
                                )
                              )
                            )}

                          </div>
                        )}

                        {/* ADD COMMENT */}

                        <form
                          onSubmit={(
                            event
                          ) => {
                            event.preventDefault();

                            void handleAddComment(
                              post.id
                            );
                          }}
                          className="flex items-center gap-2 mt-3"
                        >

                          <input
                            value={
                              newComment
                            }
                            onChange={(
                              event
                            ) =>
                              setNewComment(
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="كتب تعليق..."
                            className="flex-1 min-w-0 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                          />

                          <button
                            type="submit"
                            disabled={
                              !newComment.trim()
                            }
                            className="w-9 h-9 rounded-xl bg-rose-500 disabled:opacity-40 flex items-center justify-center"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                        </form>

                      </div>
                    )}

                  </article>
                )
              )}

            </div>
          )}

        </section>

      </div>

      {/* CREATE POST MODAL */}

      <CreatePostModal
        isOpen={
          isModalOpen
        }
        onClose={() =>
          setIsModalOpen(
            false
          )
        }
        onPostCreated={() => {
          setIsModalOpen(
            false
          );

          /*
           * تحديث Feed
           */
          void loadFeed();
        }}
      />

    </div>
  );
        }
