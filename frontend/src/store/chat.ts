import { create } from "zustand";
import type { Conversation, Message } from "../types";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loadingMessages: boolean;
  typingUsers: Set<string>;
  messageCursor: string | null;
  hasMore: boolean;

  loadConversations: () => Promise<void>;
  setActiveConversation: (conv: Conversation | null) => void;
  loadMessages: (convId: string) => Promise<void>;
  loadMoreMessages: (convId: string) => Promise<void>;
  sendMessage: (convId: string, text: string, replyToId?: string) => Promise<void>;
  receiveMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (convId: string, messageId: string, forEveryone: boolean) => Promise<void>;
  setTyping: (userId: string, isTyping: boolean) => void;
  markRead: (convId: string) => Promise<void>;
  emitTyping: (convId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  loadingMessages: false,
  typingUsers: new Set(),
  messageCursor: null,
  hasMore: false,

  loadConversations: async () => {
    try {
      const { conversations } = await api.conversations.list();
      set({ conversations });
    } catch (err) {
      console.error("Load conversations error:", err);
    }
  },

  setActiveConversation: (conv) => {
    set({ activeConversation: conv, messages: [], messageCursor: null, hasMore: false });
  },

  loadMessages: async (convId: string) => {
    set({ loadingMessages: true });
    try {
      const { messages, nextCursor } = await api.conversations.messages(convId);
      set({ messages, messageCursor: nextCursor, hasMore: !!nextCursor, loadingMessages: false });
      await get().markRead(convId);
    } catch (err) {
      console.error("Load messages error:", err);
      set({ loadingMessages: false });
    }
  },

  loadMoreMessages: async (convId: string) => {
    const { messageCursor, hasMore, loadingMessages } = get();
    if (!hasMore || loadingMessages || !messageCursor) return;
    set({ loadingMessages: true });
    try {
      const { messages, nextCursor } = await api.conversations.messages(convId, messageCursor);
      set((state) => ({
        messages: [...messages, ...state.messages],
        messageCursor: nextCursor,
        hasMore: !!nextCursor,
        loadingMessages: false,
      }));
    } catch {
      set({ loadingMessages: false });
    }
  },

  sendMessage: async (convId: string, text: string, replyToId?: string) => {
    const { message } = await api.conversations.sendMessage(convId, { text, replyToId });
    set((state) => ({ messages: [...state.messages, message] }));

    // Emit via socket
    const socket = getSocket();
    if (socket) {
      socket.emit("message:send", { conversationId: convId, message });
    }

    // Update conversation list
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, updatedAt: new Date().toISOString(), messages: [message] } : c
      ),
    }));
  },

  receiveMessage: (message) => {
    const { activeConversation } = get();
    if (activeConversation?.id === message.conversationId) {
      set((state) => ({ messages: [...state.messages, message] }));
      get().markRead(message.conversationId);
    }
    // Update conversation list
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === message.conversationId
          ? { ...c, updatedAt: new Date().toISOString(), messages: [message], unreadCount: activeConversation?.id === message.conversationId ? 0 : (c.unreadCount || 0) + 1 }
          : c
      ),
    }));
  },

  updateMessage: (message) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
    }));
  },

  deleteMessage: async (convId: string, messageId: string, forEveryone: boolean) => {
    await api.conversations.deleteMessage(convId, messageId, forEveryone);
    if (forEveryone) {
      set((state) => ({
        messages: state.messages.map((m) => (m.id === messageId ? { ...m, deletedForEveryone: true, text: undefined } : m)),
      }));
    } else {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== messageId),
      }));
    }
    const socket = getSocket();
    if (socket) socket.emit("message:delete", { conversationId: convId, messageId, forEveryone });
  },

  setTyping: (userId: string, isTyping: boolean) => {
    set((state) => {
      const typingUsers = new Set(state.typingUsers);
      if (isTyping) typingUsers.add(userId);
      else typingUsers.delete(userId);
      return { typingUsers };
    });
  },

  markRead: async (convId: string) => {
    try {
      await api.conversations.read(convId);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === convId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch {}
  },

  emitTyping: (convId: string, isTyping: boolean) => {
    const socket = getSocket();
    if (socket) {
      if (isTyping) socket.emit("typing:start", { conversationId: convId });
      else socket.emit("typing:stop", { conversationId: convId });
    }
  },
}));
