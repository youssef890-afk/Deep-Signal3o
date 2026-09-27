import { useState } from 'react';
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);

    // من بعد ما تبدل، حيد الـ flag و سجل خروج
    sessionStorage.removeItem('password_recovery');
    await supabase.auth.signOut();

    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 2000);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center px-4" dir="rtl">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">تم بنجاح ✅</h1>
          <p className="text-white/60 text-sm">كلمة السر تبدلت. جاري التحويل لتسجيل الدخول...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-7 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              كلمة سر جديدة
            </h1>
            <p className="text-white/50 text-sm mt-2">دخل كلمة السر الجديدة</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة السر الجديدة"
                className="w-full bg-black/40 border border-white/10 rounded-2xl pr-12 pl-12 py-3.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="أعد كلمة السر"
                className="w-full bg-black/40 border border-white/10 rounded-2xl pr-12 pl-4 py-3.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60"
              />
            </div>

            {error && (
              <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold py-3.5 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ كلمة السر'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
