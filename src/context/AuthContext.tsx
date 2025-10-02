import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserMode, Gender } from '../types';
import { generateAnonymousUsername } from '../utils/username';

interface AuthContextType {
  user: User | null;
  userMode: UserMode;
  login: (email: string, gender: Gender) => Promise<void>;
  logout: () => void;
  enterAnonymous: () => void;
  updateKarma: (points: number) => void;
  incrementMessageCount: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userMode, setUserMode] = useState<UserMode>('anonymous');

  useEffect(() => {
    const savedUser = localStorage.getItem('campus_chat_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setUserMode(parsed.isAnonymous ? 'anonymous' : 'verified');
    }
  }, []);

  const enterAnonymous = () => {
    const anonymousUser: User = {
      id: crypto.randomUUID(),
      username: generateAnonymousUsername(),
      isVerified: false,
      gender: 'unspecified',
      karmaPoints: 0,
      isAnonymous: true,
      badges: [],
      dailyMessageCount: 0,
    };

    setUser(anonymousUser);
    setUserMode('anonymous');
    localStorage.setItem('campus_chat_user', JSON.stringify(anonymousUser));
  };

  const login = async (email: string, gender: Gender) => {
    const verifiedUser: User = {
      id: crypto.randomUUID(),
      username: email.split('@')[0],
      isVerified: true,
      gender,
      collegeEmail: email,
      collegeName: email.split('@')[1]?.split('.')[0] || 'College',
      karmaPoints: 50,
      isAnonymous: false,
      badges: ['verified'],
      dailyMessageCount: 0,
    };

    setUser(verifiedUser);
    setUserMode('verified');
    localStorage.setItem('campus_chat_user', JSON.stringify(verifiedUser));
  };

  const logout = () => {
    setUser(null);
    setUserMode('anonymous');
    localStorage.removeItem('campus_chat_user');
  };

  const updateKarma = (points: number) => {
    if (user) {
      const updatedUser = { ...user, karmaPoints: user.karmaPoints + points };
      setUser(updatedUser);
      localStorage.setItem('campus_chat_user', JSON.stringify(updatedUser));
    }
  };

  const incrementMessageCount = (): boolean => {
    if (!user) return false;

    if (user.isAnonymous && user.dailyMessageCount >= 50) {
      return false;
    }

    const updatedUser = { ...user, dailyMessageCount: user.dailyMessageCount + 1 };
    setUser(updatedUser);
    localStorage.setItem('campus_chat_user', JSON.stringify(updatedUser));
    return true;
  };

  return (
    <AuthContext.Provider value={{
      user,
      userMode,
      login,
      logout,
      enterAnonymous,
      updateKarma,
      incrementMessageCount,
    }}>
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
