import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Palette, Lock, ChevronRight, Loader2, Check,
  Moon, Sun, Eye, Bell, Globe, LogOut, UserX, Flag
} from 'lucide-react';
import ThemeSelector from '@/components/ThemeSelector';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface BlockedUser {
  id: string;
  blocked_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

interface ContentReport {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  post_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
}

export default function SettingsPanel({ open, onClose }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'main' | 'theme' | 'password' | 'blocked' | 'moderation'>('main');
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      setMsg({ type: 'err', text: 'كلمة السر خاصها 8 حروف على الأقل' });
      return;
    }
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      setMsg({ type: 'err', text: error.message });
      return;
    }
    setMsg({ type: 'ok', text: 'تم تغيير كلمة السر بنجاح' });
    setNewPassword('');
    setTimeout(() => setView('main'), 1500);
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
    navigate('/login');
  };

  const openBlockedUsers = async () => {
    if (!user) return;
    setView('blocked');
    setLoading(true);
    setMsg(null);
    const { data: blocks, error } = await supabase
      .from('user_blocks')
      .select('id, blocked_id, blocked_username, blocked_full_name, blocked_avatar_url')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setMsg({ type: 'err', text: 'تعذر تحميل قائمة الحظر.' });
      setBlockedUsers([]);
      setLoading(false);
      return;
    }

    setBlockedUsers((blocks ?? []).map((block) => ({
      id: block.id,
      blocked_id: block.blocked_id,
      username: block.blocked_username ?? block.blocked_id,
      full_name: block.blocked_full_name,
      avatar_url: block.blocked_avatar_url,
    })));
    setLoading(false);
  };

  const unblockUser = async (blockId: string) => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('id', blockId)
      .eq('blocker_id', user.id);
    setLoading(false);
    if (error) {
      setMsg({ type: 'err', text: 'تعذر فك الحظر. حاول مرة أخرى.' });
      return;
    }
    setBlockedUsers((current) => current.filter((item) => item.id !== blockId));
    setMsg({ type: 'ok', text: 'تم فك الحظر.' });
  };

  const openReports = async () => {
    setView('moderation');
    setLoading(true);
    setMsg(null);
    const { data, error } = await supabase
      .from('content_reports')
      .select('id, reporter_id, reported_user_id, post_id, reason, details, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    setLoading(false);
    if (error) {
      setReports([]);
      setMsg({ type: 'err', text: 'تعذر تحميل التبليغات.' });
      return;
    }
    setReports((data ?? []) as ContentReport[]);
  };

  const updateReportStatus = async (reportId: string, status: ReportStatus) => {
    setLoading(true);
    const { error } = await supabase
      .from('content_reports')
      .update({ status })
      .eq('id', reportId);
    setLoading(false);
    if (error) {
      setMsg({ type: 'err', text: 'تعذر تحديث حالة التبليغ.' });
      return;
    }
    setReports((current) => current.map((report) => report.id === reportId ? { ...report, status } : report));
    setMsg({ type: 'ok', text: 'تم تحديث الحالة.' });
  };

  const reset = () => { setView('main'); setMsg(null); setNewPassword(''); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            onClick={() => { reset(); onClose(); }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[110] rounded-t-3xl overflow-hidden"
            style={{
              background: 'var(--bg-base)',
              borderTop: '1px solid var(--nav-border)',
              maxHeight: '90vh',
            }}
          >
            <div className="flex flex-col" style={{ maxHeight: '90vh' }}>
              <div className="px-5 pt-5 pb-3 shrink-0">
                <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-5" />
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">
                    {view === 'main' && 'الإعدادات'}
                    {view === 'theme' && 'الألوان'}
                    {view === 'password' && 'تغيير كلمة السر'}
                    {view === 'blocked' && 'المستخدمون المحظورون'}
                    {view === 'moderation' && 'مراجعة التبليغات'}
                  </h2>
                  <button
                    onClick={() => { if (view === 'main') { reset(); onClose(); } else reset(); }}
                    className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/60"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="px-5 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>

                {view === 'main' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setView('theme')}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                        <Palette className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-white font-semibold text-sm">الألوان والمظهر</div>
                        <div className="text-white/40 text-xs">اختر من 4 ثيمات</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/30" />
                    </button>

                    <button
                      onClick={() => setView('password')}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                        <Lock className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-white font-semibold text-sm">تغيير كلمة السر</div>
                        <div className="text-white/40 text-xs">حماية حسابك</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/30" />
                    </button>

                    <div className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                        {darkMode ? <Moon className="w-5 h-5" style={{ color: 'var(--accent)' }} /> : <Sun className="w-5 h-5" style={{ color: 'var(--accent)' }} />}
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-white font-semibold text-sm">الوضع الليلي</div>
                        <div className="text-white/40 text-xs">مفعّل دائماً</div>
                      </div>
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="w-12 h-7 rounded-full transition-colors relative shrink-0"
                        style={{ background: darkMode ? 'var(--accent)' : 'rgba(255,255,255,0.15)' }}
                      >
                        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-0.5' : 'translate-x-5'}`} />
                      </button>
                    </div>

                    <div className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                        <Eye className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-white font-semibold text-sm">وضع قراءة الرسائل</div>
                        <div className="text-white/40 text-xs">إشعار عند القراءة</div>
                      </div>
                      <button
                        onClick={() => setReadReceipts(!readReceipts)}
                        className="w-12 h-7 rounded-full transition-colors relative shrink-0"
                        style={{ background: readReceipts ? 'var(--accent)' : 'rgba(255,255,255,0.15)' }}
                      >
                        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${readReceipts ? 'translate-x-0.5' : 'translate-x-5'}`} />
                      </button>
                    </div>

                    <div className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                        <Bell className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-white font-semibold text-sm">الإشعارات</div>
                        <div className="text-white/40 text-xs">تفعيل/إيقاف</div>
                      </div>
                      <button
                        onClick={() => setNotifications(!notifications)}
                        className="w-12 h-7 rounded-full transition-colors relative shrink-0"
                        style={{ background: notifications ? 'var(--accent)' : 'rgba(255,255,255,0.15)' }}
                      >
                        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${notifications ? 'translate-x-0.5' : 'translate-x-5'}`} />
                      </button>
                    </div>

                    <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                        <Globe className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-white font-semibold text-sm">اللغة</div>
                        <div className="text-white/40 text-xs">العربية</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/30" />
                    </button>

                    <button onClick={() => void openBlockedUsers()} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(244,63,94,0.15)' }}>
                        <UserX className="w-5 h-5 text-rose-400" />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-rose-400 font-semibold text-sm">حظر مستخدمين</div>
                        <div className="text-white/40 text-xs">إدارة قائمة الحظر</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/30" />
                    </button>

                    {user?.app_metadata?.role === 'moderator' && (
                      <button onClick={() => void openReports()} className="w-full flex items-center gap-3 rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Flag className="h-5 w-5" /></div>
                        <div className="flex-1 text-right">
                          <div className="text-sm font-semibold text-white">مراجعة التبليغات</div>
                          <div className="text-xs text-white/40">إدارة البلاغات الواردة</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-white/30" />
                      </button>
                    )}

                    <div className="pt-3 mt-3 border-t border-white/5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                      >
                        <LogOut className="w-5 h-5 text-rose-400" />
                        <span className="text-rose-400 font-bold text-sm">تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                )}

                {view === 'theme' && (
                  <div className="pb-4">
                    <ThemeSelector />
                  </div>
                )}

                {view === 'blocked' && (
                  <div className="space-y-3 pb-4">
                    {msg && <p role="status" className={`rounded-lg px-3 py-2 text-xs ${msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>{msg.text}</p>}
                    {loading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/60" /></div>
                    ) : blockedUsers.length === 0 ? (
                      <p className="py-8 text-center text-sm text-white/45">ما كاين حتى مستخدم فالقائمة.</p>
                    ) : blockedUsers.map((blockedUser) => (
                      <div key={blockedUser.id} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                        {blockedUser.avatar_url ? <img src={blockedUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sm font-semibold text-white">{blockedUser.username.charAt(0).toUpperCase()}</div>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{blockedUser.full_name || blockedUser.username}</p>
                          <p className="truncate text-xs text-white/45">@{blockedUser.username}</p>
                        </div>
                        <button type="button" onClick={() => void unblockUser(blockedUser.id)} disabled={loading} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/[0.08] disabled:opacity-50">فك الحظر</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => { setView('main'); setMsg(null); }} className="w-full rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/[0.06]">رجوع للإعدادات</button>
                  </div>
                )}

                {view === 'moderation' && (
                  <div className="space-y-3 pb-4">
                    {msg && <p role="status" className={`rounded-lg px-3 py-2 text-xs ${msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>{msg.text}</p>}
                    {loading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/60" /></div>
                    ) : reports.length === 0 ? (
                      <p className="py-8 text-center text-sm text-white/45">ما كاين حتى تبليغ.</p>
                    ) : reports.map((report) => (
                      <article key={report.id} className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1 text-xs text-white/60">
                            <p>السبب: <span className="text-white">{report.reason}</span></p>
                            {report.reported_user_id && <p className="break-all">المستخدم: {report.reported_user_id}</p>}
                            {report.post_id && <p className="break-all">المنشور: {report.post_id}</p>}
                            {report.details && <p className="whitespace-pre-wrap text-white/80">{report.details}</p>}
                            <p>{new Date(report.created_at).toLocaleString('ar-MA')}</p>
                          </div>
                          <select aria-label="حالة التبليغ" value={report.status} disabled={loading} onChange={(event) => void updateReportStatus(report.id, event.target.value as ReportStatus)} className="max-w-32 rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-xs text-white disabled:opacity-50">
                            <option value="open">مفتوح</option>
                            <option value="reviewing">قيد المراجعة</option>
                            <option value="resolved">تمت المعالجة</option>
                            <option value="dismissed">مرفوض</option>
                          </select>
                        </div>
                      </article>
                    ))}
                    <button type="button" onClick={() => { setView('main'); setMsg(null); }} className="w-full rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/[0.06]">رجوع للإعدادات</button>
                  </div>
                )}

                {view === 'password' && (
                  <div className="space-y-4 pb-4">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="كلمة السر الجديدة"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-right"
                      dir="rtl"
                    />
                    {msg && (
                      <div className={`text-sm rounded-xl px-4 py-3 text-center ${
                        msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {msg.text}
                      </div>
                    )}
                    <button
                      onClick={handlePasswordChange}
                      disabled={loading}
                      className="w-full py-3.5 rounded-2xl font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: 'var(--accent-gradient)' }}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> حفظ</>}
                    </button>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
