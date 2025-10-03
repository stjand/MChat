import { useState, useEffect, useRef } from 'react';
import { Send, SkipForward, CircleUser as UserCircle, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Message } from '../types';
import { MatchmakingService } from '../services/matchmaking';

export default function OneToOne() {
  const { user, updateKarma, incrementMessageCount } = useAuth();
  const [inChat, setInChat] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [strangerName, setStrangerName] = useState('');
  const [icebreaker, setIcebreaker] = useState('');
  const [showIdentity, setShowIdentity] = useState(false);
  const [timer, setTimer] = useState(180);
  const [roomId, setRoomId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannel = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (inChat && !showIdentity) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setShowIdentity(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [inChat, showIdentity]);

  useEffect(() => {
    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
    };
  }, []);

  const loadRoomMessages = async (currentRoomId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, user_id, content, reactions, is_pinned, created_at,
          users (username, is_verified)
        `)
        .eq('room_id', currentRoomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = (data || [])
        .filter((msg: any) => msg.users)
        .map((msg: any) => ({
          id: msg.id,
          userId: msg.user_id,
          username: msg.users.username,
          content: msg.content,
          isVerifiedAuthor: msg.users.is_verified,
          reactions: msg.reactions,
          isPinned: msg.is_pinned,
          createdAt: new Date(msg.created_at),
        }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading room messages:', error);
    }
  };

  const subscribeToRoom = (currentRoomId: string) => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
    }

    realtimeChannel.current = supabase
      .channel(`room:${currentRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${currentRoomId}`,
        },
        async (payload) => {
          const { data, error } = await supabase
            .from('messages')
            .select(`
              id, user_id, content, reactions, is_pinned, created_at,
              users (username, is_verified)
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data && (data as any).users) {
            const newMsg: Message = {
              id: data.id,
              userId: data.user_id,
              username: (data as any).users.username,
              content: data.content,
              isVerifiedAuthor: (data as any).users.is_verified,
              reactions: data.reactions,
              isPinned: data.is_pinned,
              createdAt: new Date(data.created_at),
            };

            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();
  };

  const startMatching = async () => {
    if (!user) return;

    setIsMatching(true);

    try {
      let matchResult;

      if (user.isVerified && user.gender !== 'unspecified') {
        matchResult = await MatchmakingService.findOppositeGenderMatch(
          user.id,
          user.gender
        );
      } else {
        matchResult = await MatchmakingService.findMatch({
          userId: user.id,
          roomSize: 2,
          isVerified: user.isVerified,
          gender: user.gender,
        });
      }

      setRoomId(matchResult.roomId);
      const otherParticipant = matchResult.participants.find((p) => p !== user.username);
      setStrangerName(otherParticipant || 'Stranger');
      setIcebreaker(matchResult.icebreaker);
      setInChat(true);
      setTimer(180);
      setShowIdentity(false);

      // Load messages and subscribe to room
      await loadRoomMessages(matchResult.roomId);
      subscribeToRoom(matchResult.roomId);
    } catch (error) {
      console.error('Matching failed:', error);
      alert('Matching failed or timed out. Please try again.');
    } finally {
      setIsMatching(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !roomId) return;

    const canSend = await incrementMessageCount();
    if (!canSend) {
      alert('Daily message limit reached! Get verified for unlimited messages.');
      return;
    }

    try {
      const { error } = await supabase.from('messages').insert({
        user_id: user.id,
        room_id: roomId,
        content: newMessage,
        is_mega_chat: false,
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

  const skipToNext = async () => {
    if (realtimeChannel.current) {
      await supabase.removeChannel(realtimeChannel.current);
      realtimeChannel.current = null;
    }

    if (user && roomId) {
      try {
        await MatchmakingService.leaveRoom(roomId, user.id);
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    }

    setInChat(false);
    setMessages([]);
    setStrangerName('');
    setIcebreaker('');
    setRoomId(null);

    setTimeout(() => startMatching(), 100);
  };

  const endChat = async () => {
    if (realtimeChannel.current) {
      await supabase.removeChannel(realtimeChannel.current);
      realtimeChannel.current = null;
    }

    if (user && roomId) {
      try {
        await MatchmakingService.leaveRoom(roomId, user.id);
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    }

    setInChat(false);
    setMessages([]);
    setStrangerName('');
    setIcebreaker('');
    setShowIdentity(false);
    setRoomId(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMatching) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 p-8">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <UserCircle className="w-10 h-10 text-pink-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Finding you a match...
          </h2>
          <p className="text-slate-400">
            {user?.isVerified && user.gender !== 'unspecified'
              ? 'Matching with opposite-gender verified student'
              : 'Connecting with a random stranger'}
          </p>
        </div>
      </div>
    );
  }

  if (inChat) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white font-semibold">
                {showIdentity ? strangerName : 'Stranger'}
              </span>
              {user?.isVerified && user.gender !== 'unspecified' && (
                <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded">
                  Opposite Gender
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!showIdentity && (
                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  <Clock className="w-4 h-4" />
                  {formatTime(timer)}
                </div>
              )}
              <button
                onClick={skipToNext}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </button>
            </div>
          </div>

          {icebreaker && !showIdentity && (
            <div className="bg-gradient-to-r from-pink-900/30 to-rose-900/30 border border-pink-700/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-pink-100">{icebreaker}</p>
              </div>
            </div>
          )}

          {showIdentity && (
            <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700/50 rounded-lg p-3">
              <p className="text-sm text-amber-100 text-center">
                Identities revealed! You can now see each other's names.
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${
                message.userId === user?.id
                  ? 'ml-auto bg-pink-500'
                  : 'mr-auto bg-slate-800'
              } max-w-[80%] rounded-2xl p-3`}
            >
              {message.userId !== user?.id && (
                <p className="text-xs font-semibold text-slate-400 mb-1">
                  {showIdentity ? message.username : 'Stranger'}
                </p>
              )}
              <p className="text-white text-sm">{message.content}</p>
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
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <UserCircle className="w-16 h-16 text-pink-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">1:1 Mystery Chat</h2>
          <p className="text-slate-400">
            Talk to random strangers one-on-one
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
          <h3 className="font-semibold text-white mb-3">How it works:</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-pink-400">•</span>
              <span>Get matched instantly with a random stranger</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400">•</span>
              <span>Identities revealed after 3 minutes of chatting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400">•</span>
              <span>Skip anytime to meet someone new</span>
            </li>
            {user?.isVerified && user.gender !== 'unspecified' && (
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span className="text-emerald-300 font-medium">
                  You'll be matched with opposite-gender students only
                </span>
              </li>
            )}
          </ul>
        </div>

        <button
          onClick={startMatching}
          className="w-full py-6 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xl rounded-xl transition-all transform hover:scale-[1.02]"
        >
          Start Random Chat
        </button>

        {!user?.isVerified && (
          <div className="mt-6 bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-center">
            <p className="text-sm text-amber-300">
              Get verified to unlock opposite-gender matching
            </p>
          </div>
        )}
      </div>
    </div>
  );
}