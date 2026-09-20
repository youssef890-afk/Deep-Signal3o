import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Mail,
  Loader2,
  Signal,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError(null);

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('دخل الإيميل ديالك.');
      return;
    }

    setLoading(true);

    try {
      const redirectTo =
        `${window.location.origin}/reset-password`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (error) {
      console.error(
        'Password reset error:',
        error
      );

      setError(
        'وقع خطأ أثناء إرسال رابط تغيير الباسورد.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-black text-white">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">

        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px]" />

        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />

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
              Reset Password
            </h1>

            <p className="text-neutral-400 text-sm mt-2 text-center">
              Enter your email and we&apos;ll send you
              a reset link.
            </p>

          </div>

          {success ? (

            <div className="space-y-5">

              <div className="flex flex-col items-center text-center bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-6">

                <CheckCircle className="w-10 h-10 text-green-400 mb-3" />

                <p className="text-sm text-green-300 font-medium">
                  تم إرسال رابط تغيير الباسورد.
                </p>

                <p className="text-sm text-white font-bold mt-2 break-all">
                  {email}
                </p>

                <p className="text-xs text-neutral-400 mt-3">
                  شوف Inbox و Spam / Junk.
                </p>

                <p className="text-xs text-neutral-500 mt-2">
                  الرابط غادي يفتح صفحة تغيير الباسورد.
                </p>

              </div>

              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3.5 rounded-xl transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>

            </div>

          ) : (

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

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
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}

              </button>

            </form>

          )}

          {!success && (
            <div className="mt-6 text-center text-sm text-neutral-400">

              Remember your password?{' '}

              <Link
                to="/login"
                className="text-rose-400 hover:text-rose-300 font-medium transition-colors"
              >
                Sign in
              </Link>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
