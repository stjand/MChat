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
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user);
      } else {
        setUser(null);
        setUserMode('anonymous');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Failed to load session');
      }

      if (session?.user) {
        await loadUserProfile(session.user.id, session.user);
      }
    } catch (err) {
      console.error('Error checking user:', err);
      setError('Failed to authenticate');
    } finally {
      // FIX: Use setTimeout to ensure setLoading(false) runs 
      // as a separate task, guaranteeing state update.
      setTimeout(() => {
        setLoading(false);
      }, 50); // A small delay of 50ms is usually enough
    }
  };

// ...

  const loadUserProfile = async (userId: string, authUser?: SupabaseUser) => {
    try {
      let { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // If profile doesn't exist, create it
      if (fetchError && fetchError.code === 'PGRST116') {
        if (!authUser) {
          throw new Error('Cannot create profile without auth user data');
        }

        const isVerified = !!authUser.email;
        const username = authUser.email 
          ? authUser.email.split('@')[0] 
          : generateAnonymousUsername();

        const newUserProfile = {
          id: userId,
          username,
          is_verified: isVerified,
          gender: 'unspecified' as Gender,
          college_email: authUser.email || null,
          college_name: authUser.email ? extractCollegeName(authUser.email) : null,
          karma_points: 0,
          is_anonymous: !isVerified,
          badges: isVerified ? ['verified'] : [],
          daily_message_count: 0,
        };

        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert(newUserProfile)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }
        
        data = insertData;
      } else if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        throw fetchError;
      }

      if (data) {
        const userProfile: User = {
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
        };

        setUser(userProfile);
        setUserMode(data.is_anonymous ? 'anonymous' : 'verified');
        setError(null);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Failed to load profile');
    }
  };

  const enterAnonymous = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError) {
        throw new Error(`Anonymous sign-in failed: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('No user returned from anonymous sign-in');
      }

      // Profile creation is now handled by database trigger or loadUserProfile
      await loadUserProfile(authData.user.id, authData.user);
      
    } catch (err: any) {
      console.error('Error entering anonymous:', err);
      setError(err.message || 'Failed to enter anonymously');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, gender: Gender) => {
    setError(null);
    setLoading(true);

    try {
      // Validate email first
      const validation = validateCollegeEmail(email);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid email');
      }

      // Send magic link
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: validation.email!,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            gender,
            college_name: validation.collegeName,
          },
        },
      });

      if (signInError) {
        throw new Error(`Login failed: ${signInError.message}`);
      }

      // Success - user will receive email
      setError(null);
      
    } catch (err: any) {
      console.error('Error logging in:', err);
      setError(err.message || 'Failed to send verification email');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        throw new Error(`Logout failed: ${signOutError.message}`);
      }

      setUser(null);
      setUserMode('anonymous');
      
    } catch (err: any) {
      console.error('Error logging out:', err);
      setError(err.message || 'Failed to logout');
      throw err;
    }
  };

  const updateKarma = async (points: number) => {
    if (!user) return;

    try {
      const newKarmaPoints = user.karmaPoints + points;

      const { error: updateError } = await supabase
        .from('users')
        .update({ karma_points: newKarmaPoints })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating karma:', updateError);
        return;
      }

      setUser({ ...user, karmaPoints: newKarmaPoints });
      
    } catch (err) {
      console.error('Error updating karma:', err);
    }
  };

  const incrementMessageCount = async (): Promise<boolean> => {
    if (!user) return false;

    // Check limit for anonymous users
    if (user.isAnonymous && user.dailyMessageCount >= 50) {
      return false;
    }

    try {
      const newCount = user.dailyMessageCount + 1;

      const { error: updateError } = await supabase
        .from('users')
        .update({ daily_message_count: newCount })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error incrementing message count:', updateError);
        return false;
      }

      setUser({ ...user, dailyMessageCount: newCount });
      return true;
      
    } catch (err) {
      console.error('Error incrementing message count:', err);
      return false;
    }
  };

  const refreshUser = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userMode,
      loading, // Pass loading state
      error,
      login,
      logout,
      enterAnonymous,
      updateKarma,
      incrementMessageCount,
      refreshUser,
      clearError,
    }}>
      {/* ALWAYS render children. Loading state check is moved to AppContent. */}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}