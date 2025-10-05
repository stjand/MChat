import { useState, useEffect, useRef } from 'react';
import { Send, SkipForward, ArrowLeft, Users, Sparkles, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Message } from '../types';
import { MatchmakingService } from '../services/matchmaking';

type MatchMode = 'onetoone' | 'trio' | 'squad' | null;

export default function PrivateChat() {
  const { user, updateKarma, incrementMessageCount } = useAuth();
  const [mode, setMode] = useState<MatchMode>(null);
  const [inChat, setInChat] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [showIdentity, setShowIdentity] = useState(false);
  const [timer, setTimer] = useState(180);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannel = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (inChat && !showIdentity && mode === 'onetoone') {
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
  }, [inChat, showIdentity, mode]);

  useEffect(() => {
    return () => {
      if (user) MatchmakingService.cancelMatching(user.id);
      if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);
    };
  }, [user?.id]);

  const loadRoomMessages = async (currentRoomId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`id, user_id, content, reactions, is_pinned, created_at, users (username, is_verified)`)
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
          reactions: msg.reactions || { fire: 0, laugh: 0, heart: 0, eyes: 0 },
          isPinned: msg.is_pinned || false,
          createdAt: new Date(msg.created_at),
        }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading room messages:', error);
    }
  };

  const subscribeToRoom = (currentRoomId: string) => {
    if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);

    realtimeChannel.current = supabase
      .channel(`room:${currentRoomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${currentRoomId}`,
      }, async (payload) => {
        try {
          const { data, error } = await supabase
            .from('messages')
            .select(`id, user_id, content, reactions, is_pinned, created_at, users!inner (username, is_verified)`)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            const newMsg: Message = {
              id: data.id,
              userId: data.user_id,
              username: (data as any).users.username,
              content: data.content,
              isVerifiedAuthor: (data as any).users.is_verified,
              reactions: data.reactions || { fire: 0, laugh: 0, heart: 0, eyes: 0 },
              isPinned: data.is_pinned || false,
              createdAt: new Date(data.created_at),
            };
            setMessages((prev) => [...prev, newMsg]);
          }
        } catch (error) {
          console.error('Error handling new message:', error);
        }
      })
      .subscribe();
  };

  const startMatching = async (selectedMode: MatchMode) => {
    if (!user || !selectedMode) return;

    setMode(selectedMode);
    setIsMatching(true);
    setMatchError(null);

    const roomSizeMap = { onetoone: 2, trio: 3, squad: 4 } as const;
    const roomSize = roomSizeMap[selectedMode];

    try {
      let matchResult;
      if (selectedMode === 'onetoone' && user.isVerified && user.gender !== 'unspecified') {
        matchResult = await MatchmakingService.findOppositeGenderMatch(user.id, user.gender);
      } else {
        matchResult = await MatchmakingService.findMatch({
          userId: user.id,
          roomSize,
          isVerified: user.isVerified,
          gender: user.gender,
        });
      }

      setRoomId(matchResult.roomId);
      setParticipants(matchResult.participants);
      setInChat(true);
      setTimer(180);
      setShowIdentity(selectedMode !== 'onetoone');

      await loadRoomMessages(matchResult.roomId);
      subscribeToRoom(matchResult.roomId);
    } catch (error: any) {
      console.error('Matching failed:', error);
      setMatchError(error.message || 'Matching failed. Please try again.');
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

  const leaveRoom = async () => {
    if (isMatching && user) MatchmakingService.cancelMatching(user.id);
    if (user && roomId) {
      try {
        await MatchmakingService.leaveRoom(roomId, user.id);
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    }
    if (realtimeChannel.current) {
      await supabase.removeChannel(realtimeChannel.current);
      realtimeChannel.current = null;
    }
    setInChat(false);
    setMessages([]);
    setParticipants([]);
    setMode(null);
    setRoomId(null);
    setIsMatching(false);
    setMatchError(null);
    setShowIdentity(false);
  };

  const skipToNext = () => {
    if (mode) {
      leaveRoom();
      setTimeout(() => startMatching(mode), 500);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMatching) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white px-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Finding your match...</h2>
          <p className="text-sm text-slate-500 mb-8">
            {mode === 'onetoone' && user?.isVerified && user.gender !== 'unspecified'
              ? 'Matching with opposite-gender verified student'
              : `Connecting you with ${mode === 'trio' ? '2' : mode === 'squad' ? '3' : '1'} other ${mode === 'trio' || mode === 'squad' ? 'people' : 'person'}`}
          </p>
          <button
            onClick={leaveRoom}
            className="px-6 py-3 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (matchError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Matching Failed</h2>
          <p className="text-sm text-slate-600 mb-8">{matchError}</p>
          <button
            onClick={() => { setMatchError(null); setMode(null); }}
            className="px-8 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (inChat) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <header className="px-6 py-4 border-b border-slate-100 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={leaveRoom}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Leave</span>
              </button>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700 font-medium">{participants.length} people</span>
              </div>
              <button
                onClick={skipToNext}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <span className="text-sm font-medium">Next</span>
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {mode === 'onetoone' && !showIdentity && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-900 text-center">
                  Identities reveal in {formatTime(timer)}
                </p>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => {
              const isMine = message.userId === user?.id;
              const displayName = (mode === 'onetoone' && !showIdentity && !isMine) ? 'Stranger' : message.username;
              
              return (
                <div key={message.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                  {!isMine && (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {displayName[0]?.toUpperCase() || 'S'}
                    </div>
                  )}

                  <div className={`flex-1 max-w-2xl ${isMine ? 'flex flex-col items-end' : ''}`}>
                    {!isMine && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-medium text-slate-900">{displayName}</span>
                        {message.isVerifiedAuthor && showIdentity && (
                          <Shield className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                    )}

                    <div className={`px-4 py-3 rounded-2xl ${
                      isMine ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-900'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                  </div>

                  {isMine && <div className="w-9" />}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-slate-100 bg-white">
          <div className="max-w-4xl mx-auto flex items-end gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="px-6 py-4 border-b border-slate-100 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Private Chats</h2>
          <p className="text-sm text-slate-500 mt-1">Connect with random students</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-12 bg-slate-50">
        <div className="max-w-2xl mx-auto space-y-4">
          <button
            onClick={() => startMatching('onetoone')}
            className="w-full p-6 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">1:1 Mystery Chat</h3>
                  <p className="text-sm text-slate-500">Anonymous one-on-one conversation</p>
                  {user?.isVerified && user.gender !== 'unspecified' && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Opposite-gender matching enabled
                    </p>
                  )}
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => startMatching('trio')}
            className="w-full p-6 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg group-hover:scale-110 transition-transform">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Trio Chat</h3>
                  <p className="text-sm text-slate-500">Group chat with 3 people</p>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => startMatching('squad')}
            className="w-full p-6 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg group-hover:scale-110 transition-transform">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Squad Chat</h3>
                  <p className="text-sm text-slate-500">Group chat with 4 people</p>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}