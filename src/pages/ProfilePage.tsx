import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import { Loader2, Camera, Edit3, Check, X, MessageCircle, UserPlus, UserCheck } from 'lucide-react';
import type { Profile, PostWithDetails } from '@/types';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwnProfile = user?.id === userId;

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(prof as Profile | null);

    // Posts
    const { data: postData } = await supabase
      .from('posts')
      .select(`*, profile:profiles!posts_user_id_fkey(*)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (postData) {
      const postIds = postData.map((p) => p.id);
      const { data: likesData } = await supabase
        .from('likes')
        .select('id, post_id, user_id, created_at')
        .in('post_id', postIds);

      const likesByPost = new Map<string, { id: string; post_id: string; user_id: string; created_at: string }[]>();
      likesData?.forEach((l) => {
        const arr = likesByPost.get(l.post_id) ?? [];
        arr.push(l);
        likesByPost.set(l.post_id, arr);
      });

      const enriched: PostWithDetails[] = postData.map((p) => {
        const likes = likesByPost.get(p.id) ?? [];
        return {
          ...p,
          profile: p.profile as PostWithDetails['profile'],
          likes,
          like_count: likes.length,
          has_liked: user ? likes.some((l) => l.user_id === user.id) : false,
        };
      });
      setPosts(enriched);
    }

    // Followers/following counts
    const { count: fCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
    setFollowersCount(fCount ?? 0);

    const { count: fgCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);
    setFollowingCount(fgCount ?? 0);

    // Check if current user follows this profile
    if (user && !isOwnProfile) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();
      setIsFollowing(!!followData);
    }

    setLoading(false);
  }, [userId, user, isOwnProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveEdit = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName.trim() || null, bio: editBio.trim() || null })
      .eq('id', user.id);

    if (!error) {
      await refreshProfile();
      setProfile((prev) => prev ? { ...prev, full_name: editName.trim() || null, bio: editBio.trim() || null } : prev);
      setEditing(false);
    }
    setSaving(false);
  };

  const handleFollow = async () => {
    if (!user || !userId) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
      setIsFollowing(false);
      setFollowersCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    if (uploadError) {
      alert('Failed to upload avatar: ' + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user.id);

    if (!updateError) {
      await refreshProfile();
      setProfile((prev) => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-neutral-400">User not found.</p>
      </div>
    );
  }

  const displayName = profile.full_name || profile.username;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Profile header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 animate-fade-in">
        <div className="relative group">
          <Avatar src={profile.avatar_url} name={displayName} size="2xl" ring />
          {isOwnProfile && (
            <label className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-neutral-800 border-2 border-black flex items-center justify-center cursor-pointer hover:bg-neutral-700 transition-colors">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          {editing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full name"
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50"
              />
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Bio"
                rows={2}
                maxLength={150}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" /> Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
                <div className="flex items-center gap-2 justify-center">
                  {isOwnProfile ? (
                    <button
                      onClick={() => {
                        setEditName(profile.full_name || '');
                        setEditBio(profile.bio || '');
                        setEditing(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleFollow}
                        className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                          isFollowing
                            ? 'bg-neutral-800 text-white hover:bg-neutral-700'
                            : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:opacity-90'
                        }`}
                      >
                        {isFollowing ? (
                          <><UserCheck className="w-3.5 h-3.5" /> Following</>
                        ) : (
                          <><UserPlus className="w-3.5 h-3.5" /> Follow</>
                        )}
                      </button>
                      <a
                        href={`/chat/${profile.id}`}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Message
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mb-3 justify-center sm:justify-start">
                <div>
                  <span className="font-bold text-white">{posts.length}</span>{' '}
                  <span className="text-neutral-400 text-sm">posts</span>
                </div>
                <div>
                  <span className="font-bold text-white">{followersCount}</span>{' '}
                  <span className="text-neutral-400 text-sm">followers</span>
                </div>
                <div>
                  <span className="font-bold text-white">{followingCount}</span>{' '}
                  <span className="text-neutral-400 text-sm">following</span>
                </div>
              </div>

              {/* Bio */}
              <div>
                {profile.full_name && (
                  <p className="font-semibold text-white text-sm">{profile.full_name}</p>
                )}
                {profile.bio ? (
                  <p className="text-neutral-300 text-sm leading-relaxed">{profile.bio}</p>
                ) : (
                  isOwnProfile && <p className="text-neutral-600 text-sm italic">No bio yet. Edit your profile to add one.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Posts grid */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Camera className="w-10 h-10 text-neutral-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {isOwnProfile ? 'Share your first post' : 'No posts yet'}
          </h3>
          <p className="text-neutral-400 text-sm">
            {isOwnProfile ? 'Upload an image from the feed page to get started.' : `When ${profile.username} shares photos, they'll appear here.`}
          </p>
        </div>
      ) : (
        <div className="border-t border-white/10 pt-6">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Posts</h2>
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
