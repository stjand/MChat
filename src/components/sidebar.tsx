import { MessageSquare, Users, Trophy, User } from 'lucide-react';

type Tab = 'mega' | 'private' | 'leaderboard' | 'profile';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  user: any;
}

export default function Sidebar({ activeTab, onTabChange, user }: SidebarProps) {
  const navItems = [
    { id: 'mega' as const, label: 'Mega Chat', icon: MessageSquare, description: 'Campus feed' },
    { id: 'private' as const, label: 'Private Chats', icon: Users, description: 'Match & chat' },
    { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy, description: 'Top users' },
    { id: 'profile' as const, label: 'Profile', icon: User, description: 'Your account' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 border-r border-slate-100 bg-white">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">CampusChat</h1>
            <p className="text-xs text-slate-500 leading-tight mt-0.5">{user.collegeName || 'Anonymous'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full group flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon 
                className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}
                strokeWidth={2}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                  {item.label}
                </p>
                <p className={`text-xs leading-tight mt-0.5 ${
                  isActive ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
            {user.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate leading-tight">
              {user.username || 'Anonymous'}
            </p>
            <p className="text-xs text-slate-500 leading-tight mt-0.5">
              {user.karmaPoints || 0} karma
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}