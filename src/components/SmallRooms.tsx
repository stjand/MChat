import { useState, useEffect, useRef } from 'react';
import { Users, Send, ArrowLeft, RotateCcw, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Message } from '../types';
import { MatchmakingService } from '../services/matchmaking';

type RoomSize = 2 | 3 | 4;

// Supabase row type for joined messages (users comes back as array)
type MessageRow = {
  id: string;
  user_id: string;
  content: string;
  reactions: any;
  is_pinned: boolean;
  created_at: string;
  users: {
    username: string;
    is_verified: boolean;
  }[];
};

export default function SmallRooms() {
  const { user, updateKarma, incrementMessageCount } = useAuth();
  const [roomSize, setRoomSize] = useState<RoomSize | null>(null);
  const [inRoom, setInRoom] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [icebreaker, setIcebreaker] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannel = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (user && isMatching) {
        MatchmakingService.cancelMatching(user.id);
      }
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
    };
  }, [user, isMatching]);

  const loadRoomMessages = async (currentRoomId: string) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, user_id, content, reactions, is_pinned, created_at,
        users!inner (username, is_verified)
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
            users!inner (username, is_verified)
          `)
          .eq('id', payload.new.id)
          .single();

        if (!error && data) {
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

  const startMatching = async (size: RoomSize) => {
    if (!user) return;

    setRoomSize(size);
    setIsMatching(true);

    try {
      const matchResult = await MatchmakingService.findMatch({
        userId: user.id,
        roomSize: size,
        isVerified: user.isVerified,
        gender: user.gender,
      });

      setRoomId(matchResult.roomId);
      setParticipants(matchResult.participants);
      setIcebreaker(matchResult.icebreaker);
      setInRoom(true);

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
    alert('Daily message limit reached!');
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
  }
};

  const leaveRoom = async () => {
    if (isMatching && user) {
      MatchmakingService.cancelMatching(user.id);
    }

    if (user && roomId) {
      try {
        await MatchmakingService.leaveRoom(roomId, user.id);
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    }

    const oldChannel = realtimeChannel.current;
    realtimeChannel.current = null;

    setInRoom(false);
    setMessages([]);
    setParticipants([]);
    setRoomSize(null);
    setIcebreaker('');
    setRoomId(null);
    setIsMatching(false);

    if (oldChannel) {
      setTimeout(() => {
        supabase.removeChannel(oldChannel);
      }, 100);
    }
  };

  const skipToNextRoom = () => {
    if (roomSize) {
      leaveRoom();
      setTimeout(() => startMatching(roomSize), 100);
    }
  };

  if (isMatching) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 p-8">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <Users className="w-10 h-10 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Finding {roomSize} strangers...
          </h2>
          <p className="text-slate-400">Matching you with cool people</p>
        </div>
      </div>
    );
  }

  if (inRoom) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={leaveRoom}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Leave
            </button>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-white font-semibold">
                {participants.length} people
              </span>
            </div>
            <button
              onClick={skipToNextRoom}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Next
            </button>
          </div>

          {icebreaker && (
            <div className="mt-4 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-700/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-cyan-100">{icebreaker}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${
                message.userId === user?.id
                  ? 'ml-auto bg-blue-500'
                  : 'mr-auto bg-slate-800'
              } max-w-[80%] rounded-2xl p-3`}
            >
              {message.userId !== user?.id && (
                <p className="text-xs font-semibold text-slate-400 mb-1">
                  {message.username}
                </p>
              )}
              <p className="text-white text-sm">{message.content}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-slate-800 border-t border-slate-700"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
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
          <Users className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">Small Rooms</h2>
          <p className="text-slate-400">
            Get matched with a few strangers for quick group chats
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => startMatching(2)}
            className="w-full py-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl transition-all transform hover:scale-[1.02]"
          >
            <div className="text-white">
              <p className="text-2xl font-bold mb-1">1:1 Pair</p>
              <p className="text-sm opacity-90">Just you and one stranger</p>
            </div>
          </button>

          <button
            onClick={() => startMatching(3)}
            className="w-full py-6 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 rounded-xl transition-all transform hover:scale-[1.02]"
          >
            <div className="text-white">
              <p className="text-2xl font-bold mb-1">Trio Chat</p>
              <p className="text-sm opacity-90">Three's company</p>
            </div>
          </button>

          <button
            onClick={() => startMatching(4)}
            className="w-full py-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 rounded-xl transition-all transform hover:scale-[1.02]"
          >
            <div className="text-white">
              <p className="text-2xl font-bold mb-1">Squad of 4</p>
              <p className="text-sm opacity-90">Maximum chaos mode</p>
            </div>
          </button>
        </div>

        {user?.isVerified && (
          <div className="mt-6 bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-4 text-center">
            <p className="text-sm text-emerald-300">
              Verified users get priority matching
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
