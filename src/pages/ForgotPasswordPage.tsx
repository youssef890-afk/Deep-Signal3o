import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { Signal, ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('تم إرسال رابط إعادة ضبط كلمة السر إلى بريدك الإلكتروني.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center mb-2">
            <Signal className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">استعادة كلمة السر</h1>
        </div>

        {message && <div className="p-3 mb-4 bg-green-500/20 text-green-400 rounded-xl text-sm text-center">{message}</div>}
        {error && <div className="p-3 mb-4 bg-red-500/20 text-red-400 rounded-xl text-sm text-center">{error}</div>}

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="أدخل بريدك الإلكتروني"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-rose-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إرسال الرابط'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-neutral-400 hover:text-white flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}

