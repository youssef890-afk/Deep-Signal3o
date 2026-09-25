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
      setError(result.error);
      return;
    }
    navigate('/feed', { replace: true });
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/feed` },
    });
    if (error) {
      setGoogleLoading(false);
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-rose-500/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/15 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-pink-500/10 blur-[100px]" />
      </div>

      <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,60,140,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,60,140,0.5) 1px, transparent 1px)', backgroundSize: '50px 50px', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)' }} />

      <div className="relative z-10 w-full max-w-[420px] animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-orange-500 rounded-3xl blur-2xl opacity-60" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-2xl">
              <Signal className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Deep Signal
          </h1>
          <p className="text-white/50 text-sm mt-2">Welcome back</p>
        </div>

        <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-7 shadow-2xl">
          <div className="absolute top-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-2 block">
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
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-rose-500/60 focus:bg-black/60 focus:ring-4 focus:ring-rose-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">
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
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-rose-500/60 focus:bg-black/60 focus:ring-4 focus:ring-rose-500/10 transition-all"
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
              className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 text-white font-semibold py-3.5 rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] font-semibold tracking-widest">
              <span className="bg-[#0a0a0a] px-3 text-white/40 uppercase">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={googleLoading || loading}
            className="w-full bg-white text-black font-semibold py-3.5 rounded-2xl hover:bg-neutral-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
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

          <div className="mt-6 text-center text-sm text-white/50">
            Don't have an account?{' '}
            <Link to="/signup" className="text-rose-400 hover:text-rose-300 font-semibold transition">
              Sign up
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-white/20 tracking-widest uppercase">
          Deep Signal © 2026
        </p>
      </div>
    </div>
  );
}
