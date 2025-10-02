import { Trophy, Flame, Users, Award, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BadgeType } from '../types';

const BADGE_CONFIG: Record<BadgeType, { icon: string; label: string; color: string }> = {
  verified: { icon: '✅', label: 'Verified Student', color: 'text-emerald-400' },
  streak: { icon: '🔥', label: '7-Day Streak', color: 'text-orange-400' },
  party_animal: { icon: '🎉', label: 'Party Animal', color: 'text-pink-400' },
  night_owl: { icon: '🦉', label: 'Night Owl', color: 'text-cyan-400' },
  funniest: { icon: '😂', label: 'Comedy King/Queen', color: 'text-yellow-400' },
};

export default function Profile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="h-full bg-slate-900 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {user.username}
              </h1>
              <div className="flex items-center gap-2">
                {user.isVerified ? (
                  <span className="flex items-center gap-1 text-sm bg-emerald-900/50 text-emerald-300 px-3 py-1 rounded-full">
                    <Shield className="w-3 h-3" />
                    Verified Student
                  </span>
                ) : (
                  <span className="text-sm bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
                    Anonymous Mode
                  </span>
                )}
              </div>
              {user.collegeName && (
                <p className="text-slate-400 text-sm mt-2">
                  {user.collegeName}
                </p>
              )}
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-slate-400 text-sm">Karma Points</span>
              </div>
              <p className="text-3xl font-bold text-white">{user.karmaPoints}</p>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-slate-400 text-sm">Messages Today</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {user.dailyMessageCount}
                {user.isAnonymous && <span className="text-lg text-slate-500">/50</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Your Badges
          </h2>

          {user.badges.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {user.badges.map((badge) => {
                const config = BADGE_CONFIG[badge];
                return (
                  <div
                    key={badge}
                    className="bg-slate-900/50 rounded-xl p-4 border border-slate-700 text-center"
                  >
                    <div className="text-4xl mb-2">{config.icon}</div>
                    <p className={`font-semibold ${config.color}`}>
                      {config.label}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">
              Keep chatting to earn badges!
            </p>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Stats
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-slate-700">
              <span className="text-slate-400">Account Type</span>
              <span className="text-white font-semibold">
                {user.isVerified ? 'Verified' : 'Anonymous'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-700">
              <span className="text-slate-400">Total Badges</span>
              <span className="text-white font-semibold">{user.badges.length}</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-700">
              <span className="text-slate-400">Karma Rank</span>
              <span className="text-white font-semibold">
                {user.karmaPoints > 100 ? 'Rising Star 🌟' : 'Newbie 🐣'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-slate-400">Message Limit</span>
              <span className="text-white font-semibold">
                {user.isAnonymous ? '50/day' : 'Unlimited'}
              </span>
            </div>
          </div>
        </div>

        {user.isAnonymous && (
          <div className="mt-6 bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-700/50 rounded-xl p-6">
            <h3 className="font-bold text-white mb-2 text-lg">
              Unlock Verified Perks
            </h3>
            <ul className="space-y-2 text-sm text-slate-300 mb-4">
              <li>✓ Guaranteed opposite-gender matching</li>
              <li>✓ Unlimited daily messages</li>
              <li>✓ Verified badge on all messages</li>
              <li>✓ Access to verified-only rooms</li>
              <li>✓ Message boosting in Mega Chat</li>
            </ul>
            <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors">
              Get Verified Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
