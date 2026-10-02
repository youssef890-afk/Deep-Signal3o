import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Bell, Check, CircleUserRound, Gamepad2, Heart, Loader2, MessageCircle, Sparkles, UserRoundPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface ActivityItem {
  id: string;
  kind: 'follow' | 'like' | 'comment' | 'view' | 'update';
  actor: string;
  actorId?: string;
  createdAt: string;
  description: string;
}

interface UserActivityRow {
  id: string;
  user_id: string;
  created_at: string;
}

export default function Navbar({ direction, onToggleDirection }: { direction: 'rtl' | 'ltr'; onToggleDirection: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const setOnlineStatus = () => setOnline(navigator.onLine);
    window.addEventListener('online', setOnlineStatus);
    window.addEventListener('offline', setOnlineStatus);
    return () => {
      window.removeEventListener('online', setOnlineStatus);
      window.removeEventListener('offline', setOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen || !user) return;
    let active = true;

    const loadActivities = async () => {
      setNotificationsLoading(true);
      try {
        const [followResult, postResult, viewResult] = await Promise.all([
          supabase.from('follows').select('id, follower_id, created_at').eq('following_id', user.id).order('created_at', { ascending: false }).limit(12),
          supabase.from('posts').select('id').eq('user_id', user.id),
          supabase.from('profile_views').select('id, viewer_id, created_at').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(12),
        ]);

        const ownPostIds = (postResult.data ?? []).map((post) => post.id);
        const [likeResult, commentResult] = ownPostIds.length
          ? await Promise.all([
              supabase.from('likes').select('id, user_id, created_at').in('post_id', ownPostIds).neq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
              supabase.from('comments').select('id, user_id, created_at').in('post_id', ownPostIds).neq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
            ])
          : [{ data: [] }, { data: [] }];

        const followerRows = (followResult.data ?? []) as { id: string; follower_id: string; created_at: string }[];
        const likeRows = (likeResult.data ?? []) as UserActivityRow[];
        const commentRows = (commentResult.data ?? []) as UserActivityRow[];
        const viewRows = (viewResult.data ?? []) as { id: string; viewer_id: string | null; created_at: string }[];
        const actorIds = [...new Set([
          ...followerRows.map((item) => item.follower_id),
          ...likeRows.map((item) => item.user_id),
          ...commentRows.map((item) => item.user_id),
          ...viewRows.map((item) => item.viewer_id).filter((id): id is string => Boolean(id)),
        ])];
        const profileResult = actorIds.length
          ? await supabase.from('profiles').select('id, username').in('id', actorIds)
          : { data: [] };
        const usernames = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile.username]));
        const nextActivities: ActivityItem[] = [
          ...followerRows.map((item) => ({ id: `follow-${item.id}`, kind: 'follow' as const, actor: usernames.get(item.follower_id) ?? 'مستخدم', actorId: item.follower_id, createdAt: item.created_at, description: 'بدأ بمتابعتك' })),
          ...likeRows.map((item) => ({ id: `like-${item.id}`, kind: 'like' as const, actor: usernames.get(item.user_id) ?? 'مستخدم', actorId: item.user_id, createdAt: item.created_at, description: 'أعجب بمنشورك' })),
          ...commentRows.map((item) => ({ id: `comment-${item.id}`, kind: 'comment' as const, actor: usernames.get(item.user_id) ?? 'مستخدم', actorId: item.user_id, createdAt: item.created_at, description: 'علّق على منشورك' })),
          ...viewRows.filter((item) => item.viewer_id).map((item) => ({ id: `view-${item.id}`, kind: 'view' as const, actor: usernames.get(item.viewer_id!) ?? 'مستخدم', actorId: item.viewer_id!, createdAt: item.created_at, description: 'زار ملفك الشخصي' })),
          { id: 'update-welcome', kind: 'update', actor: 'Deep-Signal', createdAt: new Date().toISOString(), description: 'تحديث جديد: تصميم وتجربة Deep-Signal أصبحا أفضل.' },
        ];

        nextActivities.sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
        if (active) setActivities(nextActivities.slice(0, 20));
      } catch (error) {
        console.error('Unable to load notifications:', error);
        if (active) {
          setActivities([{ id: 'update-welcome', kind: 'update', actor: 'Deep-Signal', createdAt: new Date().toISOString(), description: 'مرحباً بك في Deep-Signal.' }]);
        }
      } finally {
        if (active) setNotificationsLoading(false);
      }
    };

    void loadActivities();
    return () => { active = false; };
  }, [notificationsOpen, user]);

  const activityIcon = (kind: ActivityItem['kind']) => {
    if (kind === 'follow') return <UserRoundPlus className="h-4 w-4 text-sky-300" />;
    if (kind === 'like') return <Heart className="h-4 w-4 text-rose-400" />;
    if (kind === 'comment') return <MessageCircle className="h-4 w-4 text-amber-300" />;
    if (kind === 'view') return <CircleUserRound className="h-4 w-4 text-emerald-300" />;
    return <Sparkles className="h-4 w-4 text-orange-300" />;
  };

  return (
    <header className="sticky top-0 z-30 h-[68px] border-b border-white/[0.08] bg-[#09090d]/90 px-3 backdrop-blur-2xl sm:px-6">
      <div className="mx-auto grid h-full max-w-[1500px] grid-cols-3 items-center" dir="ltr">
        <div className="relative justify-self-start" dir="rtl">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            aria-label="فتح الإشعارات"
            aria-expanded={notificationsOpen}
            className={`relative grid h-10 w-10 place-items-center rounded-full border transition ${notificationsOpen ? 'border-rose-400/40 bg-rose-400/10 text-rose-300' : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white'}`}
          >
            <Bell className="h-[19px] w-[19px]" />
            {activities.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-[#09090d]" />}
          </button>

          {notificationsOpen && (
            <section className="absolute left-0 top-12 z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/10 bg-[#111116] text-right shadow-2xl" dir="rtl" aria-label="الإشعارات">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                <h2 className="text-sm font-semibold text-white">الإشعارات</h2>
                <span className="text-[11px] text-white/40">أحدث النشاطات</span>
              </div>
              <div className="max-h-[min(420px,70vh)] overflow-y-auto">
                {notificationsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/50">
                    <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل
                  </div>
                ) : activities.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate(activity.actorId ? `/profile/${activity.actorId}` : '/feed');
                    }}
                    className="flex w-full items-start gap-3 border-b border-white/[0.06] px-4 py-3 text-right transition hover:bg-white/[0.04]"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06]">{activityIcon(activity.kind)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs leading-5 text-white/85"><b className="font-semibold text-white">{activity.actor}</b> {activity.description}</span>
                      <time className="mt-1 block text-[10px] text-white/35">{new Intl.DateTimeFormat('ar-MA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(activity.createdAt))}</time>
                    </span>
                    {activity.kind === 'update' && <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center justify-self-center gap-2">
          <Link to="/feed" className="whitespace-nowrap font-serif text-[19px] font-bold italic text-white sm:text-[22px]" aria-label="Deep-Signal الرئيسية">
            Deep-Signal
          </Link>
          <button
            type="button"
            onClick={onToggleDirection}
            aria-label={`تبديل الاتجاه إلى ${direction === 'rtl' ? 'LTR' : 'RTL'}`}
            title={`تبديل الاتجاه إلى ${direction === 'rtl' ? 'LTR' : 'RTL'}`}
            className="grid h-8 w-8 place-items-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        <Link
          to="/games"
          dir="rtl"
          aria-label={`الألعاب، ${online ? 'متصل' : 'غير متصل'}`}
          className="inline-flex min-h-10 items-center justify-self-end gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 text-white/80 transition hover:border-white/20 hover:bg-white/[0.07]"
        >
          <Gamepad2 className="h-[19px] w-[19px] text-amber-300" />
          <span className="hidden text-xs font-medium sm:inline">الألعاب</span>
          <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-white/30'}`} />
          <span className="hidden text-[10px] text-white/45 md:inline">{online ? 'متصل' : 'أوفلاين'}</span>
        </Link>
      </div>
    </header>
  );
}