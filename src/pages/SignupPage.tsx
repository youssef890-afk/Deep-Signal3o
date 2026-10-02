import {
  useEffect,
  useState,
} from 'react';
import {
  Link,
} from 'react-router-dom';
import {
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
    resendVerificationCode,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

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
      setError(result.error.message);
      return;
    }

    setEmail(cleanEmail);
    setVerificationMode(true);
    setCountdown(60);
    setSuccessMessage('صيفطنا ليك رابط تأكيد الحساب. كليكي عليه باش يتفعل الحساب وتدخل للتطبيق.');
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
      setError(result.error.message);
      return;
    }

    setCountdown(60);
    setSuccessMessage(
      'صيفطنا ليك رابط تأكيد جديد إلى بريدك الإلكتروني.'
    );
  };

  if (verificationMode) {
    return (
      <div
        className="relative min-h-screen overflow-hidden bg-[#0a0208] text-white flex items-center justify-center px-4"
        dir="rtl"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-1/2 top-[-10%] -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-pink-600/15 blur-[80px] animate-pulse" />
          <div className="absolute bottom-[-20%] left-[10%] w-[400px] h-[400px] rounded-full bg-orange-500/10 blur-[100px]" />
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
              {successMessage}
              <br />
              إلا ما بانش الإيميل، شوف Spam / Junk.
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
                  إعادة إرسال رابط التأكيد
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
