import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Leaf, Send, ArrowLeft, User } from "lucide-react";

import { chatService } from "../api/services";
import type { ChatMessage } from "../api/types";
import { useOwnerAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { formatTimeET } from "../utils/dateUtils";

type ConversationListItem = {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_type: "user" | "sitter";
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
};

export default function ChatWithSitter() {
  const navigate = useNavigate();
  const { sitterId } = useParams<{ sitterId: string }>();
  const location = useLocation();
  const { user, isLoading: authLoading } = useOwnerAuth();
  const { joinConversation, leaveConversation, onNewMessage, offNewMessage, connected } = useChat();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState<string>(location.state?.sitterName || "Sitter");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  const userType: "user" | "sitter" = useMemo(() => {
    if (user?.role === "sitter") return "sitter";
    return "user";
  }, [user?.role]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const normalizeMessage = useCallback((msg: any): ChatMessage => {
    return {
      id: msg.id ?? msg._id ?? msg.message_id ?? `${Date.now()}`,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      sender_type: msg.sender_type ?? (msg.from === "me" ? userType : userType === "user" ? "sitter" : "user"),
      content: msg.content ?? msg.text ?? "",
      created_at: msg.created_at ?? msg.timestamp ?? new Date().toISOString(),
      status: msg.status ?? "sent",
      read_at: msg.read_at,
    };
  }, [userType]);

  const loadConversation = useCallback(async () => {
    if (!user || !sitterId) {
      setError("Missing user or sitter information.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const conversationsResponse = await chatService.listConversations(user.user_id, userType);
      let conversationList: ConversationListItem[] = Array.isArray(conversationsResponse.data)
        ? conversationsResponse.data
        : [];

      let activeConversation = conversationList.find((item) => item.other_user_id === sitterId);

      if (!activeConversation && userType === "user") {
        const createResponse = await chatService.createConversation(user.user_id, sitterId);
        if (createResponse.data) {
          activeConversation = {
            id: (createResponse.data as any).id,
            other_user_id: sitterId,
            other_user_name: (createResponse.data as any).sitter_name ?? otherUserName,
            other_user_type: "sitter",
          };
          conversationList = [...conversationList, activeConversation];
        }
      }

      if (!activeConversation) {
        setError("Conversation not found.");
        setLoading(false);
        return;
      }

      setConversationId(activeConversation.id);
      setOtherUserName(activeConversation.other_user_name ?? otherUserName);

      const messagesResponse = await chatService.getMessages(activeConversation.id);
      const initialMessages = Array.isArray(messagesResponse.data)
        ? messagesResponse.data.map(normalizeMessage)
        : [];

      messageIdsRef.current = new Set(initialMessages.map((msg) => msg.id));
      setMessages(initialMessages);
    } catch (err: any) {
      console.error("Failed to load conversation", err);
      setError(err?.message || "Failed to load conversation.");
    } finally {
      setLoading(false);
    }
  }, [user, sitterId, userType, otherUserName, normalizeMessage]);

  useEffect(() => {
    // Only redirect if authentication check is complete and user is definitely not authenticated
    if (!authLoading && !user) {
      console.log('[ChatWithSitter] No user authenticated, redirecting to login');
      navigate("/login", { replace: true });
      return;
    }
    // Only load conversation if user is authenticated (not loading and user exists)
    if (!authLoading && user) {
      loadConversation();
    }
  }, [user, authLoading, loadConversation, navigate]);

  useEffect(() => {
    if (!conversationId) return;

    const handleIncoming = (incomingRaw: any) => {
      const incoming = normalizeMessage(incomingRaw);
      // Ensure string comparison for conversation_id
      if (String(incoming.conversation_id || '') !== String(conversationId || '')) {
        console.log('Conversation ID mismatch:', incoming.conversation_id, 'vs', conversationId);
        return;
      }
      if (messageIdsRef.current.has(incoming.id)) {
        return;
      }
      console.log('Adding new message to User chat:', incoming);
      messageIdsRef.current.add(incoming.id);
      setMessages((prev) => [...prev, incoming]);
    };

    // Only join conversation if Socket.IO is connected
    if (connected) {
      joinConversation(conversationId);
      onNewMessage(handleIncoming);
    }

    return () => {
      if (connected) {
        offNewMessage(handleIncoming);
        leaveConversation(conversationId);
      }
    };
  }, [conversationId, connected, joinConversation, leaveConversation, onNewMessage, offNewMessage, normalizeMessage]);

  // Fallback: Poll for new messages when Socket.IO is not connected
  useEffect(() => {
    if (!conversationId || !user || connected) return;

    console.log('[ChatWithSitter] Socket.IO not connected, using polling fallback');
    
    const pollInterval = setInterval(async () => {
      try {
        const messagesResponse = await chatService.getMessages(conversationId);
        const newMessages = Array.isArray(messagesResponse.data)
          ? messagesResponse.data.map(normalizeMessage)
          : [];
        
        // Update messages if we have new ones
        setMessages((prev) => {
          const prevIds = new Set(prev.map(m => m.id));
          const newOnes = newMessages.filter(m => !prevIds.has(m.id));
          
          if (newOnes.length > 0) {
            console.log('[ChatWithSitter] Polling found', newOnes.length, 'new messages');
            return [...prev, ...newOnes];
          }
          return prev;
        });
      } catch (err) {
        console.error('[ChatWithSitter] Polling error:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [conversationId, user, connected, normalizeMessage]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const unseenMessages = messages.filter(
      (message) =>
        message.sender_id !== user.user_id &&
        (message.status === "sent" || message.status === "delivered")
    );

    if (unseenMessages.length) {
      chatService
        .markAsRead(
          conversationId,
          unseenMessages.map((msg) => msg.id),
          userType
        )
        .catch((err) => console.warn("Failed to mark messages as read", err));
    }
  }, [messages, conversationId, user, userType]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!conversationId || !user) return;

    const trimmed = draft.trim();
    if (!trimmed) return;

    setSending(true);
    setDraft("");

    try {
      const response = await chatService.sendMessage(
        conversationId,
        trimmed,
        user.user_id,
        userType
      );

      if (response.data) {
        const sentMessage = normalizeMessage(response.data);
        if (!messageIdsRef.current.has(sentMessage.id)) {
          messageIdsRef.current.add(sentMessage.id);
          setMessages((prev) => [...prev, sentMessage]);
        }
      }
    } catch (err: any) {
      console.error("Failed to send message", err);
      setError(err?.message || "Failed to send message.");
      setDraft(trimmed);
    } finally {
      setSending(false);
    }
  };

  // Use Eastern Time formatting
  const formatTimestamp = formatTimeET;

  const isOwnMessage = (message: ChatMessage) => {
    // Ensure string comparison
    const messageSenderId = String(message.sender_id || '');
    const currentUserId = String(user?.user_id || '');
    return messageSenderId === currentUserId;
  };

  const backgroundGradient = "bg-gradient-to-br from-emerald-50 via-green-50 to-white";

  return (
    <div className={`flex flex-col min-h-screen ${backgroundGradient}`}>
      <header className="sticky top-0 z-40 w-full border-b shadow-sm backdrop-blur bg-white/90">
        <div className="flex items-center justify-between max-w-4xl px-4 py-3 mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 transition-colors rounded-lg hover:bg-emerald-100"
            >
              <ArrowLeft className="w-5 h-5 text-emerald-600" />
            </button>
            <Leaf className="w-6 h-6 text-emerald-600" />
            <div>
              <span className="text-lg font-bold text-slate-900">
                Chat with {otherUserName}
              </span>
              <p className="text-xs text-slate-500">Stay in touch about booking details</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-sm font-medium transition-colors hover:text-amber-700"
          >
            Home
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl px-4 py-6 mx-auto space-y-4 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-10 text-sm text-amber-700">
            Loading conversation…
          </div>
        )}

        {error && (
          <div className="px-4 py-4 text-sm border rounded-2xl border-rose-200 bg-rose-50 text-rose-600">
            {error}
          </div>
        )}

        {!loading && !error && messages.map((message) => {
          const own = isOwnMessage(message);
          return (
            <div
              key={message.id}
              className={`flex ${own ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex gap-3 max-w-[70%] ${
                  own ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                    own ? "bg-amber-600" : "bg-amber-400"
                  }`}
                >
                  {own ? <User className="w-5 h-5" /> : otherUserName[0]?.toUpperCase() || "S"}
                </div>

                <div className="flex flex-col">
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      own
                        ? "bg-amber-600 text-white rounded-br-sm"
                        : "bg-white text-slate-800 shadow-sm rounded-bl-sm border border-amber-100"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                  <span
                    className={`text-xs text-slate-500 mt-1 ${
                      own ? "text-right" : "text-left"
                    }`}
                  >
                    {formatTimestamp(message.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      <div className="sticky bottom-0 border-t bg-white/90 backdrop-blur">
        <form
          onSubmit={handleSendMessage}
          className="max-w-4xl px-4 py-4 mx-auto"
        >
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage(event as unknown as React.FormEvent);
                }
              }}
              placeholder="Type your message…"
              className="flex-1 px-4 py-3 border border-amber-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none min-h-[50px] max-h-32 text-sm"
              rows={1}
              disabled={!conversationId || sending}
            />
            <button
              type="submit"
              disabled={!draft.trim() || !conversationId || sending}
              className="flex items-center justify-center w-12 h-12 text-white transition-all rounded-full shadow-md bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Press Enter to send, Shift+Enter for a new line.
          </p>
        </form>
      </div>
    </div>
  );
}
