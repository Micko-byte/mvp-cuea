import React, { createContext, useContext, useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  createChat: () => Chat;
  setActiveChat: (id: string) => void;
  sendMessage: (text: string) => void;
  deleteChat: (id: string) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

const BOT_RESPONSES = [
  "I can help you with that! Based on your course materials, here's what I found...",
  "Great question! Let me check your syllabus for the relevant information.",
  "Here's a summary of the key concepts from your recent lectures on this topic.",
  "I've found some practice questions related to your query. Would you like me to share them?",
  "Based on your enrolled units, I recommend reviewing Chapter 5 for more details on this.",
];

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  const createChat = useCallback(() => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: "New Chat",
      messages: [],
      timestamp: Date.now(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    return newChat;
  }, []);

  const setActiveChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, []);

  const sendMessage = useCallback((text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      text,
      sender: "user",
      timestamp: Date.now(),
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === activeChatId) {
          const updatedMessages = [...chat.messages, userMsg];
          const title = chat.messages.length === 0 ? text.slice(0, 40) : chat.title;
          // Add bot response after delay
          setTimeout(() => {
            const botMsg: ChatMessage = {
              id: `msg-${Date.now()}-bot`,
              text: BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)],
              sender: "bot",
              timestamp: Date.now(),
            };
            setChats((p) =>
              p.map((c) =>
                c.id === activeChatId
                  ? { ...c, messages: [...c.messages, botMsg] }
                  : c
              )
            );
          }, 1000);
          return { ...chat, title, messages: updatedMessages };
        }
        return chat;
      })
    );
  }, [activeChatId]);

  const deleteChat = useCallback((id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  }, [activeChatId]);

  return (
    <ChatContext.Provider value={{ chats, activeChat, createChat, setActiveChat, sendMessage, deleteChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};
