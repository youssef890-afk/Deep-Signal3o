import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, Loader2, Send,
  ImagePlus, X, PlusCircle, Bell, Plus, Video
} from 'lucide-react';

interface Post {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  created_at: string;
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
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Comments State
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
        setActiveUsers(profilesData.filter((p) => p.id !== user?.id));
      }

      const profilesMap = new Map(
        profilesData?.map((p) => [p.id, p])
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

        return {
          id: post.id,
          user_id: post.user_id,
          image_url: post.image_url ?? null,
          video_url: post.video_url ?? null,
          caption: post.caption ?? null,
          created_at: post.created_at,
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
    } catch (err) {
      console.error('Error loading feed:', err);
    } finally {
      setLoading(false);
    }
  }

  // Toggle Like
  async function handleToggleLike(post: Post) {
    if (!user) return;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === post.id) {
          return {
            ...p,
            user_has_liked: !p.user_has_liked,
            likes_count: p.user_has_liked
              ? p.likes_count - 1
              : p.likes_count + 1,
          };
        }

        return p;
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
          prev.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  user_has_liked: true,
                  likes_count: p.likes_count + 1,
                }
              : p
          )
        );
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert([{ post_id: post.id, user_id: user.id }]);

      if (error) {
        console.error('Error adding like:', error);

        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  user_has_liked: false,
                  likes_count: Math.max(0, p.likes_count - 1),
                }
              : p
          )
        );
      }
    }
  }

  // Share Post
  function handleShare(postId: string) {
    const url = `${window.location.origin}/#post-${postId}`;

    navigator.clipboard
      .writeText(url)
      .then(() => {
        alert('تم نسخ رابط المنشور بنجاح!');
      })
      .catch((err) => {
        console.error('Error copying post URL:', err);
        alert('تعذر نسخ رابط المنشور.');
      });
  }

  // Load Comments
  async function toggleComments(postId: string) {
    if (activePostId === postId) {
      setActivePostId(null);
      return;
    }

    setActivePostId(postId);
    setLoadingComments(true);

    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      setComments(commentsData || []);
    } catch (err) {
      console.error('Error loading comments:', err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }

  // Add Comment
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

  // اختيار ملف (صورة أو فيديو)
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    setSelectedFile(file);
    setIsVideo(file.type.startsWith('video/'));
    setPreviewUrl(URL.createObjectURL(file));
  }

  // إنشاء منشور أو ريلز جديد
  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();

    if (!caption.trim() && !selectedFile) return;

    if (!user) {
      alert('خاصك تكون مسجل الدخول باش تنشر.');
      return;
    }

    setUploading(true);

    let finalImageUrl: string | null = null;
    let finalVideoUrl: string | null = null;

    try {
      if (selectedFile) {
        const fileExt =
          selectedFile.name.split('.').pop()?.toLowerCase() || 'bin';

        const fileName = `${Date.now()}.${fileExt}`;

        // Storage RLS كيتوقع user.id يكون هو المجلد الأول
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        if (isVideo) {
          finalVideoUrl = publicUrlData.publicUrl;
        } else {
          finalImageUrl = publicUrlData.publicUrl;
        }
      }

      const { error: insertError } = await supabase
        .from('posts')
        .insert([
          {
            user_id: user.id,
            caption: caption.trim() || null,
            image_url: finalImageUrl,
            video_url: finalVideoUrl,
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      setCaption('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsVideo(false);
      setIsModalOpen(false);

      await loadUserProfileAndPosts();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'خطأ غير معروف';

      console.error('Error creating post:', err);
      alert('خطأ أثناء النشر: ' + message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 text-white min-h-screen bg-black">

      {/* 1. القسم العلوي (Header) */}
      <header className="flex items-center justify-between py-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            onClick={() => navigate(`/profile/${user?.id}`)}
            className="relative cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-rose-500 via-purple-500 to-amber-500">
              {currentUserProfile?.avatar_url ? (
                <img
                  src={currentUserProfile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-full border border-black"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-bold text-sm text-white">
                  {currentUserProfile?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>

            <span
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="absolute -bottom-1 -left-1 bg-rose-500 text-white rounded-full p-0.5 border-2 border-black hover:scale-110 transition-transform"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-wide">
                {currentUserProfile?.username || 'مستخدم'}
              </span>
              <span className="text-xs">🇲🇦</span>
            </div>

            <span className="text-[10px] text-neutral-400">
              مرحباً بك مجدداً
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setHasUnreadNotifications(false);
              navigate('/notifications');
            }}
            className="relative p-2.5 rounded-full bg-neutral-900 border border-white/10 hover:border-white/20 transition-all text-neutral-200"
          >
            <Bell className="w-5 h-5" />

            {hasUnreadNotifications && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-black animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* 2. شريط القصص (Stories Tray) */}
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

          <span className="text-[10px] text-neutral-400 font-medium">
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
                <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-bold text-xs text-white border border-black">
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

      {/* 3. زر إطلاق نافذة النشر */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full mb-6 py-3 px-4 bg-neutral-900 border border-white/10 hover:border-rose-500/50 rounded-2xl flex items-center justify-between text-neutral-400 text-xs shadow-lg transition-all"
      >
        <span className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-rose-500" />
          ماذا يدور في ذهنك اليوم؟
        </span>

        <span className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-xl font-semibold text-[11px]">
          + منشور / ريلز
        </span>
      </button>

      {/* Modal - نافذة النشر الانبثاقية */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md p-4 relative shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <h3 className="text-sm font-bold text-white">
                إنشاء منشور / ريلز جديد
              </h3>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="اكتب موضوع المنشور أو وصف الفيديو..."
                className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 resize-none h-24"
              />

              {previewUrl && (
                <div className="relative w-full h-48 bg-neutral-950 rounded-xl overflow-hidden border border-white/10">
                  {isVideo ? (
                    <video
                      src={previewUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setIsVideo(false);
                    }}
                    className="absolute top-2 right-2 bg-black/80 p-1.5 rounded-full text-white z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-neutral-950 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs text-neutral-300">
                  <Video className="w-4 h-4 text-rose-500" />
                  <ImagePlus className="w-4 h-4 text-amber-500" />

                  <span>
                    {selectedFile
                      ? 'تغيير الملف'
                      : 'صورة أو فيديو (Reels)'}
                  </span>

                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    uploading ||
                    (!caption.trim() && !selectedFile)
                  }
                  className="flex items-center gap-1.5 px-5 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}

                  نشر الآن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. قائمة المنشورات (Feed List) */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              id={`post-${post.id}`}
              className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="p-3 flex items-center justify-between border-b border-white/5">
                <div
                  onClick={() => navigate(`/profile/${post.user_id}`)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 p-[1.5px]">
                    {post.profiles?.avatar_url ? (
                      <img
                        src={post.profiles.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover rounded-full border border-black"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-bold text-xs text-white">
                        {post.profiles?.username
                          ?.charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold group-hover:text-rose-400 transition-colors">
                      {post.profiles?.username}
                    </h3>

                    <p className="text-[10px] text-neutral-500">
                      {new Date(post.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>
              </div>

              {post.caption && (
                <p className="p-3 text-xs text-neutral-200 leading-relaxed">
                  {post.caption}
                </p>
              )}

              {post.image_url && (
                <div className="w-full bg-neutral-950">
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full max-h-96 object-contain"
                  />
                </div>
              )}

              {post.video_url && (
                <div className="w-full bg-neutral-950">
                  <video
                    src={post.video_url}
                    controls
                    className="w-full max-h-96 object-contain"
                  />
                </div>
              )}

              <div className="p-3 flex items-center justify-between border-t border-white/5 text-neutral-400 text-xs">
                <button
                  onClick={() => handleToggleLike(post)}
                  className={`flex items-center gap-1.5 transition-colors ${
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
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تعليق</span>
                </button>

                <button
                  onClick={() => handleShare(post.id)}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>مشاركة</span>
                </button>
              </div>

              {activePostId === post.id && (
                <div className="bg-neutral-950 p-3 border-t border-white/10 space-y-3">
                  {loadingComments ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
                              className="w-6 h-6 rounded-full bg-neutral-800 shrink-0 cursor-pointer overflow-hidden mt-0.5"
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
                                className="font-bold text-rose-400 block text-[11px] cursor-pointer hover:underline"
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
