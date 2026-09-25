import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const updatePassword = async () => {
    setError("");

    if (password.length < 8) {
      setError("كلمة السر خاصها تكون 8 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمات السر ما متطابقاش");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch {
      setError("وقع خطأ أثناء تغيير كلمة السر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6 shadow-2xl">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle
                size={55}
                className="mx-auto mb-5 text-green-400"
              />

              <h1 className="text-2xl font-bold mb-2">
                تبدلات كلمة السر
              </h1>

              <p className="text-gray-400">
                دابا تقدر تدخل بالحساب ديالك.
              </p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-5">
                <Lock size={26} />
              </div>

              <h1 className="text-2xl font-bold mb-2">
                كلمة سر جديدة
              </h1>

              <p className="text-gray-400 mb-6">
                دخل كلمة السر الجديدة ديالك.
              </p>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة السر الجديدة"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-white/30 mb-3"
                autoComplete="new-password"
              />

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="عاود كلمة السر"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-white/30 mb-4"
                autoComplete="new-password"
              />

              {error && (
                <p className="text-red-400 text-sm mb-4">
                  {error}
                </p>
              )}

              <button
                onClick={updatePassword}
                disabled={loading}
                className="w-full rounded-xl bg-white text-black py-3 font-semibold disabled:opacity-50"
              >
                {loading
                  ? "جاري التغيير..."
                  : "تغيير كلمة السر"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
