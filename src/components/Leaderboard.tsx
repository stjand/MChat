import { useState } from 'react';
import { Trophy, Crown, Medal, Flame } from 'lucide-react';
import { LeaderboardEntry } from '../types';

type LeaderboardCategory = 'top_boy' | 'top_girl' | 'funniest' | 'night_owl';

const MOCK_LEADERBOARD: Record<LeaderboardCategory, LeaderboardEntry[]> = {
  top_boy: [
    { userId: '1', username: 'CoolDude123', score: 2450, rank: 1, isVerified: true },
    { userId: '2', username: 'BlueWolf789', score: 2180, rank: 2, isVerified: false },
    { userId: '3', username: 'TechKing', score: 1920, rank: 3, isVerified: true },
    { userId: '4', username: 'GoldenEagle', score: 1750, rank: 4, isVerified: true },
    { userId: '5', username: 'RedPanther', score: 1680, rank: 5, isVerified: false },
  ],
  top_girl: [
    { userId: '6', username: 'StarGirl', score: 2890, rank: 1, isVerified: true },
    { userId: '7', username: 'PinkPhoenix', score: 2320, rank: 2, isVerified: true },
    { userId: '8', username: 'MoonQueen', score: 2100, rank: 3, isVerified: false },
    { userId: '9', username: 'SilverFox', score: 1980, rank: 4, isVerified: true },
    { userId: '10', username: 'GreenDragon', score: 1840, rank: 5, isVerified: true },
  ],
  funniest: [
    { userId: '11', username: 'ComedyKing', score: 3450, rank: 1, isVerified: true },
    { userId: '12', username: 'LaughMaster', score: 3120, rank: 2, isVerified: true },
    { userId: '13', username: 'JokeStar', score: 2890, rank: 3, isVerified: false },
    { userId: '14', username: 'FunnyBone', score: 2650, rank: 4, isVerified: true },
    { userId: '15', username: 'GiggleQueen', score: 2430, rank: 5, isVerified: false },
  ],
  night_owl: [
    { userId: '16', username: 'MidnightChat', score: 1890, rank: 1, isVerified: true },
    { userId: '17', username: 'NightWarrior', score: 1720, rank: 2, isVerified: true },
    { userId: '18', username: 'DarkKnight', score: 1650, rank: 3, isVerified: false },
    { userId: '19', username: 'LateNighter', score: 1540, rank: 4, isVerified: true },
    { userId: '20', username: 'InsomniacKing', score: 1490, rank: 5, isVerified: true },
  ],
};

export default function Leaderboard() {
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('top_boy');

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-amber-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-slate-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-400" />;
      default:
        return <span className="text-slate-500 font-bold">#{rank}</span>;
    }
  };

  const categories = [
    { id: 'top_boy' as const, label: 'Top Boys', icon: Trophy },
    { id: 'top_girl' as const, label: 'Top Girls', icon: Trophy },
    { id: 'funniest' as const, label: 'Funniest', icon: Flame },
    { id: 'night_owl' as const, label: 'Night Owls', icon: Flame },
  ];

  return (
    <div className="h-full bg-slate-900 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center mb-8">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-slate-400">
            Top students in your campus
          </p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
          {MOCK_LEADERBOARD[activeCategory].map((entry, index) => (
            <div
              key={entry.userId}
              className={`flex items-center justify-between p-4 transition-colors ${
                index < MOCK_LEADERBOARD[activeCategory].length - 1
                  ? 'border-b border-slate-700'
                  : ''
              } ${
                entry.rank === 1
                  ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/20'
                  : entry.rank === 2
                  ? 'bg-gradient-to-r from-slate-800/50 to-slate-700/20'
                  : entry.rank === 3
                  ? 'bg-gradient-to-r from-orange-900/20 to-slate-800/20'
                  : 'hover:bg-slate-700/30'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 flex items-center justify-center">
                  {getRankIcon(entry.rank)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {entry.username}
                    </span>
                    {entry.isVerified && (
                      <span className="text-emerald-400 text-xs">✅</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-lg">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">karma points</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-700/50 rounded-xl p-6">
          <h3 className="font-bold text-white mb-3">How to climb the ranks:</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Send messages in Mega Chat and rooms (+1 karma each)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>React to messages and posts (+1 karma)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Get reactions on your messages (+3 karma per reaction)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Daily login streak bonus (+10 karma)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Win icebreaker votes in rooms (+5 karma)</span>
            </li>
          </ul>
        </div>

        <div className="mt-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
          <p className="text-slate-400 text-sm">
            Leaderboard resets weekly. Keep grinding! 🔥
          </p>
        </div>
      </div>
    </div>
  );
}
