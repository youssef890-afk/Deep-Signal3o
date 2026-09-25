import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const sendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();

    setError("");
    setMessage("");

    if (!cleanEmail) {
      setError("دخل البريد الإلكتروني");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail
      );

      if (error) {
        setError(error.message);
        return;
      }

      setStep("otp");
      setMessage("صيفطنا ليك رمز التحقق من 6 أرقام");
    } catch {
      setError("وقع خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(cleanOtp)) {
      setError("دخل رمز من 6 أرقام");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: "recovery",
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (!data.session) {
        setError("تعذر إنشاء جلسة استرجاع كلمة السر");
        return;
      }

      navigate("/reset-password");
    } catch {
      setError("رمز التحقق غير صحيح أو منتهي الصلاحية");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();

    setError("");
    setMessage("");
    setResending(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail
      );

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("عاودنا صيفطنا ليك رمز التحقق");
    } catch {
      setError("ما قدرناش نعاودو نصيفطو الرمز");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={18} />
            رجوع
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6 shadow-2xl">
          {step === "email" ? (
            <>
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-5">
                <Mail size={26} />
              </div>

              <h1 className="text-2xl font-bold mb-2">
                نسيت كلمة السر؟
              </h1>

              <p className="text-gray-400 mb-6">
                دخل الإيميل ديالك وغادي نصيفطو ليك رمز تحقق من 6 أرقام.
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-white/30 mb-4"
                autoComplete="email"
              />

              {error && (
                <p className="text-red-400 text-sm mb-4">
                  {error}
                </p>
              )}

              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full rounded-xl bg-white text-black py-3 font-semibold disabled:opacity-50"
              >
                {loading ? "جاري الإرسال..." : "صيفط ليا الرمز"}
              </button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-5">
                <ShieldCheck size={26} />
              </div>

              <h1 className="text-2xl font-bold mb-2">
                رمز التحقق
              </h1>

              <p className="text-gray-400 mb-6">
                دخل الرمز المكون من 6 أرقام اللي توصلتي به في:
                <br />
                <span className="text-white">{email}</span>
              </p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none focus:border-white/30 mb-4"
              />

              {error && (
                <p className="text-red-400 text-sm mb-4">
                  {error}
                </p>
              )}

              {message && (
                <p className="text-green-400 text-sm mb-4">
                  {message}
                </p>
              )}

              <button
                onClick={verifyOtp}
                disabled={loading}
                className="w-full rounded-xl bg-white text-black py-3 font-semibold disabled:opacity-50"
              >
                {loading ? "جاري التحقق..." : "تحقق من الرمز"}
              </button>

              <button
                onClick={resendOtp}
                disabled={resending}
                className="w-full mt-4 text-gray-400 hover:text-white text-sm"
              >
                {resending
                  ? "جاري إعادة الإرسال..."
                  : "ما وصلنيش الرمز؟ عاود الإرسال"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
