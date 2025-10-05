import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import WelcomeScreen from './components/WelcomeScreen';
import MegaChat from './components/MegaChat';
import PrivateChat from './components/PrivateChat';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';
import Sidebar from './components/sidebar';
import MobileNav from './components/mobileNav';

type Tab = 'mega' | 'private' | 'leaderboard' | 'profile';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('mega');

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-sm text-slate-600 font-medium">Loading CampusChat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <WelcomeScreen />;
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} user={user} />
      
      <main className="flex-1 flex flex-col pb-16 lg:pb-0">
        {activeTab === 'mega' && <MegaChat />}
        {activeTab === 'private' && <PrivateChat />}
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'profile' && <Profile />}
      </main>

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;