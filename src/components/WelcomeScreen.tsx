import { useState } from 'react';
import { MessageSquare, Shield, Users, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Gender } from '../types';
import { isCollegeEmail } from '../utils/emailVerification';

export default function WelcomeScreen() {
  const { enterAnonymous, login } = useAuth();
  const [showVerification, setShowVerification] = useState(false);
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender>('unspecified');

  const handleVerifiedLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCollegeEmail(email)) {
      login(email, gender);
    } else {
      alert('Please enter a valid college email address (e.g., ending in .edu, .ac.uk)');
    }
  };

  if (showVerification) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <button
            onClick={() => setShowVerification(false)}
            className="text-slate-600 hover:text-slate-900 mb-6 text-sm font-medium"
          >
            ← Back
          </button>

          <div className="mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Get Verified</h2>
            <p className="text-slate-600">Unlock premium features with your college email</p>
          </div>

          <form onSubmit={handleVerifiedLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                College Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
              >
                <option value="unspecified">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm font-medium text-emerald-900 mb-2">Verified Perks:</p>
              <ul className="text-sm text-emerald-800 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">✓</span>
                  <span>Guaranteed opposite-gender matching</span>
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
                  <span>Priority matching in all rooms</span>
                </li>
              </ul>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors"
            >
              Verify & Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">CampusChat</h1>
          <p className="text-xl text-slate-600 mb-2">Your college's social network</p>
          <p className="text-sm text-slate-500">Anonymous. Real-time. Always active.</p>
        </div>

        <div className="space-y-4 mb-10">
          {[
            {
              icon: MessageSquare,
              title: 'Mega Chat',
              description: 'Campus-wide public feed for everyone',
              gradient: 'from-blue-500 to-indigo-600',
            },
            {
              icon: Sparkles,
              title: '1:1 Mystery Chat',
              description: 'Anonymous one-on-one conversations',
              gradient: 'from-pink-500 to-rose-500',
            },
            {
              icon: Users,
              title: 'Group Rooms',
              description: 'Small group chats with 3-4 people',
              gradient: 'from-violet-500 to-purple-600',
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <button
            onClick={enterAnonymous}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-lg rounded-xl transition-colors"
          >
            Enter Anonymous
          </button>

          <button
            onClick={() => setShowVerification(true)}
            className="w-full py-4 border-2 border-slate-200 hover:bg-slate-50 text-slate-900 font-semibold text-lg rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-5 h-5" />
            Get Verified
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Anonymous users limited to 50 messages per day
        </p>
      </div>
    </div>
  );
}