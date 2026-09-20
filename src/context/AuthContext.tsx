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

  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;

  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ error: string | null }>;

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
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Session error:', error.message);
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        const hash = window.location.hash;
        const search = window.location.search;

        const isRecoveryUrl =
          hash.includes('type=recovery') ||
          hash.includes('access_token=') ||
          hash.includes('refresh_token=') ||
          search.includes('type=recovery');

        if (isRecoveryUrl) {
          setIsPasswordRecovery(true);
        }

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

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

        await loadProfile(newSession.user.id);

        if (mounted) {
          setLoading(false);
        }
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

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const cleanEmail = email.trim();

        if (!cleanEmail || !password) {
          return {
            error: 'دخل الإيميل والباسورد.',
          };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          const message = error.message.toLowerCase();

          if (
            message.includes('email not confirmed') ||
            message.includes('email_not_confirmed')
          ) {
            return {
              error:
                'الإيميل مازال ما تأكدش. تحقق من الإيميل ديالك ثم حاول تسجيل الدخول من جديد.',
            };
          }

          if (
            message.includes('invalid login credentials') ||
            message.includes('invalid credentials')
          ) {
            return {
              error: 'الإيميل أو الباسورد غير صحيح.',
            };
          }

          return {
            error: error.message,
          };
        }

        if (!data.session) {
          return {
            error:
              'ما قدرناش نفتح Session. إذا كان Email Confirmation شاعل، خاصك تأكد الإيميل أولاً.',
          };
        }

        setSession(data.session);
        setUser(data.user);

        await loadProfile(data.user.id);

        return {
          error: null,
        };
      } catch (error) {
        console.error('Sign in error:', error);

        return {
          error: 'وقع خطأ غير متوقع أثناء تسجيل الدخول.',
        };
      }
    },
    [loadProfile]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      username: string
    ) => {
      try {
        const cleanEmail = email.trim();
        const cleanUsername = username.trim();

        if (!cleanEmail) {
          return {
            error: 'دخل الإيميل.',
          };
        }

        if (!cleanUsername) {
          return {
            error: 'دخل Username.',
          };
        }

        if (password.length < 6) {
          return {
            error: 'الباسورد خاصو يكون على الأقل 6 حروف.',
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

          if (message.includes('user already registered')) {
            return {
              error: 'هاد الإيميل مسجل من قبل.',
            };
          }

          if (message.includes('password')) {
            return {
              error: error.message,
            };
          }

          return {
            error: error.message,
          };
        }

        /*
         * الحالة المهمة:
         *
         * data.user موجود
         * ولكن data.session = null
         *
         * هادي كتوقع غالباً ملي Email Confirmation شاعل.
         */

        if (data.user && !data.session) {
          setUser(data.user);
          setSession(null);

          return {
            error:
              'تم إنشاء الحساب بنجاح. تحقق من الإيميل ديالك من فضلك، ومن بعد رجع وسجل الدخول.',
          };
        }

        /*
         * Email Confirmation مطفي:
         * Supabase كيعطينا session مباشرة.
         */

        if (data.user && data.session) {
          setSession(data.session);
          setUser(data.user);

          await loadProfile(data.user.id);

          return {
            error: null,
          };
        }

        return {
          error: 'ما قدرناش نكملو إنشاء الحساب.',
        };
      } catch (error) {
        console.error('Sign up error:', error);

        return {
          error: 'وقع خطأ غير متوقع أثناء إنشاء الحساب.',
        };
      }
    },
    [loadProfile]
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }

    setProfile(null);
    setUser(null);
    setSession(null);
    setIsPasswordRecovery(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isPasswordRecovery,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
}
