import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, Signal } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/feed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md animate-slide-up relative z-10">
        <div className="glass rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
              <Signal className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Deep Signal</h1>
            <p className="text-neutral-400 text-sm mt-2">Welcome back. Sign in to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-rose-400 hover:text-rose-300 font-medium transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
