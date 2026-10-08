import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Leaf, User, LogOut, MessageCircle, Edit, Send } from 'lucide-react';
import { useOwnerAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { API_BASE_URL } from '../../api/config';
import { formatTimeET, formatDateET } from '../../utils/dateUtils';

type UserProfile = {
  name: string;
  email: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  bio?: string;
  preferred_plant_types: string[];
  is_complete: boolean;
};

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
};

type Conversation = {
  id: string;
  // New API structure (ConversationListItem)
  other_user_id?: string;
  other_user_name?: string;
  other_user_type?: "user" | "sitter";
  user_id?: string;
  sitter_id?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  // Legacy structure
  participants?: string[];
  participant_details?: {
    [key: string]: {
      name: string;
      email: string;
      role: string;
    };
  };
  messages: Message[];
};

export default function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, token, isLoading: authLoading } = useOwnerAuth();
  const { socket, connected, sendMessage: sendMessageViaSocket, joinConversation, leaveConversation, onNewMessage, offNewMessage } = useChat();
  const [activeTab, setActiveTab] = useState<'profile' | 'messages'>('messages');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingTargetUserId, setPendingTargetUserId] = useState<string | null>(null);

  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === activeConversationId), 
    [conversations, activeConversationId]
  );

  const fetchData = useCallback(async (showLoading = true): Promise<void> => {
    if (!token || !user?.user_id) {
      console.log('[Dashboard] fetchData: missing token or user_id', { token: !!token, userId: user?.user_id });
      return;
    }
    
    // Only show loading spinner on initial load
    if (showLoading) {
      setLoading(true);
    }
    
    console.log('[Dashboard] fetchData: Starting to fetch data...', { userId: user.user_id });
    
    try {
      // Fetch user profile
      const profileResponse = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData);
      }

      // Fetch conversations using the new chat API
      // Use user_id instead of email to match how ChatWithSitter creates conversations
      const userId = user.user_id;
      if (!userId) {
        console.log('[Dashboard] No user_id available');
        return;
      }
      
      try {
        const conversationsUrl = `${API_BASE_URL}/chat/conversations?user_id=${encodeURIComponent(userId)}&user_type=user`;
        console.log('[Dashboard] Fetching conversations from:', conversationsUrl);
        
        const conversationsResponse = await fetch(conversationsUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          console.log('[Dashboard] Loaded conversations:', conversationsData);
          
          if (conversationsData.length === 0) {
            console.log('[Dashboard] No conversations found');
            setConversations([]);
          } else {
            // Deduplicate conversations: keep only the latest conversation per other_user_id
            const conversationsMap = new Map();
            for (const conv of conversationsData) {
              const key = conv.other_user_id || conv.sitter_id || conv.user_id || conv.id;
              const existing = conversationsMap.get(key);
              if (!existing || new Date(conv.last_message_at || 0) > new Date(existing.last_message_at || 0)) {
                conversationsMap.set(key, conv);
              }
            }
            const deduplicatedConversations = Array.from(conversationsMap.values());
            console.log('[Dashboard] After deduplication:', deduplicatedConversations.length, 'conversations');
            
            // Load messages for each conversation
            console.log('[Dashboard] Loading messages for', deduplicatedConversations.length, 'conversations');
            const conversationsWithMessages = await Promise.all(
              deduplicatedConversations.map(async (conv: any) => {
                try {
                  const messagesResponse = await fetch(
                    `${API_BASE_URL}/chat/conversations/${conv.id}/messages`,
                    {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    }
                  );
                  if (messagesResponse.ok) {
                    const messages = await messagesResponse.json();
                    console.log(`[Dashboard] Loaded ${messages.length} messages for conversation ${conv.id}`);
                    return { ...conv, messages: messages || [] };
                  }
                } catch (err) {
                  console.error(`Error loading messages for conversation ${conv.id}:`, err);
                }
                return { ...conv, messages: [] };
              })
            );
            
            console.log('[Dashboard] Setting conversations:', conversationsWithMessages.length);
            setConversations(conversationsWithMessages);
            if (conversationsWithMessages.length > 0 && !activeConversationId) {
              setActiveConversationId(conversationsWithMessages[0].id);
            }
          }
        } else {
          const errorText = await conversationsResponse.text();
          console.warn('[Dashboard] Failed to fetch conversations:', conversationsResponse.status, errorText);
        }
      } catch (conversationsError) {
        console.error('[Dashboard] Error fetching conversations:', conversationsError);
      }
    } catch (error) {
        console.error('[Dashboard] Error fetching data:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
    return Promise.resolve();
  }, [token, user?.user_id]);

  // Handle navigation from Explore page
  useEffect(() => {
    console.log('[Dashboard] Location state check:', location.state);
    const state = location.state as { openMessages?: boolean; targetUserId?: string; targetUserName?: string } | null;
    const targetUserId = state?.targetUserId;
    console.log('[Dashboard] Parsed state:', { openMessages: state?.openMessages, targetUserId, hasUser: !!user?.user_id, hasToken: !!token });
    if (state?.openMessages && targetUserId && user?.user_id && token) {
      console.log('[Dashboard] ✅ Navigation from Explore detected, creating/finding conversation with:', targetUserId);
      setActiveTab('messages');
      
      // Check if conversation already exists
      const existingConv = conversations.find(conv => {
        // Check if this conversation is with the target user
        // For user-to-user, we need to check both user_id and sitter_id fields
        return conv.other_user_id === targetUserId || 
               conv.user_id === targetUserId || 
               conv.sitter_id === targetUserId;
      });
      
      if (existingConv) {
        console.log('[Dashboard] Found existing conversation:', existingConv.id);
        setActiveConversationId(existingConv.id);
      } else {
        // Create new conversation with the target user
        // Note: Using chatService which expects sitter_id, but we'll pass the user_id
        // The backend will handle it (it will try to find a sitter profile, but will still create the conversation)
        // Set pending target user ID so we can find it after refetch
        setPendingTargetUserId(targetUserId);
        
        import('../../api/services').then(({ chatService }) => {
          console.log('[Dashboard] Creating conversation with:', { userId: user.user_id, targetUserId });
          chatService.createConversation(user.user_id, targetUserId)
            .then(async response => {
              console.log('[Dashboard] Create conversation response:', response);
              if (response.data) {
                const newConvId = (response.data as any).id;
                console.log('[Dashboard] Created new conversation with ID:', newConvId);
                
                // Refetch conversations to get the proper structure from the API
                console.log('[Dashboard] Refetching conversations...');
                await fetchData(false);
                console.log('[Dashboard] Conversations refetched, pending target:', pendingTargetUserId);
              } else {
                console.warn('[Dashboard] No data in create conversation response');
              }
            })
            .catch(error => {
              console.error('[Dashboard] Error creating conversation:', error);
              setPendingTargetUserId(null);
              alert('Failed to create conversation. Please try again.');
            });
        });
      }
      
      // Clear the navigation state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, conversations, user?.user_id, token, navigate, location.pathname]);

  // Watch for pending target user and set conversation as active when it appears
  useEffect(() => {
    if (pendingTargetUserId && conversations.length > 0) {
      console.log('[Dashboard] Checking for pending conversation with user:', pendingTargetUserId);
      console.log('[Dashboard] Current conversations:', conversations.map(c => ({
        id: c.id,
        other_user_id: c.other_user_id,
        user_id: c.user_id,
        sitter_id: c.sitter_id,
        other_user_name: c.other_user_name
      })));
      
      const foundConv = conversations.find(conv => {
        return conv.other_user_id === pendingTargetUserId || 
               conv.user_id === pendingTargetUserId || 
               conv.sitter_id === pendingTargetUserId;
      });
      
      if (foundConv) {
        console.log('[Dashboard] ✅ Found pending conversation, setting as active:', foundConv.id);
        setActiveConversationId(foundConv.id);
        setPendingTargetUserId(null);
      } else {
        console.log('[Dashboard] ⚠️ Pending conversation not found yet. Will retry...');
      }
    }
  }, [pendingTargetUserId, conversations]);

  useEffect(() => {
    // Wait for auth to load before fetching data
    if (authLoading) {
      console.log('[Dashboard] Waiting for auth to load...');
      return;
    }
    
    // Wait for user to be available
    if (!user?.user_id) {
      console.log('[Dashboard] Waiting for user to be available...', { userId: user?.user_id });
      return;
    }
    
    console.log('[Dashboard] Auth and user ready, fetching data...');
    fetchData();
  }, [authLoading, user?.user_id, fetchData]);

  // Join/leave Socket.IO conversation room
  useEffect(() => {
    if (!connected || !activeConversationId) return;
    
    joinConversation(activeConversationId);
    return () => {
      leaveConversation(activeConversationId);
    };
  }, [connected, activeConversationId, joinConversation, leaveConversation]);

  // Handle Socket.IO real-time messages
  useEffect(() => {
    if (!connected) return;

    const handleNewMessage = (message: any) => {
      console.log('[Dashboard] Received new message via Socket.IO:', message);
      if (String(message.conversation_id || '') === String(activeConversationId || '')) {
        setConversations(prev =>
          prev.map(conv => {
            if (String(conv.id || '') === String(message.conversation_id || '')) {
              const messageExists = conv.messages.some(m => String(m.id || '') === String(message.id || ''));
              if (messageExists) {
                console.log('[Dashboard] Message already exists, skipping:', message.id);
                return conv;
              }
              return {
                ...conv,
                messages: [...conv.messages, {
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
        // Update conversation list item with new message preview
        setConversations(prev =>
          prev.map(conv => {
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
  }, [connected, activeConversationId, onNewMessage, offNewMessage]);

  // Auto-refresh messages when on messages tab (only when not typing and Socket.IO not connected)
  useEffect(() => {
    if (activeTab !== 'messages' || !token || connected) return;

    // Refresh every 10 seconds when on messages tab (only if not typing and Socket.IO not connected)
    const interval = setInterval(() => {
      if (!draft) {
        fetchData(false); // Don't show loading spinner during auto-refresh
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab, token, draft, fetchData, connected]); // Added connected as dependency

  const sendMessage = async () => {
    if (!draft.trim() || !activeConversation || !token || !user?.user_id) return;

    const messageContent = draft.trim();
    setDraft(''); // Clear draft immediately

    try {
      // Try Socket.IO first if connected
      if (connected && socket) {
        sendMessageViaSocket(activeConversation.id, messageContent, undefined, 'user', user.user_id);
        // Message will be received via Socket.IO real-time update
      } else {
        // Fallback to HTTP
        const response = await fetch(
          `${API_BASE_URL}/chat/messages?sender_id=${encodeURIComponent(user.user_id)}&sender_type=user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              conversation_id: activeConversation.id,
              content: messageContent
            })
          }
        );

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const newMessage = await response.json();
        
        // Update local state
        setConversations(prev =>
          prev.map(c =>
            c.id === activeConversation.id
              ? {
                  ...c,
                  messages: [...c.messages, newMessage],
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
    // Priority: Use new API structure
    if (conv.other_user_name) {
      return {
        name: conv.other_user_name,
        email: '',
        role: conv.other_user_type || 'sitter'
      };
    }
    
    // Fallback: Legacy structure
    if (conv.participants && conv.participant_details) {
      const otherId = conv.participants.find(p => p !== user?.user_id);
      if (otherId) {
        return conv.participant_details[otherId];
      }
    }
    
    return null;
  };

  // Use Eastern Time formatting
  const formatTime = formatTimeET;
  const formatDate = formatDateET;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEditProfile = () => {
    navigate('/register'); // Reuse registration page for editing
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-emerald-600 border-t-transparent animate-spin"></div>
          <p className="text-gray-600">
            {authLoading ? 'Loading authentication...' : 'Loading your dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b shadow-sm backdrop-blur bg-white/80">
        <div className="flex items-center justify-between max-w-6xl px-4 py-3 mx-auto">
          <div
  className="flex items-center gap-2 cursor-pointer"
  onClick={() => navigate('/')}
>
  <Leaf className="w-6 h-6 text-emerald-600"/>
  <span className="text-xl font-bold text-gray-900">BloomNet</span>
</div>
          <nav className="flex items-center gap-4 text-sm">
            <button
              onClick={() => navigate('/search')}
              className="transition-colors hover:text-emerald-600"
            >
              Find Sitters
            </button>
            <button
              onClick={() => navigate('/reservations')}
              className="transition-colors hover:text-emerald-600"
            >
              My Reservations
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 transition-colors hover:text-red-600"
            >
              <LogOut className="w-4 h-4"/>
              Logout
            </button>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500">
              <span className="text-sm font-medium text-white">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl px-4 py-8 mx-auto">
        {/* Welcome Section */}
        <div className="p-8 mb-6 bg-white border shadow-lg rounded-2xl border-emerald-100">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {profile?.name || user?.name}! 🌱
            </h1>
          </div>
          <p className="text-gray-600">Manage your plant care bookings and profile</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'messages'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-emerald-50'
            }`}
          >
            <MessageCircle className="w-5 h-5"/>
            Messages
            {conversations.filter(c => 
              (c.messages || []).some((m: Message) => !m.read && String(m.sender_id || '') !== String(user?.user_id || ''))
            ).length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                {conversations.filter(c => 
                  (c.messages || []).some((m: Message) => !m.read && String(m.sender_id || '') !== String(user?.user_id || ''))
                ).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-emerald-50'
            }`}
          >
            <User className="w-5 h-5"/>
            My Profile
          </button>
        </div>

        {/* Content */}
        {activeTab === 'profile' && profile && (
          <div className="p-8 bg-white border shadow-lg rounded-2xl border-emerald-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
              <button
                onClick={handleEditProfile}
                className="flex items-center gap-2 px-4 py-2 text-white transition-all bg-emerald-600 rounded-xl hover:bg-emerald-700"
              >
                <Edit className="w-4 h-4"/>
                Edit Profile
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="mb-1 text-sm font-semibold text-gray-500">Name</h3>
                <p className="text-lg text-gray-900">{profile.name}</p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-semibold text-gray-500">Email</h3>
                <p className="text-lg text-gray-900">{profile.email}</p>
              </div>

              {profile.phone && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-gray-500">Phone</h3>
                  <p className="text-lg text-gray-900">{profile.phone}</p>
                </div>
              )}

              {(profile.address_line1 || profile.city || profile.state || profile.zipcode) && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-gray-500">Location</h3>
                  <p className="text-lg text-gray-900">
                    {[
                      profile.address_line1,
                      profile.address_line2,
                      profile.city,
                      profile.state,
                      profile.zipcode
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {profile.bio && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-gray-500">About Your Plants</h3>
                  <p className="text-lg text-gray-900">{profile.bio}</p>
                </div>
              )}

              {profile.preferred_plant_types && profile.preferred_plant_types.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-500">Plant Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.preferred_plant_types.map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1 text-sm font-medium rounded-lg bg-emerald-100 text-emerald-700"
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!profile.is_complete && (
                <div className="p-4 border bg-amber-50 border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    Your profile is incomplete. Please complete your profile to get the best experience.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div>
            {loading ? (
              <div className="p-12 text-center bg-white border shadow-lg rounded-2xl border-emerald-100">
                <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full border-emerald-600 border-t-transparent animate-spin"></div>
                <p className="text-gray-600">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-12 text-center bg-white border shadow-lg rounded-2xl border-emerald-100">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">No messages yet</h3>
                <p className="mb-4 text-gray-600">
                  Conversations will appear here when you contact sitters.
                </p>
                <button
                  onClick={() => navigate('/search')}
                  className="px-6 py-3 font-semibold text-white transition-all bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700"
                >
                  Find Sitters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Conversation list */}
                <aside className="overflow-hidden bg-white border shadow-md rounded-xl border-emerald-100">
                  <div className="px-4 py-3 text-sm font-semibold border-b bg-emerald-50 text-emerald-900">
                    Conversations ({conversations.length})
                  </div>
                  <ul className="max-h-[60vh] overflow-auto divide-y">
                    {conversations.map(c => {
                      const other = getOtherParticipant(c);
                      const unreadCount = (c.messages || []).filter((m: Message) => 
                        !m.read && String(m.sender_id || '') !== String(user?.user_id || '')
                      ).length;
                      
                      return (
                        <li
                          key={c.id}
                          onClick={() => setActiveConversationId(c.id)}
                          className={`p-4 cursor-pointer hover:bg-emerald-50 transition-colors ${
                            activeConversationId === c.id ? "bg-emerald-50 border-l-4 border-emerald-500" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-900">
                              {other?.name || c.other_user_name || 'Unknown User'}
                            </span>
                            {unreadCount > 0 && (
                              <span className="px-2 py-0.5 text-xs text-white rounded-full bg-emerald-600">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          {other?.email && (
                            <div className="text-xs text-gray-500">{other.email}</div>
                          )}
                          {(c.messages || []).length > 0 ? (
                            <div className="mt-1 text-sm text-gray-600 truncate">
                              {c.messages[c.messages.length - 1].content}
                            </div>
                          ) : c.last_message && (
                            <div className="mt-1 text-sm text-gray-600 truncate">
                              {c.last_message}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </aside>

                {/* Chat window */}
                <div className="flex flex-col bg-white border shadow-md rounded-xl border-emerald-100 md:col-span-2 min-h-[60vh]">
                  {activeConversation ? (
                    <>
                      <div className="px-4 py-3 text-sm font-semibold border-b bg-emerald-50 text-emerald-900">
                        Chat with {getOtherParticipant(activeConversation)?.name || 'Unknown User'}
                      </div>
                      <div className="flex-1 p-4 space-y-3 overflow-auto">
                        {(activeConversation.messages || []).map(m => {
                          const isOwn = String(m.sender_id || '') === String(user?.user_id || '');
                          return (
                          <div 
                            key={m.id} 
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                                isOwn
                                  ? "bg-emerald-100 text-gray-900" 
                                  : "bg-gray-100 text-gray-900"
                              }`}
                            >
                              <div className="whitespace-pre-wrap">{m.content}</div>
                              <div className="mt-1 text-[10px] text-gray-500">
                                {formatTime(m.created_at)}
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 p-4 border-t">
                        <input
                          className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Type a message…"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        />
                        <button 
                          onClick={sendMessage} 
                          className="px-6 py-2 text-white transition-colors rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400"
                          disabled={!draft.trim()}
                        >
                          <Send className="w-5 h-5" />
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
        )}
      </main>
    </div>
  );
}
