import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import SettingsPanel from '@/components/SettingsPanel';
import { supabase } from '@/lib/supabase';
import { generateAiImage } from '@/lib/aiAssistant';

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
  Settings,
  Music2,
  WandSparkles,
} from 'lucide-react';

interface ProfileData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  display_id: string;
}

interface PostData {
  id: string;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  media_urls: string[] | null;
  post_type: 'text' | 'image' | 'video' | 'reel' | 'audio' | null;
  caption: string | null;
  created_at: string;
}

interface ProfileBadge {
  id: string;
  label: string;
  className: string;
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { session } = useAuth();
  const user = session?.user ?? null;
  const navigate = useNavigate();

  const targetUserId = userId || user?.id;
  const isOwnProfile = user?.id === targetUserId;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [profileBadges, setProfileBadges] = useState<ProfileBadge[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<'avatar' | 'cover' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ============================================
  // تحميل معلومات البروفايل
  // ============================================

  const loadProfileData = useCallback(async () => {
    if (!targetUserId) {
      setProfileError('سجل الدخول باش تشوف الملف الشخصي ديالك.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setProfileError(null);

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
        .select('id, image_url, video_url, audio_url, media_urls, post_type, caption, created_at')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (postsError) {
        throw postsError;
      }

      const loadedPosts = (posts as PostData[]) || [];
      setUserPosts(loadedPosts);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentPosts = loadedPosts.filter((post) => Date.parse(post.created_at) >= Date.parse(weekAgo)).length;
      const { data: scores } = await supabase
        .from('game_scores')
        .select('points')
        .eq('user_id', targetUserId)
        .gte('created_at', weekAgo);
      const weeklyPoints = (scores ?? []).reduce((sum, score) => sum + score.points, 0);
      const nextBadges: ProfileBadge[] = [];
      if (loadedPosts.length >= 5) nextBadges.push({ id: 'creator', label: 'صانع محتوى', className: 'border-rose-300/20 bg-rose-300/10 text-rose-200' });
      if (recentPosts >= 3) nextBadges.push({ id: 'active', label: 'نشيط هذا الأسبوع', className: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' });
      if (weeklyPoints >= 15) nextBadges.push({ id: 'gamer', label: 'بطل الألعاب', className: 'border-amber-300/20 bg-amber-300/10 text-amber-200' });
      setProfileBadges(nextBadges);

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
      setProfileError('ما قدرناش نحمّلو الملف الشخصي. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user, isOwnProfile]);

  useEffect(() => {
    if (!user?.id || !targetUserId || isOwnProfile) return;

    void supabase.from('profile_views').insert({
      profile_id: targetUserId,
      viewer_id: user.id,
    }).then(({ error }) => {
      if (error) console.error('Profile view could not be recorded:', error);
    });
  }, [isOwnProfile, targetUserId, user?.id]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  // ============================================
  // تسجيل الخروج
  // ============================================

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
        `${user.id}/${user.id}_avatar.${fileExtension}`;

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

  async function handleGenerateProfileImage(kind: 'avatar' | 'cover') {
    if (!user || !isOwnProfile || generatingImage) return;
    setGeneratingImage(kind);

    try {
      const prompt = kind === 'avatar'
        ? 'Create a polished, original square profile avatar illustration for a social app. Do not include text, logos, or recognizable people.'
        : 'Create an elegant abstract 16:9 social profile cover with a calm dark background and subtle emerald, rose, and gold details. No text or logos.';
      const base64 = await generateAiImage(prompt);
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
      const filePath = `${user.id}/generated-${kind}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, new Blob([bytes], { type: 'image/png' }), {
          cacheControl: '3600',
          contentType: 'image/png',
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const url = data.publicUrl;
      const column = kind === 'avatar' ? 'avatar_url' : 'cover_url';
      const { error: updateError } = await supabase.from('profiles').update({ [column]: url }).eq('id', user.id);
      if (updateError) throw updateError;

      setProfile((current) => current ? { ...current, [column]: url } : current);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر توليد الصورة';
      alert(`توليد الصورة غير متاح: ${message}. تأكد من نشر Edge Function وضبط OPENAI_API_KEY.`);
    } finally {
      setGeneratingImage(null);
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center text-neutral-500" dir="rtl">
        <p>{profileError || 'الملف الشخصي غير موجود'}</p>
        {profileError && (
          <button type="button" onClick={() => void loadProfileData()} className="rounded-full bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.14]">
            إعادة المحاولة
          </button>
        )}
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
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          >
            <Settings className="w-4 h-4" />

            <span className="text-xs font-bold">
              الإعدادات
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

        <div
          className="relative mb-5 flex h-32 items-end overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-emerald-950 via-neutral-900 to-rose-950 bg-cover bg-center p-3"
          style={profile.cover_url ? { backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.7), transparent), url(${profile.cover_url})` } : undefined}
        >
          <span className="text-[10px] font-medium text-white/65">غلاف الملف الشخصي</span>
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => void handleGenerateProfileImage('cover')}
              disabled={generatingImage !== null}
              className="mr-auto inline-flex items-center gap-1.5 rounded-lg bg-black/45 px-2.5 py-1.5 text-[10px] font-medium text-white transition hover:bg-black/65 disabled:opacity-50"
            >
              {generatingImage === 'cover' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5" />}
              توليد غلاف
            </button>
          )}
        </div>

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
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => void handleGenerateProfileImage('avatar')}
                disabled={generatingImage !== null}
                title="توليد صورة بروفايل بالذكاء الاصطناعي"
                aria-label="توليد صورة بروفايل بالذكاء الاصطناعي"
                className="absolute bottom-0 left-0 grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-emerald-600 text-white shadow-lg disabled:opacity-50"
              >
                {generatingImage === 'avatar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5" />}
              </button>
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

            {profileBadges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profileBadges.map((badge) => (
                  <span key={badge.id} className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                ))}
              </div>
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
              sm:grid-cols-3
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
                {post.audio_url ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-950 to-neutral-950 p-3">
                    <Music2 className="h-8 w-8 text-emerald-300" />
                    <audio src={post.audio_url} controls className="w-full" />
                  </div>
                ) : post.video_url ? (
                  <video
                    src={post.video_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (post.media_urls?.[0] || post.image_url) ? (
                  <img
                    src={post.media_urls?.[0] || post.image_url || undefined}
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

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

    </div>
  );
}
