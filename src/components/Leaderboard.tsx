import { useState, useEffect } from 'react';
import { Trophy, Crown, Flame, Zap, Users } from 'lucide-react';
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

type LeaderboardTab = 'all' | 'boys' | 'girls' | 'verified';

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

      // Filter based on active tab
      if (activeTab === 'boys') {
        query = query.eq('gender', 'male');
      } else if (activeTab === 'girls') {
        query = query.eq('gender', 'female');
      } else if (activeTab === 'verified') {
        query = query.eq('is_verified', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTopUsers(data || []);

      // Find current user's rank
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

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-amber-600" />;
    return <span className="text-slate-400 text-sm font-bold">#{rank}</span>;
  };

  const getKarmaColor = (points: number) => {
    if (points >= 1000) return 'text-purple-400';
    if (points >= 500) return 'text-pink-400';
    if (points >= 100) return 'text-amber-400';
    return 'text-slate-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-900 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-8 h-8 text-amber-400" />
            <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          </div>
          <p className="text-slate-400">Top chatters of the campus</p>
        </div>

        {/* User's Rank Card */}
        {user && userRank && (
          <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Your Rank</p>
                  <p className="text-xl font-bold text-white">#{userRank}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Karma</p>
                <p className={`text-2xl font-bold ${getKarmaColor(user.karmaPoints)}`}>
                  {user.karmaPoints}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'all', label: 'All', icon: Users },
            { id: 'boys', label: 'Boys', icon: Zap },
            { id: 'girls', label: 'Girls', icon: Flame },
            { id: 'verified', label: 'Verified', icon: Crown },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as LeaderboardTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Top 3 Podium */}
        {topUsers.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* 2nd Place */}
            <div className="pt-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-white font-bold mb-1 truncate">
                  {topUsers[1].username}
                  {topUsers[1].is_verified && ' ✅'}
                </p>
                <p className="text-amber-400 font-bold text-lg">
                  {topUsers[1].karma_points}
                </p>
                <p className="text-xs text-slate-500">2nd Place</p>
              </div>
            </div>

            {/* 1st Place */}
            <div>
              <div className="bg-gradient-to-br from-amber-900/50 to-yellow-900/50 border border-amber-700 rounded-xl p-4 text-center">
                <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <p className="text-white font-bold text-lg mb-1 truncate">
                  {topUsers[0].username}
                  {topUsers[0].is_verified && ' ✅'}
                </p>
                <p className="text-amber-400 font-bold text-2xl">
                  {topUsers[0].karma_points}
                </p>
                <p className="text-xs text-amber-300">Champion</p>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="pt-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <Trophy className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="text-white font-bold mb-1 truncate">
                  {topUsers[2].username}
                  {topUsers[2].is_verified && ' ✅'}
                </p>
                <p className="text-amber-400 font-bold text-lg">
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
                    ? 'bg-blue-900/30 border border-blue-700'
                    : 'bg-slate-800/30 border border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 text-center">
                    {getRankBadge(rank)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {rankedUser.username}
                      {rankedUser.is_verified && (
                        <span className="ml-1 text-emerald-400">✅</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {rankedUser.badges?.slice(0, 3).map((badge, i) => (
                        <span key={i} className="text-xs">
                          {badge === 'verified' && '✅'}
                          {badge === 'streak' && '🔥'}
                          {badge === 'party_animal' && '🎉'}
                          {badge === 'night_owl' && '🦉'}
                          {badge === 'funniest' && '😂'}
                        </span>
                      ))}
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
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">No users found in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}