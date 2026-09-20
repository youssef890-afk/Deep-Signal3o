import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  Signal,
  CheckCircle,
  MousePointerClick,
  ArrowRight,
} from 'lucide-react';

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState<string | null>(
    null
  );

  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError(null);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (cleanUsername.length < 3) {
      setError(
        'Username خاصو يكون على الأقل 3 حروف.'
      );
      return;
    }

    if (password.length < 6) {
      setError(
        'Password خاصو يكون على الأقل 6 حروف.'
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
      if (
        result.error.includes(
          'تم إنشاء الحساب بنجاح'
        )
      ) {
        setSuccess(true);
        return;
      }

      setError(result.error);
      return;
    }

    navigate('/feed', { replace: true });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-black text-white">

        {/* Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[10%] w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px]" />

          <div className="absolute bottom-[-20%] left-[10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-md relative z-10">

          <div className="glass rounded-3xl p-8 shadow-2xl bg-neutral-900/80 border border-white/10">

            <div className="flex flex-col items-center text-center">

              {/* Email Verification Illustration */}
              <div className="relative w-32 h-32 mb-6">

                {/* Glow */}
                <div className="absolute inset-0 bg-rose-500/10 rounded-full blur-2xl" />

                {/* Email card */}
                <div className="absolute left-2 top-4 w-24 h-20 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 p-[2px] shadow-xl shadow-rose-500/20 rotate-[-4deg]">

                  <div className="w-full h-full rounded-[14px] bg-neutral-900 flex items-center justify-center">

                    <Mail
                      className="w-11 h-11 text-white"
                      strokeWidth={1.8}
                    />

                  </div>

                </div>

                {/* Verification check */}
                <div className="absolute right-0 top-0 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 border-4 border-neutral-900">

                  <CheckCircle
                    className="w-5 h-5 text-white"
                    strokeWidth={2.5}
                  />

                </div>

                {/* Click icon */}
                <div className="absolute right-0 bottom-1 w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center animate-pulse">

                  <MousePointerClick
                    className="w-6 h-6 text-amber-400"
                    strokeWidth={2}
                  />

                </div>

              </div>

              <h1 className="text-2xl font-bold">
                تحقق من بريدك الإلكتروني
              </h1>

              <p className="text-neutral-300 text-sm mt-4 leading-7">
                قم بالتحقق عبر الضغط على الرابط
                <br />
                الذي أرسلناه إلى بريدك الإلكتروني
                <br />
                للتحقق من حسابك.
              </p>

              {/* Email */}
              <div className="w-full mt-5 px-4 py-3 rounded-xl bg-white/5 border border-white/10">

                <div className="flex items-center justify-center gap-2">

                  <Mail className="w-4 h-4 text-rose-400 shrink-0" />

                  <p className="text-white font-medium text-sm break-all">
                    {email}
                  </p>

                </div>

              </div>

              {/* Hint */}
              <div className="mt-5 flex items-start gap-2 text-xs text-neutral-500 text-left">

                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />

                <p className="leading-5">
                  افتح بريدك الإلكتروني واضغط على
                  رابط التحقق لإكمال إنشاء الحساب.
                  إذا ما لقيتيش الرسالة، شوف Spam / Junk.
                </p>

              </div>

              {/* Login button */}
              <Link
                to="/login"
                className="w-full mt-7 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-rose-500/20"
              >
                <span>مشي لتسجيل الدخول</span>

                <ArrowRight className="w-4 h-4" />
              </Link>

            </div>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-black text-white">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">

        <div className="absolute top-[-20%] right-[10%] w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px]" />

        <div className="absolute bottom-[-20%] left-[10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />

      </div>

      <div className="w-full max-w-md animate-slide-up relative z-10">

        <div className="glass rounded-3xl p-8 shadow-2xl bg-neutral-900/80 border border-white/10">

          <div className="flex flex-col items-center mb-8">

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">

              <Signal
                className="w-8 h-8 text-white"
                strokeWidth={2.5}
              />

            </div>

            <h1 className="text-3xl font-bold gradient-text">
              Join Deep Signal
            </h1>

            <p className="text-neutral-400 text-sm mt-2">
              Create your account and start sharing.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
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
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  placeholder="your_username"
                  autoComplete="username"
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
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
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
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
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
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
              <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
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
              className="text-rose-400 hover:text-rose-300 font-medium transition-colors"
            >
              Sign in
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}
