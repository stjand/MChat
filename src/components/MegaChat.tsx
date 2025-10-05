import React, { useEffect, useRef, useState } from "react";
import { Send, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Message } from "../types";

interface DBMessage {
  id: string;
  user_id: string;
  content: string;
  reactions: { fire: number; laugh: number; heart: number; eyes: number } | any;
  is_pinned: boolean;
  created_at: string;
  users: { username: string; is_verified: boolean } | { username: string; is_verified: boolean }[] | null;
}

const defaultReactions = { fire: 0, laugh: 0, heart: 0, eyes: 0 };

function extractUser(users: DBMessage["users"]) {
  if (!users) return { username: "unknown", is_verified: false };
  return Array.isArray(users) ? users[0] ?? { username: "unknown", is_verified: false } : users;
}

export default function MegaChat() {
  const { user, updateKarma, incrementMessageCount } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isLoadingMessages = useRef(false);
  const realtimeChannel = useRef<any>(null);

  const loadMessages = async () => {
    if (isLoadingMessages.current) return;
    isLoadingMessages.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id, user_id, content, reactions, is_pinned, created_at,
          users:users!inner (username, is_verified)
        `)
        .eq("is_mega_chat", true)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;

      const formatted: Message[] = (data || [])
        .filter((m: DBMessage) => !!m.users)
        .map((m: DBMessage) => {
          const u = extractUser(m.users);
          return {
            id: m.id,
            userId: m.user_id,
            username: u.username,
            content: m.content,
            isVerifiedAuthor: !!u.is_verified,
            reactions: m.reactions ?? defaultReactions,
            isPinned: !!m.is_pinned,
            createdAt: new Date(m.created_at),
          } as Message;
        });

      setMessages(formatted);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
      isLoadingMessages.current = false;
    }
  };

  const subscribeToMessages = () => {
    if (!user) return () => {};

    if (realtimeChannel.current) {
      try {
        supabase.removeChannel(realtimeChannel.current);
      } catch (err) {
        console.warn("Old channel removal failed:", err);
      }
      realtimeChannel.current = null;
    }

    realtimeChannel.current = supabase
      .channel("mega_chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: "is_mega_chat=eq.true" },
        async (payload: any) => {
          const insertedId = payload.new?.id;
          if (!insertedId) return;

          try {
            const { data, error } = await supabase
              .from("messages")
              .select(`
                id, user_id, content, reactions, is_pinned, created_at,
                users (username, is_verified)
              `)
              .eq("id", insertedId)
              .single<DBMessage>();

            if (!error && data && data.users) {
              const u = extractUser(data.users);
              const newMsg: Message = {
                id: data.id,
                userId: data.user_id,
                username: u.username,
                content: data.content,
                isVerifiedAuthor: !!u.is_verified,
                reactions: data.reactions ?? defaultReactions,
                isPinned: !!data.is_pinned,
                createdAt: new Date(data.created_at),
              };
              setMessages((prev) => (prev.some((p) => p.id === newMsg.id) ? prev : [...prev, newMsg]));
            }
          } catch (err) {
            console.error("Realtime INSERT handler error:", err);
          }
        }
      )
      .subscribe();

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(120, ta.scrollHeight)}px`;
  }, [newMessage]);

  useEffect(() => {
    if (!user) return;
    loadMessages();
    const cleanup = subscribeToMessages();
    return () => cleanup?.();
  }, [user?.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      const canSend = await incrementMessageCount?.();
      if (!canSend) {
        alert("Daily message limit reached! Get verified for unlimited messages.");
        setSending(false);
        return;
      }

      const { error } = await supabase.from("messages").insert({
        user_id: user.id,
        content: newMessage.trim(),
        is_mega_chat: true,
        reactions: defaultReactions,
        is_pinned: false,
      });

      if (error) throw error;
      setNewMessage("");
      await updateKarma?.(1);
    } catch (err) {
      console.error("send message failed:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      if (!sending && newMessage.trim()) handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-sm text-slate-600 font-medium">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="px-6 py-4 border-b border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Mega Chat</h2>
          <p className="text-sm text-slate-500 mt-1">Campus-wide public feed</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Send className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-900 mb-2">No messages yet</p>
              <p className="text-sm text-slate-500">Be the first to start the conversation</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.userId === user?.id;
              return (
                <div key={m.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                  {!isMine && (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {m.username?.[0]?.toUpperCase() || "A"}
                    </div>
                  )}

                  <div className={`flex-1 max-w-2xl ${isMine ? 'flex flex-col items-end' : ''}`}>
                    {!isMine && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-medium text-slate-900">{m.username}</span>
                        {m.isVerifiedAuthor && (
                          <Shield className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span className="text-xs text-slate-400">{formatTime(m.createdAt)}</span>
                      </div>
                    )}

                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        isMine
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-900'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {m.content}
                      </p>
                    </div>

                    {isMine && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-400">{formatTime(m.createdAt)}</span>
                      </div>
                    )}
                  </div>

                  {isMine && <div className="w-9" />}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full min-h-[44px] max-h-[120px] resize-none px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-slate-400">{newMessage.length}/500</span>
              {user?.isAnonymous && (
                <span className="text-xs text-slate-500">
                  {50 - (user?.dailyMessageCount || 0)} messages left today
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}