import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  KeyRound,
  Loader2,
  Lock,
  Signal,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [ready, setReady] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const prepareRecovery = async () => {
      try {
        /*
         * ملي المستخدم كيضغط على رابط Reset،
         * Supabase كيتعامل مع الرابط وكيخلق session
         * ديال recovery.
         */

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session) {
          setReady(true);
          setCheckingSession(false);
          return;
        }

        /*
         * ممكن session توصل مباشرة بعد getSession،
         * لذلك كنستناو event PASSWORD_RECOVERY.
         */

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (!mounted) return;

            if (
              event === 'PASSWORD_RECOVERY' ||
              event === 'SIGNED_IN'
            ) {
              if (newSession) {
                setReady(true);
              }

              setCheckingSession(false);
            }
          }
        );

        /*
         * نعطي وقت صغير لـ Supabase يعالج الرابط.
         */

        setTimeout(() => {
          if (!mounted) return;

          setCheckingSession(false);
        }, 2500);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error(
          'Recovery session error:',
          error
        );

        if (mounted) {
          setCheckingSession(false);
          setReady(false);
        }
      }
    };

    const cleanupPromise = prepareRecovery();

    return () => {
      mounted = false;

      void cleanupPromise;
    };
  }, []);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError(null);

    if (password.length < 6) {
      setError(
        'الباسورد خاصو يكون على الأقل 6 حروف.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        'الباسورد الأول والثاني ما متطابقينش.'
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          'جلسة تغيير الباسورد ما بقاتش صالحة. طلب رابط جديد.'
        );

        setLoading(false);
        return;
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);

      await supabase.auth.signOut();

      setTimeout(() => {
        navigate('/login', {
          replace: true,
        });
      }, 1800);
    } catch (error) {
      console.error(
        'Update password error:',
        error
      );

      setError(
        'وقع خطأ أثناء تغيير الباسورد.'
      );

      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">

        <div className="flex flex-col items-center gap-4">

          <Loader2 className="w-8 h-8 animate-spin text-rose-400" />

          <p className="text-sm text-neutral-400">
            Preparing password reset...
          </p>

        </div>

      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-black text-white">

        <div className="absolute inset-0 overflow-hidden pointer-events-none">

          <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px]" />

          <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />

        </div>

        <div className="w-full max-w-md relative z-10">

          <div className="rounded-3xl p-8 shadow-2xl bg-neutral-900/80 border border-white/10">

            <div className="flex flex-col items-center text-center">

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center mb-5 shadow-lg shadow-rose-500/20">

                <KeyRound
                  className="w-8 h-8 text-white"
                  strokeWidth={2.5}
                />

              </div>

              <h1 className="text-2xl font-bold text-white">
                Reset Link Invalid
              </h1>

              <p className="text-sm text-neutral-400 mt-3 leading-6">
                رابط تغيير الباسورد غير صالح أو سالات
                الصلاحية ديالو.
              </p>

              <Link
                to="/forgot-password"
                className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-rose-500/20"
              >
                Request New Reset Link
              </Link>

              <Link
                to="/login"
                className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>

            </div>

          </div>

        </div>

      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-black text-white">

        <div className="absolute inset-0 overflow-hidden pointer-events-none">

          <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px]" />

        </div>

        <div className="w-full max-w-md relative z-10">

          <div className="rounded-3xl p-8 shadow-2xl bg-neutral-900/80 border border-white/10">

            <div className="flex flex-col items-center text-center">

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-5 shadow-lg shadow-green-500/20">

                <CheckCircle className="w-9 h-9 text-white" />

              </div>

              <h1 className="text-2xl font-bold text-white">
                Password Updated
              </h1>

              <p className="text-sm text-neutral-400 mt-3 leading-6">
                الباسورد تبدل بنجاح.
                <br />
                غادي نرجعوك لصفحة Login.
              </p>

            </div>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-black text-white">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">

        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px]" />

        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />

      </div>

      <div className="w-full max-w-md relative z-10">

        <div className="rounded-3xl p-8 shadow-2xl bg-neutral-900/80 border border-white/10">

          <div className="flex flex-col items-center mb-8">

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">

              <Signal
                className="w-8 h-8 text-white"
                strokeWidth={2.5}
              />

            </div>

            <h1 className="text-3xl font-bold gradient-text">
              Set New Password
            </h1>

            <p className="text-neutral-400 text-sm mt-2 text-center">
              دخل الباسورد الجديد ديالك.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            <div>

              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                New Password
              </label>

              <div className="relative">

                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />

                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
                />

              </div>

            </div>

            <div>

              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                Confirm Password
              </label>

              <div className="relative">

                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />

                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="w-full bg-neutral-900/80 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
                />

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
              className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
            >

              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}

            </button>

          </form>

          <div className="mt-6 text-center text-sm text-neutral-400">

            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}
