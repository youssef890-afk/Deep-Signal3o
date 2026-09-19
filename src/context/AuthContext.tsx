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
    } catch (err) {
      console.error('Network error loading profile:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 4000);

    const checkSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      const hash = window.location.hash;
      const search = window.location.search;

      const hasRecoveryUrl =
        hash.includes('type=recovery') ||
        hash.includes('access_token=') ||
        hash.includes('refresh_token=') ||
        search.includes('type=recovery');

      if (hasRecoveryUrl) {
        setIsPasswordRecovery(true);
      }

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
        setProfile(null);
      }

      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data }) => {
          if (!mounted) return;

          if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
          }
        });
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      window.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) {
          return { error: error.message };
        }

        if (data.user) {
          await loadProfile(data.user.id);
        }

        return { error: null };
      } catch (err) {
        return { error: 'حدث خطأ غير متوقع' };
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });

        if (error) {
          return { error: error.message };
        }

        if (data.user) {
          await loadProfile(data.user.id);
        }

        return { error: null };
      } catch (err) {
        return { error: 'حدث خطأ غير متوقع' };
      }
    },
    [loadProfile]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();

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
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}
