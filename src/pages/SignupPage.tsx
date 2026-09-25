import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
} from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Signal,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const {
    signUp,
    verifyEmailOtp,
    resendVerificationCode,
  } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otp, setOtp] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const particles = useMemo(() => {
    return Array.from({ length: 35 }, (_, index) => {
      const size = Math.random() * 4 + 1.5;

      const colors = [
        'rgba(255, 60, 140, 0.9)',
        'rgba(255, 150, 80, 0.85)',
        'rgba(255, 200, 220, 0.8)',
        'rgba(120, 255, 190, 0.7)',
      ];

      const color =
        colors[Math.floor(Math.random() * colors.length)];

      return {
        id: index,
        size,
        color,
        left: Math.random() * 100,
        top: Math.random() * 120,
        duration: Math.random() * 8 + 6,
        delay: Math.random() * 8,
      };
    });
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setInterval(() => {
      setCountdown((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleSignup = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError(null);
    setSuccessMessage(null);

    const cleanUsername = username
      .trim()
      .toLowerCase();

    const cleanEmail = email
      .trim()
      .toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      setError(
        'Username خاصو يكون بين 3 و30 حرف، ويحتوي غير على a-z و 0-9 و _.'
      );
      return;
    }

    if (password.length < 8) {
      setError(
        'Password خاصو يكون على الأقل 8 حروف.'
      );
      return;
    }

    setLoading(true);

    const result = await signUp(
      cleanEmail,
      password,
      cleanUsername
    );

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setEmail(cleanEmail);
    setVerificationMode(true);
    setVerified(false);
    setOtp('');
    setCountdown(60);
  };

  const handleVerifyOtp = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError(null);
    setSuccessMessage(null);

    const cleanOtp = otp
      .replace(/\D/g, '')
      .slice(0, 6);

    if (cleanOtp.length !== 6) {
      setError(
        'دخل رمز التحقق كامل، خاصو يكون 6 أرقام.'
      );
      return;
    }

    setLoading(true);

    const result = await verifyEmailOtp(
      email,
      cleanOtp
    );

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setVerified(true);
    setSuccessMessage(
      'تم التأكيد بالبريد الإلكتروني.'
    );
  };

  const handleResend = async () => {
    if (resending || countdown > 0) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setResending(true);

    const result =
      await resendVerificationCode(email);

    setResending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOtp('');
    setCountdown(60);
    setSuccessMessage(
      'تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني.'
    );
  };

  if (verificationMode && verified) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#050008] text-white flex items-center justify-center px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-[10%] -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-pink-600/15 blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-orange-500/10 blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-[420px]">
          <div className="rounded-[28px] border border-pink-400/30 bg-[#140a19] shadow-[0_0_50px_rgba(255,40,120,0.18),0_25px_50px_rgba(0,0,0,0.8)] p-7 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative w-24 h-24 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center shadow-[0_0_40px_rgba(42,255,154,0.25)]">
                <CheckCircle2
                  className="w-14 h-14 text-emerald-400"
                  strokeWidth={1.7}
                />
                <div className="absolute inset-0 rounded-full border border-emerald-400/20 animate-ping" />
              </div>
            </div>

            <h1 className="text-2xl font-bold">
              تم التحقق بنجاح
            </h1>

            <p className="mt-4 text-sm leading-7 text-white/60">
              تم التأكيد بالبريد الإلكتروني
              <br />
              الحساب ديالك تفعّل بنجاح.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-semibold break-all">
                  {email}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/login', {
                  replace: true,
                })
              }
              className="mt-7 w-full rounded-full bg-gradient-to-r from-[#ff2a78] to-[#ff8a3d] py-3.5 font-bold shadow-[0_4px_20px_rgba(255,42,120,0.4)] transition-transform hover:scale-[1.02]"
            >
              متابعة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (verificationMode) {
    return (
      <div
        className="relative min-h-screen overflow-hidden bg-[#0a0208] text-white flex items-center justify-center px-4"
        dir="rtl"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-1/2 top-[-10%] -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-pink-600/15 blur-[80px] animate-pulse" />

          <div className="absolute bottom-[-20%] left-[10%] w-[400px] h-[400px] rounded-full bg-orange-500/10 blur-[100px]" />

          {particles.map((particle) => (
            <span
              key={particle.id}
              className="absolute rounded-full pointer-events-none animate-[float_linear_infinite]"
              style={{
                width: particle.size,
                height: particle.size,
                background: particle.color,
                boxShadow: `0 0 ${
                  particle.size * 3
                }px ${particle.color}`,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                animationDuration: `${particle.duration}s`,
                animationDelay: `${particle.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 w-full max-w-[420px]">
          <div className="rounded-[28px] border border-pink-400/30 bg-[#140a19] shadow-[0_0_50px_rgba(255,40,120,0.18),0_25px_50px_rgba(0,0,0,0.8)] p-6 sm:p-8 text-center">
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff2a78] via-pink-500 to-[#ff8a3d] flex items-center justify-center shadow-[0_0_30px_rgba(255,42,120,0.35)]">
                <Signal
                  className="w-10 h-10 text-white"
                  strokeWidth={2.3}
                />
              </div>
            </div>

            <h1 className="text-[22px] sm:text-2xl font-bold">
              تحقق من بريدك الإلكتروني
            </h1>

            <p className="mt-4 text-sm leading-7 text-white/60">
              صيفطنا ليك رمز تحقق من 6 أرقام
              <br />
              دخل الرمز هنا باش تأكد حسابك.
            </p>

            <div className="mt-5 rounded-2xl border border-pink-400/20 bg-[#1a0a15] px-4 py-3">
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4 text-pink-400 shrink-0" />

                <span
                  className="text-sm font-semibold break-all"
                  dir="ltr"
                >
                  {email}
                </span>
              </div>
            </div>

            <form
              onSubmit={handleVerifyOtp}
              className="mt-6"
            >
              <label className="block text-right text-xs text-white/50 mb-2">
                رمز التحقق
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  const value = e.target.value
                    .replace(/\D/g, '')
                    .slice(0, 6);

                  setOtp(value);
                  setError(null);
                }}
                placeholder="000000"
                className="w-full h-16 rounded-2xl border border-pink-400/25 bg-[#0d050b] text-white text-center text-2xl font-bold tracking-[0.55em] outline-none transition-all focus:border-pink-400/70 focus:ring-2 focus:ring-pink-500/20"
                dir="ltr"
              />

              {error && (
                <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  otp.length !== 6
                }
                className="mt-5 w-full rounded-full bg-gradient-to-r from-[#ff2a78] to-[#ff8a3d] py-3.5 font-bold shadow-[0_4px_20px_rgba(255,42,120,0.4)] transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    تأكيد الرمز
                  </>
                )}
              </button>
            </form>

            <div className="mt-5">
              {countdown > 0 ? (
                <p className="text-xs text-white/40">
                  تقدر تطلب كود جديد بعد{' '}
                  <span className="text-pink-400 font-bold">
                    {countdown}s
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300 disabled:opacity-50"
                >
                  {resending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  إرسال رمز جديد
                </button>
              )}
            </div>

            <p className="mt-6 text-xs text-white/35 leading-5">
              ما لقيتيش الرسالة؟
              <br />
              شوف Spam / Junk.
            </p>

            <button
              type="button"
              onClick={() => {
                setVerificationMode(false);
                setOtp('');
                setError(null);
                setSuccessMessage(null);
              }}
              className="mt-5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              رجوع لإنشاء الحساب
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#050008] text-white"
      dir="ltr"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[10%] w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[10%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md animate-slide-up relative z-10">
        <div className="rounded-3xl p-8 shadow-2xl bg-[#140a19] border border-pink-400/20">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff2a78] via-pink-500 to-[#ff8a3d] flex items-center justify-center mb-4 shadow-lg shadow-pink-500/20">
              <Signal
                className="w-8 h-8 text-white"
                strokeWidth={2.5}
              />
            </div>

            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#ff2a78] to-[#ff8a3d] bg-clip-text text-transparent">
              Join Deep Signal
            </h1>

            <p className="text-neutral-400 text-sm mt-2">
              Create your account and start sharing.
            </p>
          </div>

          <form
            onSubmit={handleSignup}
            className="space-y-5"
          >
            <div>
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                Username
              </label>

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />

                <input
                  type="text"
                  required
                  maxLength={30}
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, '')
                        .slice(0, 30)
                    )
                  }
                  placeholder="your_username"
                  autoComplete="username"
                  className="w-full bg-[#0d050b] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full bg-[#0d050b] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="w-full bg-[#0d050b] border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ff2a78] to-[#ff8a3d] text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-400">
            Already have an account?{' '}

            <Link
              to="/login"
              className="text-pink-400 hover:text-pink-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
