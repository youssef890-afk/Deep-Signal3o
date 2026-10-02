import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface Profile {
  id: string;
  username: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  display_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
  }>;
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<{
    error: Error | null;
    user: User | null;
  }>;
  verifyRecoveryOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  sendRecoveryOtp: (email: string) => Promise<{ error: Error | null }>;
  resendRecoveryOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyEmailOtp: (
    email: string,
    token: string
  ) => Promise<{
    error: Error | null;
    user: User | null;
  }>;
  resendVerificationCode: (
    email: string
  ) => Promise<{
    error: Error | null;
  }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureProfileExists = async (userData: User) => {
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userData.id)
        .maybeSingle();

      if (existing) return;

      const email = userData.email || '';
      const meta = userData.user_metadata || {};
      const raw = (meta.username || email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';

      let finalUsername = raw;
      let counter = 0;
      while (counter < 50) {
        const { data: exists } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', finalUsername)
          .maybeSingle();
        if (!exists) break;
        counter++;
        finalUsername = raw.slice(0, 15) + '_' + counter;
      }

      await supabase.from('profiles').insert({
        id: userData.id,
        username: finalUsername,
        full_name: meta.full_name || meta.name || '',
        avatar_url: meta.avatar_url || meta.picture || null,
      });

    } catch (e) {
      console.error('ensureProfileExists error:', e);
    }
  };

  const loadProfile = async (userId: string) => {
    // ⚠️ Skip if in recovery mode
    if (sessionStorage.getItem('password_recovery') === '1') {
      console.log('SKIP LOAD PROFILE - recovery mode');
      return;
    }
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Profile loading error:", error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("Profile loading error:", error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let profileSyncTimeout: number | undefined;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await ensureProfileExists(session.user);
          await loadProfile(session.user.id);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('password_recovery', '1');
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        window.clearTimeout(profileSyncTimeout);
        profileSyncTimeout = window.setTimeout(() => {
          if (!mounted || sessionStorage.getItem('password_recovery') === '1') return;
          void ensureProfileExists(session.user).then(() => loadProfile(session.user.id));
        }, 0);
      } else {
        window.clearTimeout(profileSyncTimeout);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(profileSyncTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return {
          error: new Error(error.message),
        };
      }

      return { error: null };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("حدث خطأ أثناء تسجيل الدخول"),
      };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string
  ) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim().toLowerCase();

      if (!cleanEmail) {
        return {
          error: new Error("دخل البريد الإلكتروني"),
          user: null,
        };
      }

      if (password.length < 8) {
        return {
          error: new Error("كلمة السر خاصها تكون 8 أحرف على الأقل"),
          user: null,
        };
      }

      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        return {
          error: new Error(
            "Username خاصو يكون بين 3 و30 حرف، غير الحروف والأرقام و _"
          ),
          user: null,
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup`,
          data: {
            username: cleanUsername,
          },
        },
      });

      if (error) {
        const message = error.message.toLowerCase();

        if (message.includes("rate limit")) {
          return {
            error: new Error(
              "تم تجاوز عدد المحاولات. تسنى شوية وحاول مرة أخرى."
            ),
            user: null,
          };
        }

        if (
          message.includes("already registered") ||
          message.includes("already been registered")
        ) {
          return {
            error: new Error("هاد الإيميل مسجل من قبل"),
            user: null,
          };
        }

        return {
          error: new Error(error.message),
          user: null,
        };
      }

      return {
        error: null,
        user: data.user ?? null,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("وقع خطأ أثناء إنشاء الحساب"),
        user: null,
      };
    }
  };

  const verifyEmailOtp = async (email: string, token: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = token.trim();

      if (!/^\d{6}$/.test(cleanToken)) {
        return {
          error: new Error("رمز التحقق خاصو يكون 6 أرقام"),
          user: null,
        };
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "signup",
      });

      if (error) {
        return {
          error: new Error(error.message),
          user: null,
        };
      }

      if (!data.user) {
        return {
          error: new Error("ما قدرناش نتحققو من الحساب"),
          user: null,
        };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        await loadProfile(data.user.id);
      }

      return {
        error: null,
        user: data.user,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("رمز التحقق غير صالح أو منتهي الصلاحية"),
        user: null,
      };
    }
  };

  const verifyRecoveryOtp = async (email: string, token: string) => {
    sessionStorage.setItem('password_recovery', '1');
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = token.trim();

      if (cleanToken.length !== 6) {
        sessionStorage.removeItem('password_recovery');
        return { error: new Error('رمز التحقق خاصو يكون 6 أرقام') };
      }

      const result = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'recovery',
      });

      if (result.error) {
        sessionStorage.removeItem('password_recovery');
        return { error: new Error(result.error.message) };
      }

      if (!result.data.session) {
        sessionStorage.removeItem('password_recovery');
        return { error: new Error('ما قدرناش نفتح Session') };
      }

      setSession(result.data.session);
      setUser(result.data.user);
      return { error: null };
    } catch (error) {
      sessionStorage.removeItem('password_recovery');
      const msg = error instanceof Error ? error.message : 'خطأ غير متوقع';
      return { error: new Error(msg) };
    }
  };

  const sendRecoveryOtp = async (email: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return { error: new Error('دخل البريد الإلكتروني') };

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('ما قدرناش نعاودو نصيفطو رمز التحقق'),
      };
    }
  };

  const resendRecoveryOtp = sendRecoveryOtp;

  const resendVerificationCode = async (email: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        return {
          error: new Error("دخل البريد الإلكتروني"),
        };
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup` },
      });

      if (error) {
        return {
          error: new Error(error.message),
        };
      }

      return {
        error: null,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("ما قدرناش نعاودو نصيفطو رمز التحقق"),
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    await loadProfile(user.id);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    verifyRecoveryOtp,
    sendRecoveryOtp,
    resendRecoveryOtp,
    verifyEmailOtp,
    resendVerificationCode,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
