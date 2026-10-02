import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Signal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AuthCallbackPage() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const flow = new URLSearchParams(location.search).get('flow');
  const authError = new URLSearchParams(location.search).get('error_description');

  useEffect(() => {
    if (!loading && session) {
      const timer = window.setTimeout(() => navigate('/feed', { replace: true }), 1800);
      return () => window.clearTimeout(timer);
    }
  }, [loading, navigate, session]);

  return (
    <main className="min-h-screen bg-[#090D16] text-white flex items-center justify-center px-4" dir="rtl">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500">
          <Signal className="h-8 w-8" />
        </div>

        {loading ? (
          <>
            <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-rose-400" />
            <h1 className="text-xl font-bold">كنأكدو من الحساب...</h1>
          </>
        ) : session ? (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
            <h1 className="text-xl font-bold">
              {flow === 'signup' ? 'تأكد البريد بنجاح' : 'تم تسجيل الدخول بنجاح'}
            </h1>
            <p className="mt-3 text-sm text-white/60">غادي ندخلوك للتطبيق دابا.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">ما قدرناش نأكدو الحساب</h1>
            <p className="mt-3 text-sm text-white/60">
              {authError || 'الرابط ممكن يكون منتهي أو مستعمل. دخل للحساب وطلب رابط جديد.'}
            </p>
            <Link to="/login" className="mt-6 inline-flex rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-3 font-semibold">
              رجوع لتسجيل الدخول
            </Link>
          </>
        )}
      </section>
    </main>
  );
}