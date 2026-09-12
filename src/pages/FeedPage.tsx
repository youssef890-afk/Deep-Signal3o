import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  Plus,
  Search,
} from 'lucide-react';
import { CreatePostModal } from '@/components/CreatePostModal';

interface UserProfile {
  id: string;
  username: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
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
  posts: Post[];
  currentUserProfile: UserProfile | null;
  activeUsers: UserProfile[];
} | null = null;

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>(
    feedCache?.posts || []
  );

  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(
      feedCache?.currentUserProfile || null
    );

  const [activeUsers, setActiveUsers] = useState<UserProfile[]>(
    feedCache?.activeUsers || []
  );

  const [loading, setLoading] = useState(
    !feedCache?.posts.length
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

  useEffect(() => {
    if (!user) return;

    void loadFeed();
  }, [user]);

  async function loadFeed() {
    if (!user) return;

    /*
     * إلا كان عندنا Cache:
     * نخلي البيانات تبان مباشرة
     * ونحدثها فالخلفية.
     */
    if (!feedCache?.posts.length) {
      setLoading(true);
    }

    try {
      /*
       * أولاً:
       * نجيب المستخدم الحالي.
       *
       * ثانياً:
       * نجيب المنشورات.
       *
       * بجوج في نفس الوقت.
       */
      const [
        myProfileResult,
        postsResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'id, username, full_name, bio, avatar_url'
          )
          .eq('id', user.id)
          .maybeSingle(),

        supabase
          .from('posts')
          .select(
            `
              id,
              user_id,
              image_url,
              video_url,
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
          .limit(30),
      ]);

      if (myProfileResult.error) {
        console.error(
          'Current profile error:',
          myProfileResult.error
        );
      }

      if (postsResult.error) {
        throw postsResult.error;
      }

      const myProfile =
        myProfileResult.data || null;

      const postsData =
        postsResult.data || [];

      setCurrentUserProfile(myProfile);

      /*
       * ---------------------------------------
       * جلب Profiles ديال أصحاب المنشورات
       * ---------------------------------------
       *
       * بدل profiles.limit(20)
       * كنجيبو غير IDs ديال الناس اللي عندهم
       * منشورات ظاهرة.
       *
       * هكذا حتى الحساب رقم 100 يقدر يبان
       * فـ Feed إلا كان عندو Post.
       */
      const postUserIds = [
        ...new Set(
          postsData.map(
            (post) => post.user_id
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
       * جلب Users للاقتراحات
       * ---------------------------------------
       */
      const activeUsersResult = await supabase
        .from('profiles')
        .select(
          'id, username, full_name, bio, avatar_url'
        )
        .neq('id', user.id)
        .limit(6);

      if (activeUsersResult.error) {
        console.error(
          'Active users error:',
          activeUsersResult.error
        );
      }

      const otherUsers =
        activeUsersResult.data || [];

      setActiveUsers(otherUsers);

      /*
       * Map ديال Profiles
       */
      const profilesMap = new Map<
        string,
        UserProfile
      >();

      for (const profile of postProfiles) {
        profilesMap.set(
          profile.id,
          profile
        );
      }

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
       * تجميع Likes لكل Post
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
                post.media_urls;
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
               * هنا أهم إصلاح:
               * Profile ديال صاحب Post
               */
              profiles:
                profile || {
                  id: post.user_id,
                  username:
                    'مستخدم',
                  full_name: null,
                  bio: null,
                  avatar_url:
                    null,
                },

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
        posts:
          formattedPosts,

        currentUserProfile:
          myProfile,

        activeUsers:
          otherUsers,
      };
    } catch (error) {
      console.error(
        'Error loading feed:',
        error
      );
    } finally {
      setLoading(false);
    }
  }

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
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-md mx-auto px-4 py-4">

          <div className="h-12 w-40 bg-neutral-900 rounded-xl animate-pulse mb-6" />

          <div className="h-20 bg-neutral-900 rounded-2xl animate-pulse mb-4" />

          <div className="h-80 bg-neutral-900 rounded-2xl animate-pulse" />

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">

      <div className="max-w-md mx-auto px-4 pt-4 pb-28">

        {/* ================================= */}
        {/* HEADER */}
        {/* ================================= */}

        <header className="flex items-center justify-between mb-5">

          {/* USER PROFILE */}

          <button
            type="button"
            onClick={() => {
              if (user) {
                navigate(
                  `/profile/${user.id}`
                );
              }
            }}
            className="flex items-center gap-3 min-w-0"
          >
            <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-rose-500 via-purple-500 to-amber-500 shrink-0">

              {currentUserProfile?.avatar_url ? (
                <img
                  src={
                    currentUserProfile.avatar_url
                  }
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover border-2 border-black"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-bold">
                  {currentUserProfile?.username
                    ?.charAt(0)
                    .toUpperCase() ||
                    'U'}
                </div>
              )}

            </div>

            <div className="text-left min-w-0">

              <p className="text-sm font-bold truncate">
                {
                  currentUserProfile?.username ||
                  'مستخدم'
                }
              </p>

              <p className="text-xs text-neutral-500 truncate">
                {currentUserProfile?.full_name ||
                  'الصفحة الرئيسية'}
              </p>

            </div>
          </button>

          {/* HEADER ACTIONS */}

          <div className="flex items-center gap-2">

            {/* SEARCH */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/search'
                )
              }
              aria-label="البحث"
              className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center hover:bg-neutral-800 transition"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* CREATE */}

            <button
              type="button"
              onClick={() =>
                setIsModalOpen(
                  true
                )
              }
              aria-label="إنشاء منشور"
              className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center hover:bg-neutral-800 transition"
            >
              <Plus className="w-5 h-5" />
            </button>

          </div>

        </header>

        {/* ================================= */}
        {/* USER SUGGESTIONS */}
        {/* ================================= */}

        {activeUsers.length >
          0 && (
          <section className="mb-6">

            <div className="flex items-center justify-between mb-3">

              <h2 className="text-sm font-bold">
                أشخاص قد تعرفهم
              </h2>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/search'
                  )
                }
                className="text-xs text-rose-500"
              >
                البحث عن أشخاص
              </button>

            </div>

            <div className="grid grid-cols-3 gap-3">

              {activeUsers
                .slice(0, 6)
                .map(
                  (
                    profile
                  ) => (
                    <button
                      key={
                        profile.id
                      }
                      type="button"
                      onClick={() =>
                        navigate(
                          `/profile/${profile.id}`
                        )
                      }
                      className="bg-neutral-950 border border-white/10 rounded-2xl p-3 text-center hover:bg-neutral-900 transition"
                    >

                      <div className="w-12 h-12 mx-auto mb-2 rounded-full p-[2px] bg-gradient-to-tr from-rose-500 to-purple-600">

                        {profile.avatar_url ? (
                          <img
                            src={
                              profile.avatar_url
                            }
                            alt={
                              profile.username
                            }
                            loading="lazy"
                            className="w-full h-full rounded-full object-cover border-2 border-black"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center font-bold text-sm">
                            {profile.username
                              ?.charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>
                        )}

                      </div>

                      <p className="text-xs font-semibold truncate">
                        {
                          profile.username
                        }
                      </p>

                      <span className="block mt-2 text-[10px] text-rose-500">
                        عرض الملف
                      </span>

                    </button>
                  )
                )}

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

          {posts.length ===
          0 ? (
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
