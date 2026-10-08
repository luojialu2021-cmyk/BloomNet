import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSitterAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import SitterAppHeader from "../../components/SitterAppHeader";
import { API_BASE_URL } from "../../api/config";
import { formatTimeET } from "../../utils/dateUtils";

// ---- Types ----
type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
};

type Conversation = {
  id: string;
  // ConversationListItem structure (from backend)
  other_user_id?: string;
  other_user_name?: string;
  other_user_type?: "user" | "sitter";
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  // Legacy structure (may still exist)
  user_id?: string;
  user_name?: string;
  sitter_id?: string;
  sitter_name?: string;
  participants?: string[];
  participant_details?: {
    [key: string]: {
      name: string;
      email: string;
      role: string;
    };
  };
  messages?: Message[];
};

// ---- Messages Page ----
export default function SitterMessages() {
  const navigate = useNavigate();
  const { user, isAuthenticated, token, isLoading: authLoading } = useSitterAuth();
  const { socket, connected, sendMessage, joinConversation, leaveConversation, onNewMessage, offNewMessage } = useChat();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track draft without causing re-renders
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Ref to track message container and scroll position
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef(0);

  const active = useMemo(() => conversations.find(c => c.id === activeId), [conversations, activeId]);

  // Get user email as a stable value
  const userEmail = user?.email;

  // Get the current sitter's ID for message comparison
  // For sitter, we need to use the conversation's sitter_id to determine if a message is from us
  const getCurrentSitterId = useCallback((conv: Conversation | undefined): string | null => {
    if (!conv) {
      console.log('getCurrentSitterId: no conversation');
      return null;
    }
    // Use sitter_id from conversation if available
    if (conv.sitter_id) {
      console.log('getCurrentSitterId: using sitter_id from conversation:', conv.sitter_id);
      return String(conv.sitter_id);
    }
    console.log('getCurrentSitterId: no sitter_id in conversation, conv:', { id: conv.id, user_id: conv.user_id, sitter_id: conv.sitter_id });
    return null;
  }, []);

  // Check if a message is from the current sitter
  const isOwnMessage = useCallback((message: Message, conversation: Conversation | undefined): boolean => {
    if (!conversation) return false;
    const currentSitterId = getCurrentSitterId(conversation);
    if (currentSitterId) {
      return String(message.sender_id || '') === String(currentSitterId);
    }
    // Fallback: check if sender_id matches user_id (though this might be wrong for sitters)
    return String(message.sender_id || '') === String(user?.user_id || '');
  }, [getCurrentSitterId, user?.user_id]);

  // Wrap loadConversations in useCallback to prevent re-creation
  const loadConversations = useCallback(async () => {
    if (!token || !userEmail) return;

    // Don't show loading spinner during auto-refresh to avoid UI disruption
    const isInitialLoad = conversations.length === 0;
    if (isInitialLoad) {
      setLoading(true);
    }
    setError(null);
    try {
      // Use chat endpoint with email-based matching
      const response = await fetch(`${API_BASE_URL}/chat/conversations?user_email=${encodeURIComponent(userEmail)}&user_type=sitter`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }

      const data = await response.json();
      
      // Deduplicate conversations: keep only the latest conversation per other_user_id
      const conversationsMap = new Map();
      for (const conv of data) {
        const key = conv.other_user_id || conv.user_id || conv.id;
        const existing = conversationsMap.get(key);
        if (!existing || new Date(conv.last_message_at || 0) > new Date(existing.last_message_at || 0)) {
          conversationsMap.set(key, conv);
        }
      }
      const deduplicated = Array.from(conversationsMap.values());
      
      console.log('Loaded conversations:', deduplicated.map(c => ({
        id: c.id,
        other_user_name: c.other_user_name,
        sitter_id: c.sitter_id,
        user_id: c.user_id
      })));
      
      setConversations(deduplicated);
      
      // Set first conversation as active if we have any
      // Messages will be loaded automatically via useEffect when activeId changes
      if (deduplicated.length > 0 && !activeId) {
        const firstConvId = deduplicated[0].id;
        console.log('[loadConversations] Setting first conversation as active:', firstConvId);
        setActiveId(firstConvId);
      }
    } catch (err: any) {
      console.error('Error loading conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [token, userEmail, conversations.length, activeId]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!token) return;

    console.log('Loading messages for conversation:', conversationId);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const messages = await response.json();
      console.log(`[loadMessages] API returned ${messages.length} messages for conversation ${conversationId}`);
      
      if (!Array.isArray(messages)) {
        console.error('[loadMessages] API did not return an array:', messages);
        return;
      }
      
      if (messages.length > 0) {
        console.log(`[loadMessages] Sample messages:`, messages.slice(0, 3).map((m: any) => ({
          id: m.id,
          sender_id: m.sender_id,
          sender_type: m.sender_type,
          content: m.content?.substring(0, 20) || m.content,
          created_at: m.created_at
        })));
      } else {
        console.warn(`[loadMessages] No messages found for conversation ${conversationId}`);
      }
      
      // Update conversations with messages, merge with existing messages to avoid duplicates
      setConversations(prev =>
        prev.map(conv => {
          if (conv.id === conversationId) {
            // Merge new messages with existing ones, avoiding duplicates
            const existingMessageIds = new Set((conv.messages || []).map(m => m.id));
            const newMessages = messages.filter((m: any) => !existingMessageIds.has(m.id));
            const mergedMessages = [...(conv.messages || []), ...newMessages].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            
            console.log(`Merged messages for conversation ${conversationId}:`, mergedMessages.length, 'total messages');
            return { ...conv, messages: mergedMessages };
          }
          return conv;
        })
      );
    } catch (err: any) {
      console.error('Error loading messages:', err);
    }
  }, [token]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeId && token) {
      console.log('[useEffect] Active conversation changed, loading messages:', activeId);
      loadMessages(activeId);
    }
  }, [activeId, loadMessages, token]);

  // Ensure messages are loaded for active conversation if it doesn't have messages yet
  useEffect(() => {
    if (active && activeId && token && (!active.messages || active.messages.length === 0)) {
      console.log('[useEffect] Active conversation has no messages, loading:', activeId);
      loadMessages(activeId);
    }
  }, [active, activeId, token, loadMessages]);

  // Join/leave Socket.IO conversation room
  useEffect(() => {
    if (!connected || !activeId) return;
    
    joinConversation(activeId);
    return () => {
      leaveConversation(activeId);
    };
  }, [connected, activeId, joinConversation, leaveConversation]);

  // Handle Socket.IO real-time messages
  useEffect(() => {
    if (!connected) return;

    const handleNewMessage = (message: any) => {
      console.log('Received new message via Socket.IO:', message);
      
      // Only update if message belongs to current active conversation (ensure string comparison)
      if (String(message.conversation_id || '') === String(activeId || '')) {
        setConversations(prev =>
          prev.map(conv => {
            // Ensure string comparison
            if (String(conv.id || '') === String(message.conversation_id || '')) {
              // Check if message already exists (avoid duplicates)
              const messageExists = conv.messages?.some(m => String(m.id || '') === String(message.id || ''));
              if (messageExists) {
                console.log('Message already exists, skipping:', message.id);
                return conv;
              }
              
              return {
                ...conv,
                messages: [...(conv.messages || []), {
                  id: message.id,
                  sender_id: message.sender_id,
                  content: message.content,
                  created_at: message.created_at,
                  read: false
                }],
                last_message_at: message.created_at,
              };
            }
            return conv;
          })
        );
      } else {
        // Update conversation list if message is for another conversation
        setConversations(prev =>
          prev.map(conv => {
            // Ensure string comparison
            if (String(conv.id || '') === String(message.conversation_id || '')) {
              return {
                ...conv,
                last_message: message.content,
                last_message_at: message.created_at,
              };
            }
            return conv;
          })
        );
      }
    };

    onNewMessage(handleNewMessage);
    return () => {
      offNewMessage(handleNewMessage);
    };
  }, [connected, activeId, onNewMessage, offNewMessage]);

  // Load conversations on mount only
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !token) {
      navigate('/sitter/login');
      return;
    }

    loadConversations();
  }, [authLoading, isAuthenticated, token, navigate, loadConversations]);

  // Auto-refresh conversations only if Socket.IO is not connected (fallback polling)
  useEffect(() => {
    if (!token || connected) return; // Don't poll if Socket.IO is connected

    const interval = setInterval(() => {
      // Only refresh if user is not typing (check ref, not state)
      if (!draftRef.current) {
        loadConversations();
      }
    }, 10000); // 10 seconds fallback polling

    return () => clearInterval(interval);
  }, [token, userEmail, connected, loadConversations]); // Only poll if not connected

  // Auto-scroll to bottom only when new messages arrive (not on every re-render)
  useEffect(() => {
    if (!active || !active.messages) return;
    
    const currentMessageCount = active.messages.length;
    const wasAtBottom = prevMessagesCountRef.current > 0 && 
                        currentMessageCount > prevMessagesCountRef.current;
    
    // Only auto-scroll if we just sent/received a new message
    if (wasAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    prevMessagesCountRef.current = currentMessageCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.messages?.length]); // Only trigger on message count change

  const send = async () => {
    console.log('send() called', { 
      draft: draft.trim(), 
      hasActive: !!active, 
      activeId: active?.id,
      hasToken: !!token, 
      hasUserId: !!user?.user_id,
      connected,
      hasSocket: !!socket
    });

    if (!draft.trim()) {
      console.log('send() aborted: no draft content');
      return;
    }
    if (!active) {
      console.log('send() aborted: no active conversation');
      return;
    }
    if (!token) {
      console.log('send() aborted: no token');
      return;
    }
    if (!user?.user_id) {
      console.log('send() aborted: no user_id');
      return;
    }

    const messageContent = draft.trim();
    setDraft(""); // Clear draft immediately for better UX

    try {
      // Try Socket.IO first if connected
      if (connected && socket) {
        console.log('Sending via Socket.IO', {
          conversationId: active.id,
          content: messageContent,
          senderType: 'sitter',
          senderId: user.user_id
        });
        // Explicitly specify sender_type and sender_id for Sitter
        sendMessage(active.id, messageContent, undefined, 'sitter', user.user_id);
        console.log('Socket.IO sendMessage called');
        // Message will be received via Socket.IO real-time update, no optimistic update needed
      } else {
        console.log('Sending via HTTP fallback', {
          conversationId: active.id,
          content: messageContent,
          senderId: user.user_id,
          senderType: 'sitter'
        });
        // Fallback to HTTP
        const response = await fetch(`${API_BASE_URL}/chat/messages?sender_id=${encodeURIComponent(user.user_id)}&sender_type=sitter`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            conversation_id: active.id,
            content: messageContent
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const newMessage = await response.json();
        
        // Update local state
        setConversations(prev =>
          prev.map(c =>
            c.id === active.id
              ? {
                  ...c,
                  messages: [...(c.messages || []), newMessage],
                  last_message_at: newMessage.created_at,
                }
              : c
          )
        );
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setDraft(messageContent); // Restore draft on error
      alert('Failed to send message. Please try again.');
    }
  };

  const getOtherParticipant = (conv: Conversation) => {
    // Priority: Use ConversationListItem structure (what backend actually returns)
    if (conv.other_user_name) {
      return {
        name: conv.other_user_name,
        email: '', // Email not available in ConversationListItem
        role: conv.other_user_type || 'user'
      };
    }
    
    // Fallback: Handle legacy conversation structure (user_id, sitter_id, etc.)
    if (conv.user_id && conv.sitter_id && conv.user_name && conv.sitter_name) {
      // Use email matching instead of ID matching
      const currentUserEmail = user?.email;
      
      // Check if current user is the sitter by email
      if (currentUserEmail === 'sittertest996@gmail.com') {
        return {
          name: conv.user_name,
          email: '', // We don't have user email in this structure
          role: 'user'
        };
      }
      // Check if current user is the user by email
      else if (currentUserEmail && currentUserEmail !== 'sittertest996@gmail.com') {
        return {
          name: conv.sitter_name,
          email: 'sittertest996@gmail.com', // Sitter email
          role: 'sitter'
        };
      }
    }
    
    // Fallback: Handle old conversation structure (participants, participant_details)
    if (conv.participants && conv.participant_details) {
      const otherId = conv.participants.find(p => p !== user?.user_id);
      if (otherId) {
        return conv.participant_details[otherId];
      }
    }
    
    return null;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-amber-600 border-t-transparent animate-spin"></div>
          <p className="text-gray-600">
            {authLoading ? 'Loading authentication...' : 'Loading messages...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <SitterAppHeader
        navItems={[
          { label: 'User Portal', to: '/' },
          { label: 'Dashboard', to: '/sitter/dashboard' },
          { label: 'Messages', to: '/sitter/messages' },
          { label: 'Availability', to: '/sitter/availability' }
        ]}
      />

      {/* Main Content */}
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">Communicate with your clients</p>
        </div>

        {error && (
          <div className="p-4 mb-6 border border-red-200 rounded-xl bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {conversations.length === 0 && !loading && (
          <div className="p-8 text-center bg-white border rounded-xl">
            <p className="text-gray-600">No conversations yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Conversations will appear here when clients message you.
            </p>
          </div>
        )}

        {conversations.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Conversation list */}
            <aside className="overflow-hidden bg-white border shadow-md rounded-xl">
              <div className="px-4 py-3 text-sm font-semibold border-b bg-amber-50 text-amber-900">
                All Conversations ({conversations.length})
              </div>
              <ul className="max-h-[60vh] overflow-auto divide-y">
                {conversations.map(c => {
                  const other = getOtherParticipant(c);
                  const unreadCount = c.messages ? c.messages.filter(m => 
                    !m.read && !isOwnMessage(m, c)
                  ).length : 0;
                  
                  return (
                    <li
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className={`p-4 cursor-pointer hover:bg-amber-50 transition-colors ${
                        activeId === c.id ? "bg-amber-50 border-l-4 border-amber-500" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">
                          {other?.name || 'Unknown User'}
                        </span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 text-xs text-white rounded-full bg-amber-600">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{other?.email}</div>
                      {c.messages && c.messages.length > 0 && (
                        <div className="mt-1 text-sm text-gray-600 truncate">
                          {c.messages[c.messages.length - 1].content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Chat window */}
            <div className="flex flex-col bg-white border shadow-md rounded-xl md:col-span-2 min-h-[60vh]">
              {active ? (
                <>
                  <div className="px-4 py-3 text-sm font-semibold border-b bg-amber-50 text-amber-900">
                    Chat with {getOtherParticipant(active)?.name || 'Unknown User'}
                  </div>
                  <div ref={messagesContainerRef} className="flex-1 p-4 space-y-3 overflow-auto">
                    {(active.messages || []).map(m => {
                      const isOwn = isOwnMessage(m, active);
                      return (
                      <div 
                        key={m.id} 
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isOwn
                              ? "bg-amber-100 text-gray-900" 
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{m.content}</div>
                          <div className="mt-1 text-[10px] text-gray-500">
                            {fmtTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="flex gap-2 p-4 border-t">
                    <input
                      className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Type a message…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                    />
                    <button 
                      onClick={send} 
                      className="px-6 py-2 text-white transition-colors rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400"
                      disabled={!draft.trim()}
                    >
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center flex-1">
                  <p className="text-gray-500">Select a conversation to start chatting</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Utils ----
// Use Eastern Time formatting
const fmtTime = formatTimeET;
