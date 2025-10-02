import { useState, useEffect, useRef } from 'react';
import { Send, Flame, Heart, Eye, Laugh, Pin, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Message } from '../types';

export default function MegaChat() {
  const { user, updateKarma, incrementMessageCount } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mockMessages: Message[] = [
      {
        id: '1',
        userId: 'system',
        username: 'CampusBot',
        content: 'Welcome to Mega Chat! Drop your confessions, memes, or just say hi 👋',
        isVerifiedAuthor: true,
        reactions: { fire: 23, laugh: 8, heart: 15, eyes: 5 },
        isPinned: true,
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        id: '2',
        userId: 'user2',
        username: 'GoldenEagle547',
        content: 'Anyone else procrastinating their assignment due tomorrow? 😅',
        isVerifiedAuthor: false,
        reactions: { fire: 12, laugh: 34, heart: 3, eyes: 8 },
        isPinned: false,
        createdAt: new Date(Date.now() - 1800000),
      },
      {
        id: '3',
        userId: 'user3',
        username: 'verified_student ✅',
        content: 'Just saw my ex in the library and pretended to be on a very important phone call',
        isVerifiedAuthor: true,
        reactions: { fire: 5, laugh: 67, heart: 12, eyes: 23 },
        isPinned: false,
        createdAt: new Date(Date.now() - 900000),
      },
      {
        id: '4',
        userId: 'user4',
        username: 'CrimsonWolf892',
        content: 'Hot take: The cafeteria food is actually good',
        isVerifiedAuthor: false,
        reactions: { fire: 2, laugh: 15, heart: 1, eyes: 8 },
        isPinned: false,
        createdAt: new Date(Date.now() - 300000),
      },
    ];
    setMessages(mockMessages);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    if (!incrementMessageCount()) {
      alert('Daily message limit reached! Get verified for unlimited messages.');
      return;
    }

    const message: Message = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.isVerified ? `${user.username} ✅` : user.username,
      content: newMessage,
      isVerifiedAuthor: user.isVerified,
      reactions: { fire: 0, laugh: 0, heart: 0, eyes: 0 },
      isPinned: false,
      createdAt: new Date(),
    };

    setMessages([...messages, message]);
    setNewMessage('');
    updateKarma(1);
  };

  const handleReaction = (messageId: string, reactionType: keyof Message['reactions']) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          reactions: {
            ...msg.reactions,
            [reactionType]: msg.reactions[reactionType] + 1,
          },
        };
      }
      return msg;
    }));
    updateKarma(1);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-xl p-4 transition-all ${
              message.isPinned
                ? 'bg-amber-900/20 border border-amber-700/50'
                : message.isVerifiedAuthor
                ? 'bg-emerald-900/10 border border-emerald-700/30'
                : 'bg-slate-800/50 border border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">
                  {message.username}
                </span>
                {message.isPinned && (
                  <Pin className="w-3 h-3 text-amber-400" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {formatTime(message.createdAt)}
                </span>
                <button className="text-slate-500 hover:text-slate-400">
                  <Flag className="w-3 h-3" />
                </button>
              </div>
            </div>

            <p className="text-slate-200 mb-3">{message.content}</p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleReaction(message.id, 'fire')}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/50 hover:bg-orange-500/20 text-xs text-slate-300 hover:text-orange-400 transition-colors"
              >
                <Flame className="w-3 h-3" />
                {message.reactions.fire > 0 && message.reactions.fire}
              </button>
              <button
                onClick={() => handleReaction(message.id, 'laugh')}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/50 hover:bg-yellow-500/20 text-xs text-slate-300 hover:text-yellow-400 transition-colors"
              >
                <Laugh className="w-3 h-3" />
                {message.reactions.laugh > 0 && message.reactions.laugh}
              </button>
              <button
                onClick={() => handleReaction(message.id, 'heart')}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/50 hover:bg-pink-500/20 text-xs text-slate-300 hover:text-pink-400 transition-colors"
              >
                <Heart className="w-3 h-3" />
                {message.reactions.heart > 0 && message.reactions.heart}
              </button>
              <button
                onClick={() => handleReaction(message.id, 'eyes')}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/50 hover:bg-cyan-500/20 text-xs text-slate-300 hover:text-cyan-400 transition-colors"
              >
                <Eye className="w-3 h-3" />
                {message.reactions.eyes > 0 && message.reactions.eyes}
              </button>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={user?.isAnonymous ? `${50 - (user?.dailyMessageCount || 0)} messages left today...` : 'Type your message...'}
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={500}
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-slate-500">
            {newMessage.length}/500 characters
          </p>
          {user?.isAnonymous && (
            <p className="text-xs text-amber-400">
              Get verified for unlimited messages
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
