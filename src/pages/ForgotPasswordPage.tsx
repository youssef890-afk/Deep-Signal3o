import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { verifyRecoveryOtp, sendRecoveryOtp, resendRecoveryOtp } = useAuth();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const sendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setError('');
    setMessage('');

    if (!cleanEmail) {
      setError('دخل البريد الإلكتروني');
      return;
    }

    setLoading(true);
    const result = await sendRecoveryOtp(cleanEmail);
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setStep('otp');
    setMessage('صيفطنا ليك رمز التحقق في البريد');
  };

  const verifyOtp = async () => {
    const cleanOtp = otp.replace(/\D/g, '').slice(0, 6);
    setError('');

    if (cleanOtp.length !== 6) {
      setError('دخل 6 أرقام');
      return;
    }

    setLoading(true);
    const result = await verifyRecoveryOtp(email, cleanOtp);
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    // ⚠️ مهم: نخليو المستخدم فـ recovery mode
    sessionStorage.setItem('password_recovery', '1');
    navigate('/reset-password', { replace: true });
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    setError('');
    const result = await resendRecoveryOtp(email);
    setResending(false);
    if (result.error) {
      setError(result.error.message || 'ما قدرناش نرسلو');
    } else {
      setMessage('صيفطنا ليك رمز جديد');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b090b] px-4 py-8 text-white" dir="rtl">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.14), transparent 56%), linear-gradient(145deg, #10090b 0%, #09090d 58%, #100c08 100%)' }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/[0.12] bg-[#111013]/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
          <button
            onClick={() => navigate('/login')}
            className="mb-6 flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
          >
            <ArrowRight className="w-4 h-4" /> رجوع
          </button>

          <div className="flex flex-col items-center mb-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-rose-300 to-orange-300 bg-clip-text text-2xl font-bold text-transparent">
              {step === 'email' ? 'نسيت كلمة السر' : 'تحقق من الرمز'}
            </h1>
            <p className="mt-2 text-center text-sm text-white/70">
              {step === 'email'
                ? 'دخل بريدك الإلكتروني وسنرسل لك رمز التحقق'
                : `دخل الرمز المُرسل إلى ${email}`}
            </p>
          </div>

          {step === 'email' ? (
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/[0.14] bg-white/[0.04] py-3.5 pl-4 pr-12 text-sm text-white placeholder:text-white/45 focus:border-rose-400/70 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                  dir="ltr"
                />
              </div>

              {error && (
                <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                onClick={sendOtp}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 py-3.5 font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:brightness-110 disabled:opacity-55"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إرسال الرمز'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] text-white placeholder:text-white/45 focus:border-rose-400/70 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                  dir="ltr"
                />
              </div>

              {error && (
                <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {message && !error && (
                <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  {message}
                </div>
              )}

              <button
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 py-3.5 font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:brightness-110 disabled:opacity-55"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تحقق'}
              </button>

              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full py-2 text-sm text-rose-300 transition hover:text-rose-200 disabled:opacity-50"
              >
                {resending ? 'جاري الإرسال...' : 'ما وصلكش الرمز؟ أعد الإرسال'}
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-white/65">
            تذكرت كلمة السر؟{' '}
            <Link to="/login" className="font-semibold text-rose-300 transition hover:text-rose-200">
              سجل دخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
