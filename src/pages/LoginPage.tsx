import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Eye, EyeOff, Loader2, Signal } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    navigate('/feed', { replace: true });
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?flow=oauth` },
      });
      if (error) throw error;
    } catch (error) {
      setGoogleLoading(false);
      setError(error instanceof Error ? error.message : 'تعذر تسجيل الدخول عبر Google');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b090b] px-4 py-10 text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.14), transparent 56%), linear-gradient(145deg, #10090b 0%, #09090d 58%, #100c08 100%)' }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '56px 56px' }}
      />

      <div className="relative z-10 w-full max-w-[420px] animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-orange-500 rounded-3xl blur-2xl opacity-60" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-2xl">
              <Signal className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Youssef
          </h1>
          <p className="text-white/50 text-sm mt-2">Welcome back</p>
        </div>

        <div className="relative rounded-2xl border border-white/[0.12] bg-[#111013]/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
          <div className="absolute top-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-white/70">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-rose-400 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  dir="ltr"
                  className="w-full rounded-xl border border-white/[0.14] bg-white/[0.04] py-3.5 pl-12 pr-4 text-left text-sm text-white placeholder:text-white/45 transition-all focus:border-rose-400/70 focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition">
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-rose-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  dir="ltr"
                  className="w-full rounded-xl border border-white/[0.14] bg-white/[0.04] py-3.5 pl-12 pr-12 text-left text-sm text-white placeholder:text-white/45 transition-all focus:border-rose-400/70 focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              disabled={loading || googleLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 py-3.5 font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] font-semibold tracking-widest">
              <span className="bg-[#111013] px-3 text-white/55 uppercase">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.14] bg-white/[0.04] py-3.5 font-semibold text-white/90 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="mt-6 text-center text-sm text-white/65">
            Don't have an account?{' '}
            <Link to="/signup" className="text-rose-400 hover:text-rose-300 font-semibold transition">
              Sign up
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-white/40">
          Youssef © 2026
        </p>
      </div>
    </div>
  );
}
