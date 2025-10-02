// src/components/MegaChat.tsx
import { useState, useEffect, useRef } from 'react';
import { Send, Flame, Heart, Eye, Laugh, Pin, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Message } from '../types';

interface DBMessage {
  id: string;
  user_id: string;
  content: string;
  reactions: { fire: number; laugh: number; heart: number; eyes: number };
  is_pinned: boolean;
  created_at: string;
  users: {
    username: string;
    is_verified: boolean;
  };
}

export default function MegaChat() {
  const { user, updateKarma, incrementMessageCount } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannel = useRef<any>(null);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          user_id,
          content,
          reactions,
          is_pinned,
          created_at,
          users (
            username,
            is_verified
          )
        `)
        .eq('is_mega_chat', true)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const formattedMessages: Message[] = (data as any[]).map((msg: any) => ({
        id: msg.id,
        userId: msg.user_id,
        username: msg.users.is_verified ? `${msg.users.username} ✅` : msg.users.username,
        content: msg.content,
        isVerifiedAuthor: msg.users.is_verified,
        reactions: msg.reactions,
        isPinned: msg.is_pinned,
        createdAt: new Date(msg.created_at),
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    realtimeChannel.current = supabase
      .channel('mega_chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'is_mega_chat=eq.true',
        },
        async (payload) => {
          // Fetch the complete message with user info
          const { data, error } = await supabase
            .from('messages')
            .select(`
              id,
              user_id,
              content,
              reactions,
              is_pinned,
              created_at,
              users (
                username,
                is_verified
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            const newMsg: Message = {
              id: data.id,
              userId: data.user_id,
              username: (data.users as any).is_verified 
                ? `${(data.users as any).username} ✅` 
                : (data.users as any).username,
              content: data.content,
              isVerifiedAuthor: (data.users as any).is_verified,
              reactions: data.reactions,
              isPinned: data.is_pinned,
              createdAt: new Date(data.created_at),
            };

            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: 'is_mega_chat=eq.true',
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id
                ? { ...msg, reactions: payload.new.reactions, isPinned: payload.new.is_pinned }
                : msg
            )
          );
        }
      )
      .subscribe();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const canSend = await incrementMessageCount();
    if (!canSend) {
      alert('Daily message limit reached! Get verified for unlimited messages.');
      return;
    }

    try {
      const { error } = await supabase.from('messages').insert({
        user_id: user.id,
        content: newMessage,
        is_mega_chat: true,
        reactions: { fire: 0, laugh: 0, heart: 0, eyes: 0 },
        is_pinned: false,
      });

      if (error) throw error;

      setNewMessage('');
      await updateKarma(1);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleReaction = async (messageId: string, reactionType: keyof Message['reactions']) => {
    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      const updatedReactions = {
        ...message.reactions,
        [reactionType]: message.reactions[reactionType] + 1,
      };

      const { error } = await supabase
        .from('messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId);

      if (error) throw error;

      await updateKarma(1);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading messages...</p>
        </div>
      </div>
    );
  }

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