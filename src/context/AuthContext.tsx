// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, UserMode, Gender } from '../types';
import { generateAnonymousUsername } from '../utils/username';
import { validateCollegeEmail, extractCollegeName } from '../utils/emailVerification';

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextType {
  user: User | null;
  userMode: UserMode;
  loading: boolean;
  error: string | null;
  login: (email: string, gender: Gender) => Promise<void>;
  logout: () => Promise<void>;
  enterAnonymous: () => Promise<void>;
  updateKarma: (points: number) => Promise<void>;
  incrementMessageCount: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userMode, setUserMode] = useState<UserMode>('anonymous');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  let isInitialLoad = true;
  let loadingTimeoutId: NodeJS.Timeout | null = null;

  const forceStopLoading = () => {
  console.log('Force stopping loading');
  setLoading(false);
};

loadingTimeoutId = setTimeout(forceStopLoading, 2000);

  const init = async () => {
    // Emergency timeout
    loadingTimeoutId = setTimeout(forceStopLoading, 2000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        try {
          await Promise.race([
            loadUserProfile(session.user.id, session.user),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
        } catch (err) {
          console.error('Profile load failed on init:', err);
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      console.error('Init error:', err);
    } finally {
      if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
      setLoading(false);
      isInitialLoad = false;
    }
  };

  init();

  // Handle page visibility changes (minimize/restore)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('Page became visible');
      // If loading is stuck, force it to stop
      if (loading) {
        setTimeout(forceStopLoading, 1000);
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    // Ignore state changes during initial load
    if (isInitialLoad) return;

    console.log('Auth state changed:', event);

    if (event === 'SIGNED_OUT') {
      setUser(null);
      setUserMode('anonymous');
      setLoading(false);
    } else if (event === 'SIGNED_IN' && session?.user) {
      setLoading(true);
      
      // Set timeout for this loading state too
      const stateChangeTimeout = setTimeout(forceStopLoading, 2000);
      
      try {
        await loadUserProfile(session.user.id, session.user);
      } catch (err) {
        console.error('Profile load failed:', err);
        await supabase.auth.signOut();
      } finally {
        clearTimeout(stateChangeTimeout);
        setLoading(false);
      }
    }
  });

  return () => {
    if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    subscription.unsubscribe();
  };
}, []);

  const loadUserProfile = async (userId: string, authUser?: SupabaseUser) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        if (!authUser) throw new Error('No auth user');

        const isVerified = !!authUser.email;
        const username = authUser.email?.split('@')[0] || generateAnonymousUsername();

        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            username,
            is_verified: isVerified,
            gender: 'unspecified',
            college_email: authUser.email || null,
            college_name: authUser.email ? extractCollegeName(authUser.email) : null,
            karma_points: 0,
            is_anonymous: !isVerified,
            badges: isVerified ? ['verified'] : [],
            daily_message_count: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setUser({
          id: newUser.id,
          username: newUser.username,
          isVerified: newUser.is_verified,
          gender: newUser.gender as Gender,
          collegeEmail: newUser.college_email || undefined,
          collegeName: newUser.college_name || undefined,
          karmaPoints: newUser.karma_points,
          isAnonymous: newUser.is_anonymous,
          badges: newUser.badges || [],
          dailyMessageCount: newUser.daily_message_count,
        });
        setUserMode(newUser.is_anonymous ? 'anonymous' : 'verified');
        return;
      }

      setUser({
        id: data.id,
        username: data.username,
        isVerified: data.is_verified,
        gender: data.gender as Gender,
        collegeEmail: data.college_email || undefined,
        collegeName: data.college_name || undefined,
        karmaPoints: data.karma_points,
        isAnonymous: data.is_anonymous,
        badges: data.badges || [],
        dailyMessageCount: data.daily_message_count,
      });
      setUserMode(data.is_anonymous ? 'anonymous' : 'verified');
    } catch (err: any) {
      console.error('Profile error:', err);
      throw err;
    }
  };

  const enterAnonymous = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInAnonymously();
      if (authError || !data.user) throw new Error('Sign in failed');

      await loadUserProfile(data.user.id, data.user);
    } catch (err: any) {
      setError(err.message);
      alert('Failed to enter: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, gender: Gender) => {
    setLoading(true);
    try {
      const validation = validateCollegeEmail(email);
      if (!validation.isValid) throw new Error(validation.error || 'Invalid email');

      const { error } = await supabase.auth.signInWithOtp({
        email: validation.email!,
        options: {
          emailRedirectTo: window.location.origin,
          data: { gender, college_name: validation.collegeName },
        },
      });

      if (error) throw error;
      alert('Check your email!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserMode('anonymous');
  };

  const updateKarma = async (points: number) => {
    if (!user) return;
    const newKarma = user.karmaPoints + points;
    await supabase.from('users').update({ karma_points: newKarma }).eq('id', user.id);
    setUser({ ...user, karmaPoints: newKarma });
  };

  const incrementMessageCount = async (): Promise<boolean> => {
    if (!user || (user.isAnonymous && user.dailyMessageCount >= 50)) return false;
    const newCount = user.dailyMessageCount + 1;
    const { error } = await supabase.from('users').update({ daily_message_count: newCount }).eq('id', user.id);
    if (!error) setUser({ ...user, dailyMessageCount: newCount });
    return !error;
  };

  const refreshUser = async () => {
    if (user) await loadUserProfile(user.id);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      user, userMode, loading, error,
      login, logout, enterAnonymous,
      updateKarma, incrementMessageCount,
      refreshUser, clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}