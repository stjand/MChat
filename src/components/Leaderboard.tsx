import { useState, useEffect } from 'react';
import { Trophy, Crown, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface LeaderboardUser {
  id: string;
  username: string;
  karma_points: number;
  is_verified: boolean;
  gender: string;
  badges: string[];
}

type LeaderboardTab = 'all' | 'verified';

export default function Leaderboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('all');
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('id, username, karma_points, is_verified, gender, badges')
        .order('karma_points', { ascending: false })
        .limit(50);

      if (activeTab === 'verified') {
        query = query.eq('is_verified', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTopUsers(data || []);

      if (user) {
        const userIndex = data?.findIndex(u => u.id === user.id);
        setUserRank(userIndex !== undefined && userIndex !== -1 ? userIndex + 1 : null);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getKarmaColor = (points: number) => {
    if (points >= 1000) return 'text-violet-600';
    if (points >= 500) return 'text-blue-600';
    if (points >= 100) return 'text-slate-900';
    return 'text-slate-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-sm text-slate-600 font-medium">Loading rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white overflow-y-auto">
      <header className="px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Leaderboard</h2>
          <p className="text-sm text-slate-500 mt-1">Top contributors this week</p>
        </div>
      </header>

      <div className="px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { id: 'all', label: 'All Users' },
              { id: 'verified', label: 'Verified Only' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as LeaderboardTab)}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* User's Rank Card */}
          {user && userRank && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Your Rank</p>
                  <p className="text-3xl font-bold text-slate-900">#{userRank}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600 mb-1">Karma</p>
                  <p className={`text-3xl font-bold ${getKarmaColor(user.karmaPoints)}`}>
                    {user.karmaPoints}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top 3 Podium */}
          {topUsers.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-8">
              {/* 2nd Place */}
              <div className="pt-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-1 truncate">
                    {topUsers[1].username}
                  </p>
                  {topUsers[1].is_verified && (
                    <Shield className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  )}
                  <p className="text-xl font-bold text-slate-900 mb-1">
                    {topUsers[1].karma_points}
                  </p>
                  <p className="text-xs text-slate-500">2nd Place</p>
                </div>
              </div>

              {/* 1st Place */}
              <div>
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-4 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                    <Crown className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-base font-bold text-slate-900 mb-1 truncate">
                    {topUsers[0].username}
                  </p>
                  {topUsers[0].is_verified && (
                    <Shield className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  )}
                  <p className="text-2xl font-bold text-slate-900 mb-1">
                    {topUsers[0].karma_points}
                  </p>
                  <p className="text-xs text-amber-700 font-medium">Champion</p>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="pt-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-1 truncate">
                    {topUsers[2].username}
                  </p>
                  {topUsers[2].is_verified && (
                    <Shield className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  )}
                  <p className="text-xl font-bold text-slate-900 mb-1">
                    {topUsers[2].karma_points}
                  </p>
                  <p className="text-xs text-slate-500">3rd Place</p>
                </div>
              </div>
            </div>
          )}

          {/* Full Rankings */}
          <div className="space-y-2">
            {topUsers.slice(3).map((rankedUser, index) => {
              const rank = index + 4;
              const isCurrentUser = user?.id === rankedUser.id;

              return (
                <div
                  key={rankedUser.id}
                  className={`rounded-xl p-4 transition-all ${
                    isCurrentUser
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'bg-white border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 text-center">
                      <span className="text-lg font-bold text-slate-400">#{rank}</span>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-700 text-sm font-semibold flex-shrink-0">
                      {rankedUser.username[0]?.toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {rankedUser.username}
                        </p>
                        {rankedUser.is_verified && (
                          <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-xl font-bold ${getKarmaColor(rankedUser.karma_points)}`}>
                        {rankedUser.karma_points}
                      </p>
                      <p className="text-xs text-slate-500">karma</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {topUsers.length === 0 && (
            <div className="text-center py-20">
              <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No users found in this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}