import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import WelcomeScreen from './components/WelcomeScreen';
import MegaChat from './components/MegaChat';
import SmallRooms from './components/SmallRooms';
import OneToOne from './components/OneToOne';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';
import Navigation from './components/Navigation';

type Tab = 'mega' | 'rooms' | 'onetoone' | 'leaderboard' | 'profile';

function AppContent() {
  const { user, loading } = useAuth(); // <-- Get loading state
  const [activeTab, setActiveTab] = useState<Tab>('mega');

  // FIX: Render a loading screen while auth is checking the session
  if (loading) {
    return (
        <div className="h-screen flex items-center justify-center bg-slate-900">
            <div className="text-white text-xl font-bold">Loading CampusChat...</div>
        </div>
    );
  }

  if (!user) {
    return <WelcomeScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">CampusChat</h1>
              <p className="text-slate-400 text-xs">Always active, always anonymous</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-slate-400 text-xs">Karma</p>
              <p className="text-amber-400 font-bold">{user.karmaPoints}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'mega' && <MegaChat />}
        {activeTab === 'rooms' && <SmallRooms />}
        {activeTab === 'onetoone' && <OneToOne />}
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'profile' && <Profile />}
      </main>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
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