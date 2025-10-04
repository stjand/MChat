// src/components/MegaChat.tsx
import React, { useEffect, useRef, useState } from "react";
import { Send, Flame, Heart, Eye, Laugh, Pin, Flag } from "lucide-react";
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
  const initialized = useRef(false);

  // ----- Load messages from Supabase -----
  const loadMessages = async () => {
    if (isLoadingMessages.current) return;
    isLoadingMessages.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          id,
          user_id,
          content,
          reactions,
          is_pinned,
          created_at,
          users:users!inner (
            username,
            is_verified
          )
        `
        )
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
            username: u.is_verified ? `${u.username} ✅` : u.username,
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

  // ----- Realtime subscription -----
  const subscribeToMessages = () => {
    if (!user) return () => {};

    // Cleanup old channel
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
              .eq("id", insertedId)
              .single<DBMessage>();

            if (!error && data && data.users) {
              const u = extractUser(data.users);
              const newMsg: Message = {
                id: data.id,
                userId: data.user_id,
                username: u.is_verified ? `${u.username} ✅` : u.username,
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: "is_mega_chat=eq.true" },
        (payload: any) => {
          const updated = payload.new;
          if (!updated?.id) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? { ...m, reactions: updated.reactions ?? m.reactions, isPinned: updated.is_pinned ?? m.isPinned }
                : m
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Realtime channel disconnected, retrying in 2s...");
          setTimeout(subscribeToMessages, 2000);
        }
      });

    // Cleanup function
    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  };

  // ----- Auto-scroll -----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ----- Auto-resize textarea -----
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(200, ta.scrollHeight)}px`;
  }, [newMessage]);

  // ----- Initialize messages & subscription -----
  useEffect(() => {
    if (!user) return;

    loadMessages();
    const cleanup = subscribeToMessages();

    return () => {
      cleanup?.();
      initialized.current = false; // Reset on unmount
    };
  }, [user?.id]);

  // ----- Send message -----
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

  const handleReaction = async (messageId: string, reaction: keyof Message["reactions"]) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, reactions: { ...(m.reactions ?? defaultReactions), [reaction]: (m.reactions?.[reaction] ?? 0) + 1 } }
          : m
      )
    );

    try {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;
      const updatedReactions = { ...(msg.reactions ?? defaultReactions), [reaction]: (msg.reactions?.[reaction] ?? 0) + 1 };
      const { error } = await supabase.from("messages").update({ reactions: updatedReactions }).eq("id", messageId);
      if (!error) await updateKarma?.(1);
    } catch (err) {
      console.error("Failed to update reaction:", err);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString();
  };

  // ----- UI -----
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-gray-300">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <div>Loading messages...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div>
          <h2 className="font-semibold text-lg">Mega Chat</h2>
          <p className="text-xs text-white/50">Public room — be kind, be bold.</p>
        </div>
        <div className="text-xs text-white/40">Black & White theme</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 text-white/60">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>
            <div className="text-lg">No messages yet</div>
            <div className="text-sm">Say hello — your messages appear on the right.</div>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.userId === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"} px-2`}>
                {!isMine && (
                  <div className="mr-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium">
                      {m.username?.[0] ?? "U"}
                    </div>
                  </div>
                )}

                <div className="max-w-[78%]">
                  <div className={`flex items-center gap-2 ${isMine ? "justify-end" : ""}`}>
                    {!isMine && <div className="text-sm font-medium text-white/90">{m.username}</div>}
                    {m.isPinned && (
                      <div className="text-xs text-amber-300 flex items-center gap-1 bg-amber-400/5 px-2 py-0.5 rounded-full">
                        <Pin className="w-3 h-3" />
                        Pinned
                      </div>
                    )}
                  </div>

                  <div
                    className={`mt-1 rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isMine
                        ? "bg-white text-black rounded-br-none shadow-white/5"
                        : "bg-white/5 text-white rounded-bl-none"
                    }`}
                    style={{ wordBreak: "break-word" }}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>

                  <div className={`mt-2 flex items-center gap-3 text-xs ${isMine ? "justify-end" : ""}`}>
                    <div className="text-white/50">{formatTime(new Date(m.createdAt))}</div>
                    <button className="p-1 rounded hover:bg-white/5">
                      <Flag className="w-4 h-4 text-white/60" />
                    </button>

                    <div className="flex items-center gap-2">
                      {(
                        [
                          { Icon: Flame, key: "fire" },
                          { Icon: Laugh, key: "laugh" },
                          { Icon: Heart, key: "heart" },
                          { Icon: Eye, key: "eyes" },
                        ] as const
                      ).map(({ Icon, key }) => {
                        const count = (m.reactions as any)?.[key] ?? 0;
                        return (
                          <button
                            key={key}
                            onClick={() => handleReaction(m.id, key as keyof Message["reactions"])}
                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/3 hover:bg-white/8 text-xs"
                          >
                            <Icon className="w-4 h-4" />
                            {count > 0 && <span className="text-xs">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {isMine && <div className="ml-3 w-10" />}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-black/95">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={user?.isAnonymous ? `${50 - (user?.dailyMessageCount || 0)} messages left today...` : "Write a message — Enter to send, Shift+Enter for newline"}
              className="w-full min-h-[44px] max-h-[200px] resize-none bg-white/5 placeholder-white/40 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-white/10"
              maxLength={500}
              aria-label="Write a message"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <div>{newMessage.length}/500</div>
              {user?.isAnonymous ? <div className="text-amber-400">Get verified for unlimited messages</div> : <div />}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className={`p-3 rounded-full transition-transform ${!newMessage.trim() || sending ? "bg-white/10 cursor-not-allowed" : "bg-white text-black hover:scale-105"}`}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
            <div className="text-xs text-white/40">{sending ? "Sending..." : ""}</div>
          </div>
        </div>
      </form>
    </div>
  );
}
