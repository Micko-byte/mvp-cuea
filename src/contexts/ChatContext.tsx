import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

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
  isStreaming: boolean;
  createChat: () => Promise<Chat | null>;
  setActiveChat: (id: string) => void;
  sendMessage: (text: string, overrideChatId?: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  loadChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  const loadChats = useCallback(async () => {
    if (!user) return;
    const { data: chatRows } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!chatRows) return;

    const loaded: Chat[] = [];
    for (const row of chatRows) {
      const { data: msgRows } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", row.id)
        .order("created_at", { ascending: true });

      loaded.push({
        id: row.id,
        title: row.title,
        timestamp: new Date(row.created_at).getTime(),
        messages: (msgRows || []).map((m) => ({
          id: m.id,
          text: m.content,
          sender: m.role === "user" ? "user" : "bot",
          timestamp: new Date(m.created_at).getTime(),
        })),
      });
    }
    setChats(loaded);
  }, [user]);

  const createChat = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("chats")
      .insert({ user_id: user.id, title: "New Chat" })
      .select()
      .single();
    if (error || !data) return null;

    const newChat: Chat = { id: data.id, title: data.title, messages: [], timestamp: Date.now() };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(data.id);
    return newChat;
  }, [user]);

  const setActiveChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, []);

  const sendMessage = useCallback(async (text: string, overrideChatId?: string) => {
    const chatId = overrideChatId || activeChatId;
    if (!user || !chatId) return;

    // Add user message to DB
    const { data: userMsg } = await supabase
      .from("chat_messages")
      .insert({ chat_id: chatId, user_id: user.id, role: "user", content: text })
      .select()
      .single();

    if (!userMsg) return;

    // Update local state with user message
    const userChatMsg: ChatMessage = {
      id: userMsg.id, text, sender: "user", timestamp: Date.now(),
    };

    // Update title if first message
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const title = c.messages.length === 0 ? text.slice(0, 50) : c.title;
          if (c.messages.length === 0) {
            supabase.from("chats").update({ title }).eq("id", chatId).then(() => {});
          }
          return { ...c, title, messages: [...c.messages, userChatMsg] };
        }
        return c;
      })
    );

    // Build messages for AI
    const currentChat = chats.find((c) => c.id === chatId);
    const aiMessages = [
      ...(currentChat?.messages || []).map((m) => ({
        role: m.sender === "user" ? "user" as const : "assistant" as const,
        content: m.text,
      })),
      { role: "user" as const, content: text },
    ];

    // Stream from edge function
    setIsStreaming(true);
    let assistantContent = "";
    
    // Safety timeout to reset streaming after 60s
    const streamingTimeout = setTimeout(() => {
      setIsStreaming(false);
    }, 60000);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: aiMessages, chatId }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Failed to connect to AI" }));
        toast.error(errData.error || "AI service error");
        setIsStreaming(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Create placeholder bot message
      const botMsgId = `bot-${Date.now()}`;
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: [...c.messages, { id: botMsgId, text: "", sender: "bot" as const, timestamp: Date.now() }] }
            : c
        )
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setChats((prev) =>
                prev.map((c) =>
                  c.id === chatId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === botMsgId ? { ...m, text: assistantContent } : m
                        ),
                      }
                    : c
                )
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to DB
      if (assistantContent) {
        await supabase.from("chat_messages").insert({
          chat_id: chatId,
          user_id: user.id,
          role: "assistant",
          content: assistantContent,
        });
      }
    } catch (e) {
      console.error("Stream error:", e);
      toast.error("Failed to get AI response");
    } finally {
      clearTimeout(streamingTimeout);
      setIsStreaming(false);
    }
  }, [user, activeChatId, chats]);

  const deleteChat = useCallback(async (id: string) => {
    await supabase.from("chats").delete().eq("id", id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  }, [activeChatId]);

  return (
    <ChatContext.Provider value={{ chats, activeChat, isStreaming, createChat, setActiveChat, sendMessage, deleteChat, loadChats }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};
