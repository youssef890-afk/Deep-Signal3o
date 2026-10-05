import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    let timeoutId: number | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true);
        setError('');
      }
    });

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;

        if (session) {
          setHasSession(true);
          return;
        }

        timeoutId = window.setTimeout(() => {
          void supabase.auth.getSession().then(({ data }) => {
            if (!active || data.session) return;
            sessionStorage.removeItem('password_recovery');
            setHasSession(false);
            setError('الرابط منتهي الصلاحية أو الجلسة غير موجودة. يرجى طلب رمز جديد.');
          }).catch(() => {
            if (!active) return;
            setHasSession(false);
            setError('تعذر التحقق من الجلسة. أعد طلب رمز استعادة كلمة السر.');
          });
        }, 3000);
      } catch {
        if (active) {
          setHasSession(false);
          setError('تعذر التحقق من الجلسة. أعد طلب رمز استعادة كلمة السر.');
        }
      }
    };

    void checkSession();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => navigate('/login', { replace: true }), 2000);
    return () => window.clearTimeout(timer);
  }, [done, navigate]);

  const handleSave = async () => {
    setError('');

    if (password.length < 8) {
      setError('كلمة السر خاصها 8 حروف على الأقل');
      return;
    }

    if (password !== confirm) {
      setError('كلمتا السر ما متطابقتينش');
      return;
    }

    setLoading(true);
    let timeoutId: number | undefined;

    try {
      // التأكد السريع قبل التحديث
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('الجلسة انتهت. يرجى إعادة طلب رابط تغيير كلمة السر.');
        return;
      }

      const updatePromise = supabase.auth.updateUser({ password });
      const timeoutPromise = new Promise<never>((_, reject) =>
        timeoutId = window.setTimeout(() => reject(new Error('تأخرت الاستجابة من السيرفر. حاول مرة أخرى.')), 12000)
      );

      const res = await Promise.race([updatePromise, timeoutPromise]);

      if (res?.error) {
        setError(res.error.message);
        return;
      }

      setDone(true);
      sessionStorage.removeItem('password_recovery');
      await supabase.auth.signOut().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b090b] px-4 py-8 text-white" dir="rtl">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.14), transparent 56%), linear-gradient(145deg, #10090b 0%, #09090d 58%, #100c08 100%)' }}
        />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">تم بنجاح</h1>
          <p className="text-sm text-white/70">كلمة السر تبدلت. جاري التحويل لصفحة الدخول...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b090b] px-4 py-8 text-white" dir="rtl">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.14), transparent 56%), linear-gradient(145deg, #10090b 0%, #09090d 58%, #100c08 100%)' }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/[0.12] bg-[#111013]/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-rose-300 to-orange-300 bg-clip-text text-2xl font-bold text-transparent">
              كلمة سر جديدة
            </h1>
            <p className="mt-2 text-sm text-white/70">دخل كلمة السر الجديدة</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/45" />
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة السر الجديدة"
                className="w-full rounded-xl border border-white/[0.14] bg-white/[0.04] py-3.5 pl-12 pr-12 text-sm text-white placeholder:text-white/45 focus:border-rose-400/70 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/55 transition hover:text-white"
              >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/45" />
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="أعد كلمة السر"
                className="w-full rounded-xl border border-white/[0.14] bg-white/[0.04] py-3.5 pl-4 pr-12 text-sm text-white placeholder:text-white/45 focus:border-rose-400/70 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
              />
            </div>

            {error && (
              <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={loading || hasSession !== true}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 py-3.5 font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ كلمة السر'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}