import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
  user: any | null;
  session: any | null;
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
    user: any | null;
  }>;
  verifyEmailOtp: (
    email: string,
    token: string
  ) => Promise<{
    error: Error | null;
    user: any | null;
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
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
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

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
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
