import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Palette, Lock, ChevronRight, Loader2, Check,
  Moon, Sun, Eye, Bell, Globe, LogOut, UserX
} from 'lucide-react';
import ThemeSelector from '@/components/ThemeSelector';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: Props) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'main' | 'theme' | 'password'>('main');
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

                    <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(244,63,94,0.15)' }}>
                        <UserX className="w-5 h-5 text-rose-400" />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-rose-400 font-semibold text-sm">حظر مستخدمين</div>
                        <div className="text-white/40 text-xs">إدارة قائمة الحظر</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/30" />
                    </button>

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
