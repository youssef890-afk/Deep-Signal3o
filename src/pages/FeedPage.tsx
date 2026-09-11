import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Loader2,
  Send,
  PlusCircle,
  Bell,
  Plus,
} from 'lucide-react';
import { CreatePostModal } from '@/components/CreatePostModal';

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

  profiles?: {
    username: string;
    avatar_url: string | null;
  };

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

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(null);

  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [loading, setLoading] = useState(true);

  // Create Post Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Comments
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    loadUserProfileAndPosts();
  }, [user]);

  async function loadUserProfileAndPosts() {
    setLoading(true);

    try {
      if (user) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', user.id)
          .single();

        if (myProfile) {
          setCurrentUserProfile(myProfile);
        }
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url');

      if (profilesData) {
        setActiveUsers(
          profilesData.filter((profile) => profile.id !== user?.id)
        );
      }

      const profilesMap = new Map(
        profilesData?.map((profile) => [profile.id, profile])
      );

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        throw postsError;
      }

      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('post_id, user_id');

      if (likesError) {
        throw likesError;
      }

      const formatted: Post[] = (postsData || []).map((post) => {
        const postLikes =
          likesData?.filter((like) => like.post_id === post.id) || [];

        const foundProfile = profilesMap.get(post.user_id);

        let mediaUrls: string[] = [];

        if (Array.isArray(post.media_urls)) {
          mediaUrls = post.media_urls;
        }

        return {
          id: post.id,
          user_id: post.user_id,

          image_url: post.image_url ?? null,
          video_url: post.video_url ?? null,
          caption: post.caption ?? null,
          created_at: post.created_at,

          post_type: post.post_type ?? 'image',
          background_style: post.background_style ?? null,
          media_urls: mediaUrls,
          video_type: post.video_type ?? null,

          profiles: {
            username: foundProfile?.username || 'مستخدم',
            avatar_url: foundProfile?.avatar_url ?? null,
          },

          likes_count: postLikes.length,

          user_has_liked: postLikes.some(
            (like) => like.user_id === user?.id
          ),
        };
      });

      setPosts(formatted);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleLike(post: Post) {
    if (!user) return;

    setPosts((prev) =>
      prev.map((item) => {
        if (item.id !== post.id) return item;

        return {
          ...item,
          user_has_liked: !item.user_has_liked,
          likes_count: item.user_has_liked
            ? item.likes_count - 1
            : item.likes_count + 1,
        };
      })
    );

    if (post.user_has_liked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing like:', error);

        setPosts((prev) =>
          prev.map((item) =>
            item.id === post.id
              ? {
                  ...item,
                  user_has_liked: true,
                  likes_count: item.likes_count + 1,
                }
              : item
          )
        );
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert([
          {
            post_id: post.id,
            user_id: user.id,
          },
        ]);

      if (error) {
        console.error('Error adding like:', error);

        setPosts((prev) =>
          prev.map((item) =>
            item.id === post.id
              ? {
                  ...item,
                  user_has_liked: false,
                  likes_count: Math.max(0, item.likes_count - 1),
                }
              : item
          )
        );
      }
    }
  }

  function handleShare(postId: string) {
    const url = `${window.location.origin}/#post-${postId}`;

    navigator.clipboard
      .writeText(url)
      .then(() => {
        alert('تم نسخ رابط المنشور بنجاح!');
      })
      .catch((error) => {
        console.error('Error copying post URL:', error);
        alert('تعذر نسخ رابط المنشور.');
      });
  }

  async function toggleComments(postId: string) {
    if (activePostId === postId) {
      setActivePostId(null);
      return;
    }

    setActivePostId(postId);
    setLoadingComments(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleAddComment(postId: string) {
    if (!newComment.trim() || !user) return;

    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
        },
      ])
      .select('*, profiles(username, avatar_url)')
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data]);
      setNewComment('');
    } else if (error) {
      console.error('Error adding comment:', error);
    }
  }

  function getTextBackground(style?: string | null) {
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

  function renderPostMedia(post: Post) {
    const mediaUrls =
      post.media_urls && post.media_urls.length > 0
        ? post.media_urls
        : post.image_url
        ? [post.image_url]
        : [];

    // TEXT
    if (post.post_type === 'text') {
      return (
        <div
          className={`min-h-[260px] flex items-center justify-center p-8 text-center ${getTextBackground(
            post.background_style
          )}`}
        >
          <p className="text-white text-xl font-bold leading-relaxed whitespace-pre-wrap">
            {post.caption}
          </p>
        </div>
      );
    }

    // MULTIPLE IMAGES
    if (mediaUrls.length > 1) {
      return (
        <div className="grid grid-cols-2 gap-1 bg-black">
          {mediaUrls.map((url, index) => (
            <img
              key={`${url}-${index}`}
              src={url}
              alt={`Post ${index + 1}`}
              className="w-full aspect-square object-cover"
            />
          ))}
        </div>
      );
    }

    // SINGLE IMAGE
    if (mediaUrls.length === 1) {
      return (
        <div className="w-full bg-neutral-950">
          <img
            src={mediaUrls[0]}
            alt="Post"
            className="w-full max-h-[500px] object-contain"
          />
        </div>
      );
    }

    // VIDEO / REEL
    if (post.video_url) {
      return (
        <div className="w-full bg-black">
          <video
            src={post.video_url}
            controls
            playsInline
            className="w-full max-h-[600px] object-contain"
          />
        </div>
      );
    }

    return null;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 text-white min-h-screen bg-black">

      {/* HEADER */}
      <header className="flex items-center justify-between py-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-3">

          <div
            onClick={() => navigate(`/profile/${user?.id}`)}
            className="relative cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-rose-500 via-purple-500 to-amber-500">

              {currentUserProfile?.avatar_url ? (
                <img
                  src={currentUserProfile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-full border border-black"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-bold text-sm">
                  {currentUserProfile?.username
                    ?.charAt(0)
                    .toUpperCase() || 'U'}
                </div>
              )}

            </div>

            <span
              onClick={(event) => {
                event.stopPropagation();
                setIsModalOpen(true);
              }}
              className="absolute -bottom-1 -left-1 bg-rose-500 text-white rounded-full p-0.5 border-2 border-black"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold">
                {currentUserProfile?.username || 'مستخدم'}
              </span>
              <span className="text-xs">🇲🇦</span>
            </div>

            <span className="text-[10px] text-neutral-400">
              مرحباً بك مجدداً
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setHasUnreadNotifications(false);
            navigate('/notifications');
          }}
          className="relative p-2.5 rounded-full bg-neutral-900 border border-white/10"
        >
          <Bell className="w-5 h-5" />

          {hasUnreadNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-black animate-pulse" />
          )}
        </button>
      </header>

      {/* STORIES */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide border-b border-white/5">

        <div
          onClick={() => setIsModalOpen(true)}
          className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
        >
          <div className="relative w-14 h-14 rounded-full p-[2px] bg-neutral-800 border border-dashed border-rose-500/50 flex items-center justify-center">

            {currentUserProfile?.avatar_url ? (
              <img
                src={currentUserProfile.avatar_url}
                className="w-full h-full object-cover rounded-full opacity-80"
                alt="قصتك"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-xs font-bold">
                {currentUserProfile?.username?.charAt(0)}
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
              <Plus className="w-5 h-5 text-rose-500" />
            </div>
          </div>

          <span className="text-[10px] text-neutral-400">
            قصتك
          </span>
        </div>

        {activeUsers.map((profile) => (
          <div
            key={profile.id}
            onClick={() => navigate(`/profile/${profile.id}`)}
            className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
          >
            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">

              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover rounded-full border border-black"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-bold text-xs border border-black">
                  {profile.username?.charAt(0).toUpperCase()}
                </div>
              )}

            </div>

            <span className="text-[10px] text-neutral-300 font-medium max-w-[60px] truncate">
              {profile.username}
            </span>
          </div>
        ))}
      </div>

      {/* CREATE POST BUTTON */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full mb-6 py-3 px-4 bg-neutral-900 border border-white/10 hover:border-rose-500/50 rounded-2xl flex items-center justify-between text-neutral-400 text-xs shadow-lg"
      >
        <span className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-rose-500" />
          ماذا يدور في ذهنك اليوم؟
        </span>

        <span className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-xl font-semibold text-[11px]">
          + منشور / ريلز
        </span>
      </button>

      {/* NEW CREATE POST MODAL */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={loadUserProfileAndPosts}
      />

      {/* FEED */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          ما كاين حتى منشور دابا.
        </div>
      ) : (
        <div className="space-y-4">

          {posts.map((post) => (
            <div
              key={post.id}
              id={`post-${post.id}`}
              className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden"
            >

              {/* POST HEADER */}
              <div className="p-3 flex items-center justify-between border-b border-white/5">
                <div
                  onClick={() => navigate(`/profile/${post.user_id}`)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 p-[1.5px]">

                    {post.profiles?.avatar_url ? (
                      <img
                        src={post.profiles.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover rounded-full border border-black"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-bold text-xs">
                        {post.profiles?.username
                          ?.charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                  </div>

                  <div>
                    <h3 className="text-xs font-bold">
                      {post.profiles?.username || 'مستخدم'}
                    </h3>

                    <p className="text-[10px] text-neutral-500">
                      {new Date(post.created_at).toLocaleDateString('ar-MA')}
                    </p>
                  </div>
                </div>
              </div>

              {/* CAPTION FOR IMAGE / VIDEO */}
              {post.caption && post.post_type !== 'text' && (
                <p className="p-3 text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap">
                  {post.caption}
                </p>
              )}

              {/* MEDIA */}
              {renderPostMedia(post)}

              {/* ACTIONS */}
              <div className="p-3 flex items-center justify-between border-t border-white/5 text-neutral-400 text-xs">

                <button
                  onClick={() => handleToggleLike(post)}
                  className={`flex items-center gap-1.5 ${
                    post.user_has_liked
                      ? 'text-rose-500 font-bold'
                      : 'hover:text-white'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      post.user_has_liked ? 'fill-rose-500' : ''
                    }`}
                  />

                  <span>{post.likes_count} إعجاب</span>
                </button>

                <button
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-1.5 hover:text-white"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تعليق</span>
                </button>

                <button
                  onClick={() => handleShare(post.id)}
                  className="flex items-center gap-1.5 hover:text-white"
                >
                  <Share2 className="w-4 h-4" />
                  <span>مشاركة</span>
                </button>

              </div>

              {/* COMMENTS */}
              {activePostId === post.id && (
                <div className="bg-neutral-950 p-3 border-t border-white/10 space-y-3">

                  {loadingComments ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">

                      {comments.length === 0 ? (
                        <p className="text-[11px] text-neutral-500 text-center py-2">
                          لا توجد تعليقات بعد. كن أول من يعلق!
                        </p>
                      ) : (
                        comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="bg-neutral-900 p-2 rounded-xl text-xs flex items-start gap-2"
                          >
                            <div
                              onClick={() =>
                                navigate(`/profile/${comment.user_id}`)
                              }
                              className="w-6 h-6 rounded-full bg-neutral-800 shrink-0 cursor-pointer overflow-hidden"
                            >
                              {comment.profiles?.avatar_url ? (
                                <img
                                  src={comment.profiles.avatar_url}
                                  alt={comment.profiles.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="flex items-center justify-center h-full text-[10px] font-bold">
                                  {comment.profiles?.username?.charAt(0)}
                                </span>
                              )}
                            </div>

                            <div>
                              <span
                                onClick={() =>
                                  navigate(`/profile/${comment.user_id}`)
                                }
                                className="font-bold text-rose-400 block text-[11px] cursor-pointer"
                              >
                                {comment.profiles?.username || 'مستخدم'}
                              </span>

                              <span className="text-neutral-200">
                                {comment.content}
                              </span>
                            </div>
                          </div>
                        ))
                      )}

                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="اكتب تعليقاً..."
                      className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />

                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-xl"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              )}

            </div>
          ))}

        </div>
      )}
    </div>
  );
                  }
