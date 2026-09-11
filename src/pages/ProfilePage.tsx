import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

import {
  UserPlus,
  UserCheck,
  MessageSquare,
  Camera,
  Loader2,
  Edit3,
  X,
  Check,
  Grid,
  LogOut,
} from 'lucide-react';

interface ProfileData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  display_id: string;
}

interface PostData {
  id: string;
  image_url: string | null;
  caption: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const targetUserId = userId || user?.id;
  const isOwnProfile = user?.id === targetUserId;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userPosts, setUserPosts] = useState<PostData[]>([]);

  const [loading, setLoading] = useState(true);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // ============================================
  // تحميل معلومات البروفايل
  // ============================================

  const loadProfileData = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // جلب البروفايل
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profErr) {
        throw profErr;
      }

      const profileData = prof as ProfileData;

      setProfile(profileData);
      setFullName(profileData.full_name || '');
      setBio(profileData.bio || '');

      // جلب منشورات المستخدم
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, image_url, caption, created_at')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (postsError) {
        throw postsError;
      }

      setUserPosts((posts as PostData[]) || []);

      // عدد المتابعين
      const {
        count: followersCountResult,
        error: followersError,
      } = await supabase
        .from('follows')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('following_id', targetUserId);

      if (followersError) {
        throw followersError;
      }

      setFollowersCount(followersCountResult || 0);

      // عدد الذين يتابعهم المستخدم
      const {
        count: followingCountResult,
        error: followingError,
      } = await supabase
        .from('follows')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('follower_id', targetUserId);

      if (followingError) {
        throw followingError;
      }

      setFollowingCount(followingCountResult || 0);

      // واش المستخدم الحالي متابع هاد الشخص؟
      if (user && !isOwnProfile) {
        const {
          data: followingData,
          error: followingCheckError,
        } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();

        if (followingCheckError) {
          throw followingCheckError;
        }

        setIsFollowing(Boolean(followingData));
      } else {
        setIsFollowing(false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user, isOwnProfile]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  // ============================================
  // تسجيل الخروج
  // ============================================

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await signOut();

      // نرجعو مباشرة لصفحة Login
      navigate('/login', {
        replace: true,
      });
    } catch (error) {
      console.error('Logout error:', error);

      alert(
        'وقع مشكل أثناء تسجيل الخروج. حاول مرة أخرى.'
      );
    } finally {
      setLoggingOut(false);
    }
  }

  // ============================================
  // Follow / Unfollow
  // ============================================

  async function handleToggleFollow() {
    if (
      !user ||
      !targetUserId ||
      isOwnProfile ||
      followLoading
    ) {
      return;
    }

    setFollowLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) {
          throw error;
        }

        setIsFollowing(false);

        setFollowersCount((previousCount) =>
          Math.max(0, previousCount - 1)
        );
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });

        if (error) {
          throw error;
        }

        setIsFollowing(true);

        setFollowersCount(
          (previousCount) => previousCount + 1
        );
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  }

  // ============================================
  // تغيير صورة البروفايل
  // ============================================

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file || !user) {
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExtension =
        file.name.split('.').pop() || 'jpg';

      const fileName =
        `${user.id}_avatar.${fileExtension}`;

      const { error: uploadError } =
        await supabase.storage
          .from('avatars')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

      const avatarUrl =
        publicUrlData.publicUrl;

      const { error: updateError } =
        await supabase
          .from('profiles')
          .update({
            avatar_url: avatarUrl,
          })
          .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile((previousProfile) =>
        previousProfile
          ? {
              ...previousProfile,
              avatar_url: avatarUrl,
            }
          : null
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'حدث خطأ غير معروف';

      alert(
        'خطأ في تحميل الصورة: ' + message
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  // ============================================
  // تعديل البروفايل
  // ============================================

  async function handleUpdateProfile() {
    if (!user) {
      return;
    }

    try {
      const newFullName =
        fullName.trim();

      const newBio =
        bio.trim();

      const { error } =
        await supabase
          .from('profiles')
          .update({
            full_name:
              newFullName || null,

            bio:
              newBio || null,
          })
          .eq('id', user.id);

      if (error) {
        throw error;
      }

      setProfile((previousProfile) =>
        previousProfile
          ? {
              ...previousProfile,

              full_name:
                newFullName || null,

              bio:
                newBio || null,
            }
          : null
      );

      setFullName(newFullName);
      setBio(newBio);

      setIsEditing(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'حدث خطأ غير معروف';

      alert(
        'خطأ أثناء التحديث: ' + message
      );
    }
  }

  // ============================================
  // Loading
  // ============================================

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2
          className="w-8 h-8 animate-spin text-rose-500"
        />
      </div>
    );
  }

  // ============================================
  // Profile غير موجود
  // ============================================

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-neutral-500">
        الملف الشخصي غير موجود
      </div>
    );
  }

  // ============================================
  // الصفحة
  // ============================================

  return (
    <div
      className="
        max-w-xl
        mx-auto
        px-4
        py-6
        pb-28
        text-white
        space-y-6
      "
    >

      {/* ======================================
          Header
      ====================================== */}

      <div
        className="
          flex
          items-center
          justify-between
          mb-2
        "
      >
        <h1 className="text-lg font-bold">
          الملف الشخصي
        </h1>

        {isOwnProfile && (
          <button
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="
              flex
              items-center
              gap-2
              px-4
              py-2
              rounded-xl
              bg-red-500/10
              border
              border-red-500/30
              text-red-400
              hover:bg-red-500/20
              transition-colors
              disabled:opacity-50
            "
          >
            {loggingOut ? (
              <Loader2
                className="w-4 h-4 animate-spin"
              />
            ) : (
              <LogOut
                className="w-4 h-4"
              />
            )}

            <span className="text-xs font-bold">
              {loggingOut
                ? 'جاري الخروج...'
                : 'تسجيل الخروج'}
            </span>
          </button>
        )}
      </div>

      {/* ======================================
          Profile Card
      ====================================== */}

      <div
        className="
          bg-neutral-900
          border
          border-white/10
          rounded-2xl
          p-5
          shadow-xl
        "
      >

        {/* معلومات المستخدم */}

        <div className="flex items-center gap-4">

          {/* Avatar */}

          <div className="relative">

            <div
              className="
                w-20
                h-20
                rounded-full
                bg-rose-500/20
                border-2
                border-rose-500/50
                flex
                items-center
                justify-center
                font-bold
                text-2xl
                overflow-hidden
              "
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="
                    w-full
                    h-full
                    object-cover
                  "
                />
              ) : (
                profile.username
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>

            {/* تغيير الصورة */}

            {isOwnProfile && (
              <label
                className="
                  absolute
                  bottom-0
                  right-0
                  bg-rose-500
                  hover:bg-rose-600
                  p-1.5
                  rounded-full
                  cursor-pointer
                  shadow-lg
                "
              >
                {uploadingAvatar ? (
                  <Loader2
                    className="
                      w-3.5
                      h-3.5
                      animate-spin
                      text-white
                    "
                  />
                ) : (
                  <Camera
                    className="
                      w-3.5
                      h-3.5
                      text-white
                    "
                  />
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* الاسم */}

          <div className="flex-1 min-w-0">

            <div className="flex items-center gap-2">

              <h1
                className="
                  text-base
                  font-bold
                  text-white
                  truncate
                "
              >
                {profile.full_name ||
                  profile.username}
              </h1>

              <span
                className="
                  bg-rose-500/10
                  text-rose-400
                  text-[10px]
                  px-2
                  py-0.5
                  rounded-full
                  font-mono
                "
              >
                #{profile.display_id}
              </span>

            </div>

            <p
              className="
                text-xs
                text-neutral-400
              "
            >
              @{profile.username}
            </p>

            {profile.bio && (
              <p
                className="
                  text-xs
                  text-neutral-300
                  mt-2
                  leading-relaxed
                "
              >
                {profile.bio}
              </p>
            )}

          </div>
        </div>

        {/* ==================================
            Stats
        ================================== */}

        <div
          className="
            grid
            grid-cols-3
            gap-2
            mt-5
            pt-4
            border-t
            border-white/10
            text-center
          "
        >

          <div>
            <span
              className="
                block
                text-sm
                font-bold
                text-white
              "
            >
              {userPosts.length}
            </span>

            <span
              className="
                text-[10px]
                text-neutral-400
              "
            >
              منشورات
            </span>
          </div>

          <div>
            <span
              className="
                block
                text-sm
                font-bold
                text-white
              "
            >
              {followersCount}
            </span>

            <span
              className="
                text-[10px]
                text-neutral-400
              "
            >
              متابعون
            </span>
          </div>

          <div>
            <span
              className="
                block
                text-sm
                font-bold
                text-white
              "
            >
              {followingCount}
            </span>

            <span
              className="
                text-[10px]
                text-neutral-400
              "
            >
              متابَعون
            </span>
          </div>

        </div>

        {/* ==================================
            Buttons
        ================================== */}

        <div
          className="
            flex
            gap-2
            mt-4
          "
        >

          {isOwnProfile ? (
            <button
              onClick={() =>
                setIsEditing(
                  (previous) => !previous
                )
              }
              className="
                flex-1
                bg-neutral-800
                hover:bg-neutral-700
                py-2.5
                rounded-xl
                text-xs
                font-semibold
                flex
                items-center
                justify-center
                gap-2
                border
                border-white/10
              "
            >
              <Edit3
                className="
                  w-4
                  h-4
                  text-rose-400
                "
              />

              تعديل الملف الشخصي
            </button>
          ) : (
            <>
              <button
                onClick={() =>
                  void handleToggleFollow()
                }
                disabled={followLoading}
                className={`
                  flex-1
                  py-2.5
                  rounded-xl
                  text-xs
                  font-semibold
                  flex
                  items-center
                  justify-center
                  gap-2
                  transition-all

                  ${
                    isFollowing
                      ? `
                        bg-neutral-800
                        text-neutral-300
                        border
                        border-white/10
                      `
                      : `
                        bg-rose-500
                        hover:bg-rose-600
                        text-white
                      `
                  }
                `}
              >

                {followLoading ? (
                  <Loader2
                    className="
                      w-4
                      h-4
                      animate-spin
                    "
                  />
                ) : isFollowing ? (
                  <>
                    <UserCheck
                      className="
                        w-4
                        h-4
                        text-green-400
                      "
                    />

                    مُتابع
                  </>
                ) : (
                  <>
                    <UserPlus
                      className="w-4 h-4"
                    />

                    متابعة
                  </>
                )}

              </button>

              <button
                onClick={() =>
                  navigate(
                    `/chat/${targetUserId}`
                  )
                }
                className="
                  bg-neutral-800
                  hover:bg-neutral-700
                  px-4
                  py-2.5
                  rounded-xl
                  text-xs
                  font-semibold
                  flex
                  items-center
                  justify-center
                  gap-1.5
                  border
                  border-white/10
                "
              >
                <MessageSquare
                  className="
                    w-4
                    h-4
                    text-rose-400
                  "
                />

                رسالة
              </button>
            </>
          )}

        </div>
      </div>

      {/* ======================================
          Edit Profile
      ====================================== */}

      {isEditing && isOwnProfile && (
        <div
          className="
            bg-neutral-900
            border
            border-white/10
            rounded-2xl
            p-4
            space-y-4
          "
        >

          <div
            className="
              flex
              justify-between
              items-center
              pb-2
              border-b
              border-white/10
            "
          >
            <span
              className="
                text-xs
                font-bold
                text-white
              "
            >
              تعديل المعلومات
            </span>

            <button
              onClick={() =>
                setIsEditing(false)
              }
              className="
                text-neutral-400
                hover:text-white
              "
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* الاسم */}

          <div className="space-y-2">

            <label
              className="
                text-[10px]
                text-neutral-400
                block
              "
            >
              الاسم الكامل
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) =>
                setFullName(
                  event.target.value
                )
              }
              className="
                w-full
                bg-neutral-950
                border
                border-white/10
                rounded-xl
                px-3
                py-2.5
                text-xs
                text-white
                focus:outline-none
                focus:border-rose-500
              "
            />

          </div>

          {/* Bio */}

          <div className="space-y-2">

            <label
              className="
                text-[10px]
                text-neutral-400
                block
              "
            >
              السيرة الذاتية
            </label>

            <textarea
              value={bio}
              onChange={(event) =>
                setBio(
                  event.target.value
                )
              }
              className="
                w-full
                bg-neutral-950
                border
                border-white/10
                rounded-xl
                px-3
                py-2.5
                text-xs
                text-white
                focus:outline-none
                focus:border-rose-500
                resize-none
                h-24
              "
            />

          </div>

          {/* Save */}

          <button
            onClick={() =>
              void handleUpdateProfile()
            }
            className="
              w-full
              bg-rose-500
              hover:bg-rose-600
              py-2.5
              rounded-xl
              text-xs
              font-bold
              flex
              items-center
              justify-center
              gap-2
              text-white
            "
          >
            <Check className="w-4 h-4" />

            حفظ التغييرات
          </button>

        </div>
      )}

      {/* ======================================
          Posts
      ====================================== */}

      <div
        className="
          bg-neutral-900
          border
          border-white/10
          rounded-2xl
          overflow-hidden
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
            px-4
            py-3
            border-b
            border-white/10
          "
        >
          <Grid
            className="
              w-4
              h-4
              text-rose-400
            "
          />

          <span
            className="
              text-xs
              font-bold
              text-white
            "
          >
            المنشورات
          </span>
        </div>

        {userPosts.length === 0 ? (
          <div
            className="
              py-16
              text-center
              text-neutral-500
            "
          >
            <Grid
              className="
                w-8
                h-8
                mx-auto
                mb-3
                opacity-40
              "
            />

            <p className="text-xs">
              لا توجد منشورات بعد
            </p>
          </div>
        ) : (
          <div
            className="
              grid
              grid-cols-2
              gap-1
            "
          >
            {userPosts.map((post) => (
              <div
                key={post.id}
                className="
                  aspect-square
                  bg-neutral-950
                  overflow-hidden
                  relative
                "
              >
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={
                      post.caption ||
                      'Post'
                    }
                    className="
                      w-full
                      h-full
                      object-cover
                    "
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="
                      w-full
                      h-full
                      flex
                      items-center
                      justify-center
                      p-4
                      text-center
                      text-neutral-400
                      text-xs
                    "
                  >
                    {post.caption ||
                      'منشور'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
