import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../api/config';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  sender_type?: string;
  created_at: string;
  status?: string;
}

interface ChatContextType {
  socket: Socket | null;
  connected: boolean;
  sendMessage: (conversationId: string, content: string, messageId?: string, senderType?: string, senderId?: string) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  onNewMessage: (callback: (message: Message) => void) => void;
  offNewMessage: (callback: (message: Message) => void) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ownerUser, sitterUser } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const messageCallbacksRef = useRef<Set<(message: Message) => void>>(new Set());

  // Determine which user is currently active (prioritize owner, then sitter)
  const currentUser = ownerUser || sitterUser;

  useEffect(() => {
    // Only connect if user is authenticated
    if (currentUser) {
      // Use SOCKET_URL from config (same as backend base URL)
      console.log('[ChatContext] Connecting to Socket.IO at:', SOCKET_URL);
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('Socket.IO connected');
        setConnected(true);
        
        // Authenticate with server
        newSocket.emit('authenticate', { user_id: currentUser.user_id });
      });

      newSocket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        setConnected(false);
      });

      newSocket.on('connection_established', (data) => {
        console.log('Connection established:', data);
      });

      newSocket.on('authenticated', (data) => {
        console.log('Authenticated:', data);
      });

      newSocket.on('new_message', (message: any) => {
        const normalised: Message = {
          id: message.id ?? message.message_id ?? `${Date.now()}`,
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          sender_type: message.sender_type,
          content: message.content,
          created_at: message.created_at ?? message.timestamp ?? new Date().toISOString(),
          status: message.status,
        };
        console.log('New message received:', normalised);
        // Call all registered callbacks
        messageCallbacksRef.current.forEach(callback => callback(normalised));
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Disconnect if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const sendMessage = (conversationId: string, content: string, messageId?: string, senderType?: string, senderId?: string) => {
    console.log('ChatContext.sendMessage() called', {
      conversationId,
      content,
      messageId,
      senderType,
      senderId,
      hasSocket: !!socket,
      connected,
      currentUser: currentUser?.user_id
    });

    if (!socket) {
      console.error('ChatContext.sendMessage() failed: no socket');
      return;
    }
    if (!connected) {
      console.error('ChatContext.sendMessage() failed: not connected');
      return;
    }

    // Use provided sender info, or fall back to currentUser
    const finalSenderId = senderId || currentUser?.user_id;
    const finalSenderType = senderType || currentUser?.role || 'user';
    
    if (!finalSenderId) {
      console.error('ChatContext.sendMessage() failed: no sender ID available');
      return;
    }
    
    const payload = {
      conversation_id: conversationId,
      sender_id: finalSenderId,
      content,
      message_id: messageId,
      timestamp: new Date().toISOString(),
      sender_type: finalSenderType,
    };
    
    console.log('ChatContext.sendMessage() emitting send_message event', payload);
    socket.emit('send_message', payload);
    console.log('ChatContext.sendMessage() event emitted');
  };

  const joinConversation = (conversationId: string) => {
    if (socket && connected) {
      socket.emit('join_conversation', { conversation_id: conversationId });
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socket && connected) {
      socket.emit('leave_conversation', { conversation_id: conversationId });
    }
  };

  const onNewMessage = (callback: (message: Message) => void) => {
    messageCallbacksRef.current.add(callback);
  };

  const offNewMessage = (callback: (message: Message) => void) => {
    messageCallbacksRef.current.delete(callback);
  };

  const value = {
    socket,
    connected,
    sendMessage,
    joinConversation,
    leaveConversation,
    onNewMessage,
    offNewMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
