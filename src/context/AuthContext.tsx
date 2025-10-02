// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, UserMode, Gender } from '../types';
import { generateAnonymousUsername } from '../utils/username';

interface AuthContextType {
  user: User | null;
  userMode: UserMode;
  loading: boolean;
  login: (email: string, gender: Gender) => Promise<void>;
  logout: () => Promise<void>;
  enterAnonymous: () => Promise<void>;
  updateKarma: (points: number) => Promise<void>;
  incrementMessageCount: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userMode, setUserMode] = useState<UserMode>('anonymous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserMode('anonymous');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

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
          badges: data.badges as any[],
          dailyMessageCount: data.daily_message_count,
        };

        setUser(userProfile);
        setUserMode(data.is_anonymous ? 'anonymous' : 'verified');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const enterAnonymous = async () => {
    try {
      // Sign in anonymously
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      if (authData.user) {
        // Create user profile
        const anonymousUser = {
          id: authData.user.id,
          username: generateAnonymousUsername(),
          is_verified: false,
          gender: 'unspecified',
          karma_points: 0,
          is_anonymous: true,
          badges: [],
          daily_message_count: 0,
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert(anonymousUser);

        if (insertError) throw insertError;

        await loadUserProfile(authData.user.id);
      }
    } catch (error) {
      console.error('Error entering anonymous:', error);
      throw error;
    }
  };

  const login = async (email: string, gender: Gender) => {
    try {
      // For MVP, use magic link authentication
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (signInError) throw signInError;

      // After email verification, create/update user profile
      // This will be handled by the auth state change listener
      alert('Check your email for the verification link!');
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setUserMode('anonymous');
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  const updateKarma = async (points: number) => {
    if (!user) return;

    try {
      const newKarmaPoints = user.karmaPoints + points;

      const { error } = await supabase
        .from('users')
        .update({ karma_points: newKarmaPoints })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, karmaPoints: newKarmaPoints });
    } catch (error) {
      console.error('Error updating karma:', error);
    }
  };

  const incrementMessageCount = async (): Promise<boolean> => {
    if (!user) return false;

    if (user.isAnonymous && user.dailyMessageCount >= 50) {
      return false;
    }

    try {
      const newCount = user.dailyMessageCount + 1;

      const { error } = await supabase
        .from('users')
        .update({ daily_message_count: newCount })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, dailyMessageCount: newCount });
      return true;
    } catch (error) {
      console.error('Error incrementing message count:', error);
      return false;
    }
  };

  const refreshUser = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userMode,
      loading,
      login,
      logout,
      enterAnonymous,
      updateKarma,
      incrementMessageCount,
      refreshUser,
    }}>
      {!loading && children}
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