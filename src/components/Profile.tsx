import { Trophy, Award, Shield, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BadgeType } from '../types';

const BADGE_CONFIG: Record<
  BadgeType,
  { icon: string; label: string; color: string }
> = {
  verified: { icon: '✓', label: 'Verified Student', color: 'from-emerald-500 to-teal-500' },
  streak: { icon: '🔥', label: '7-Day Streak', color: 'from-orange-500 to-red-500' },
  party_animal: { icon: '🎉', label: 'Party Animal', color: 'from-pink-500 to-rose-500' },
  night_owl: { icon: '🦉', label: 'Night Owl', color: 'from-indigo-500 to-purple-500' },
  funniest: { icon: '😂', label: 'Comedy King', color: 'from-yellow-500 to-amber-500' },
};

export default function Profile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="h-screen bg-white overflow-y-auto">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Profile</h2>
            <p className="text-sm text-slate-500 mt-1">Manage your account</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign out</span>
          </button>
        </div>
      </header>

      <div className="px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* User Info Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {user.username[0]?.toUpperCase() || 'A'}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-slate-900 mb-1">{user.username}</h3>
                {user.collegeName && (
                  <p className="text-sm text-slate-500 mb-2">{user.collegeName}</p>
                )}
                {user.isVerified ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Verified Student</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">Anonymous Mode</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span className="text-sm text-slate-600">Karma Points</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{user.karmaPoints}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-slate-600">Messages Today</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {user.dailyMessageCount}
                  {user.isAnonymous && <span className="text-lg text-slate-400 ml-1">/50</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Badges Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-slate-700" />
              Your Badges
            </h4>

            {user.badges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {user.badges.map((badge) => {
                  const config = BADGE_CONFIG[badge];
                  return (
                    <div
                      key={badge}
                      className={`p-4 rounded-xl bg-gradient-to-br ${config.color} text-center`}
                    >
                      <div className="text-3xl mb-2">{config.icon}</div>
                      <p className="text-sm font-semibold text-white">{config.label}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <Award className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">Keep chatting to earn badges!</p>
              </div>
            )}
          </div>

          {/* Verification CTA */}
          {user.isAnonymous && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                Unlock Verified Perks
              </h3>
              <ul className="space-y-2 text-sm text-slate-700 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Guaranteed opposite-gender matching in 1:1 chat</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Unlimited daily messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Verified badge on all messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Priority matching in all chat rooms</span>
                </li>
              </ul>
              <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors">
                Get Verified Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
