// src/components/WelcomeScreen.tsx
import { useState } from 'react';
import { Zap, Shield, Users, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Gender } from '../types';
import { isCollegeEmail } from '../utils/emailVerification'; // <-- NEW IMPORT

export default function WelcomeScreen() {
  const { enterAnonymous, login } = useAuth();
  const [showVerification, setShowVerification] = useState(false);
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender>('unspecified');

  const handleVerifiedLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use the utility function for robust email check
    if (isCollegeEmail(email)) {
      login(email, gender);
    } else {
      alert('Please enter a valid college email address (e.g., ending in .edu, .ac.uk)');
    }
  };

  if (showVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
          <button
            onClick={() => setShowVerification(false)}
            className="text-slate-400 hover:text-slate-300 mb-4"
          >
            ← Back
          </button>

          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white">Get Verified</h2>
          </div>

          <form onSubmit={handleVerifiedLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                College Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="unspecified">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-300">Verified Perks:</p>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>✓ Guaranteed opposite-gender matching</li>
                <li>✓ Verified-only rooms</li>
                <li>✓ Boosted messages in Mega Chat</li>
                <li>✓ Unlimited daily messages</li>
                <li>✓ Verified badge ✅</li>
              </ul>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
            >
              Verify & Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-12 h-12 text-amber-400" />
            <h1 className="text-5xl font-bold text-white">CampusChat</h1>
          </div>
          <p className="text-xl text-slate-300">
            Your college's secret social network
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Anonymous. Addictive. Always active.
          </p>
        </div>

        <div className="grid gap-4 mb-8">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-start gap-4">
              <Users className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Mega Chat</h3>
                <p className="text-sm text-slate-300">
                  Public feed where everyone hangs out. Drop confessions, memes, or just lurk.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-start gap-4">
              <Sparkles className="w-8 h-8 text-pink-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Random Rooms</h3>
                <p className="text-sm text-slate-300">
                  Get matched with 2-4 strangers for quick group chats. Icebreakers included.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-start gap-4">
              <Zap className="w-8 h-8 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">1:1 Mystery Chat</h3>
                <p className="text-sm text-slate-300">
                  Talk to random strangers one-on-one. Verified users get opposite-gender matches.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={enterAnonymous}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-[1.02]"
          >
            Enter Anonymous
          </button>

          <button
            onClick={() => setShowVerification(true)}
            className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-lg rounded-xl transition-colors border border-slate-600"
          >
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-5 h-5" />
              Get Verified
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Anonymous users: 50 messages/day limit
        </p>
      </div>
    </div>
  );
}
