import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  resendVerificationCode: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('Error loading profile:', error.message);
        return;
      }
      setProfile(data as Profile | null);
    } catch (error) {
      console.error('Unexpected profile error:', error);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) console.error('Session error:', error.message);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        const hash = window.location.hash;
        const search = window.location.search;
        const isRecoveryUrl = hash.includes('type=recovery') || search.includes('type=recovery');
        if (isRecoveryUrl) setIsPasswordRecovery(true);

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsPasswordRecovery(false);
        setLoading(false);
        return;
      }

      if (newSession?.user) {
        setLoading(true);
        void loadProfile(newSession.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) return { error: 'دخل الإيميل والباسورد.' };

      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
          return { error: 'الإيميل مازال ما تأكدش. دخل رمز التحقق اللي توصلك فالإيميل.' };
        }
        if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
          return { error: 'الإيميل أو الباسورد غير صحيح.' };
        }
        return { error: error.message };
      }
      if (!data.session || !data.user) return { error: 'ما قدرناش نفتح Session.' };
      setSession(data.session);
      setUser(data.user);
      void loadProfile(data.user.id);
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'وقع خطأ غير متوقع أثناء تسجيل الدخول.' };
    }
  }, [loadProfile]);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanEmail) return { error: 'دخل الإيميل.' };
      if (!cleanUsername) return { error: 'دخل Username.' };
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) return { error: 'Username خاصو يكون بين 3 و30 حرف، ويحتوي غير على a-z و 0-9 و _.' };
      if (password.length < 8) return { error: 'الباسورد خاصو يكون على الأقل 8 حروف.' };

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { username: cleanUsername } },
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes('user already registered') || message.includes('already registered')) {
          return { error: 'هاد الإيميل مسجل من قبل.' };
        }
        if (message.includes('email rate limit exceeded')) {
          return { error: 'تم تجاوز الحد المؤقت لإرسال أكواد الإيميل. تسنى شوية وحاول من بعد.' };
        }
        if (message.includes('username') || message.includes('profiles') || message.includes('duplicate')) {
          return { error: 'هاد Username مستعمل من قبل. اختار Username آخر.' };
        }
        return { error: error.message };
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      if (data.session?.user) void loadProfile(data.session.user.id);
      else setProfile(null);
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: 'وقع خطأ غير متوقع أثناء إنشاء الحساب.' };
    }
  }, [loadProfile]);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = token.trim();
      if (!cleanEmail) return { error: 'الإيميل مفقود.' };
      if (!/^\d{6}$/.test(cleanToken)) return { error: 'رمز التحقق خاصو يكون 6 أرقام.' };

      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup',
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes('invalid') || message.includes('expired') || message.includes('otp') || message.includes('token')) {
          return { error: 'رمز التحقق غير صحيح أو انتهت صلاحيته.' };
        }
        return { error: error.message };
      }
      if (!data.session || !data.user) return { error: 'تم التحقق ولكن ما قدرناش نفتح Session.' };
      setSession(data.session);
      setUser(data.user);
      await loadProfile(data.user.id);
      return { error: null };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { error: 'وقع خطأ أثناء التحقق من الرمز.' };
    }
  }, [loadProfile]);

  const resendVerificationCode = useCallback(async (email: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return { error: 'الإيميل مفقود.' };

      const { error } = await supabase.auth.resend({ type: 'signup', email: cleanEmail });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes('email rate limit exceeded') || message.includes('rate limit')) {
          return { error: 'تم تجاوز الحد المؤقت للإرسال. تسنى شوية قبل ما تطلب كود جديد.' };
        }
        return { error: error.message };
      }
      return { error: null };
    } catch (error) {
      console.error('Resend OTP error:', error);
      return { error: 'ما قدرناش نعاودو نرسلو الكود.' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); }
    catch (error) { console.error('Sign out error:', error); }
    setProfile(null);
    setUser(null);
    setSession(null);
    setIsPasswordRecovery(false);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, isPasswordRecovery, signIn, signUp, verifyEmailOtp, resendVerificationCode, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
