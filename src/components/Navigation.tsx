import { MessageSquare, Users, CircleUser as UserCircle, Trophy, Zap } from 'lucide-react';

type Tab = 'mega' | 'rooms' | 'onetoone' | 'leaderboard' | 'profile';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const tabs = [
    { id: 'mega' as const, label: 'Mega Chat', icon: Zap },
    { id: 'rooms' as const, label: 'Rooms', icon: Users },
    { id: 'onetoone' as const, label: '1:1', icon: MessageSquare },
    { id: 'leaderboard' as const, label: 'Ranks', icon: Trophy },
    { id: 'profile' as const, label: 'Profile', icon: UserCircle },
  ];

  return (
    <nav className="bg-slate-800 border-t border-slate-700">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive
                  ? 'text-blue-400'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
