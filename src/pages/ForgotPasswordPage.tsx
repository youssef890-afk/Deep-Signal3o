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
    <div className="min-h-screen bg-[#090D16] text-white flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-7 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm"
          >
            <ArrowRight className="w-4 h-4" /> رجوع
          </button>

          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {step === 'email' ? 'نسيت كلمة السر' : 'تحقق من الرمز'}
            </h1>
            <p className="text-white/50 text-sm mt-2 text-center">
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
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pr-12 pl-4 py-3.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60"
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
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold py-3.5 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
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
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60"
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
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold py-3.5 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تحقق'}
              </button>

              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full text-sm text-purple-400 hover:text-purple-300 disabled:opacity-50 py-2"
              >
                {resending ? 'جاري الإرسال...' : 'ما وصلكش الرمز؟ أعد الإرسال'}
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-white/50">
            تذكرت كلمة السر؟{' '}
            <Link to="/login" className="text-purple-400 font-semibold">
              سجل دخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
