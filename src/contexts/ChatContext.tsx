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
  chat_type: "general" | "unit";
  unit_id?: string;
}

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  isStreaming: boolean;
  createChat: (chatType?: "general" | "unit", unitId?: string) => Promise<Chat | null>;
  setActiveChat: (id: string) => void;
  sendMessage: (text: string, overrideChatId?: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  renameChat: (id: string, newTitle: string) => Promise<void>;
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
        chat_type: ((row as any).chat_type as "general" | "unit") || "general",
        unit_id: (row as any).unit_id || undefined,
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

  const createChat = useCallback(async (chatType: "general" | "unit" = "general", unitId?: string) => {
    if (!user) return null;
    const insertData: any = { user_id: user.id, title: "New Chat", chat_type: chatType };
    if (unitId) insertData.unit_id = unitId;
    
    const { data, error } = await supabase
      .from("chats")
      .insert(insertData)
      .select()
      .single();
    if (error || !data) return null;

    const newChat: Chat = {
      id: data.id,
      title: data.title,
      messages: [],
      timestamp: Date.now(),
      chat_type: chatType,
      unit_id: unitId,
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(data.id);
    return newChat;
  }, [user]);

  const setActiveChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, []);

  const renameChat = useCallback(async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    await supabase.from("chats").update({ title: trimmed }).eq("id", id);
    setChats((prev) => prev.map((c) => c.id === id ? { ...c, title: trimmed } : c));
  }, []);

  const sendMessage = useCallback(async (text: string, overrideChatId?: string) => {
    const chatId = overrideChatId || activeChatId;
    if (!user || !chatId) return;

    const { data: userMsg } = await supabase
      .from("chat_messages")
      .insert({ chat_id: chatId, user_id: user.id, role: "user", content: text })
      .select()
      .single();

    if (!userMsg) return;

    const userChatMsg: ChatMessage = {
      id: userMsg.id, text, sender: "user", timestamp: Date.now(),
    };

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const title = c.messages.length === 0 ? (text.length > 30 ? text.slice(0, 30) + "…" : text) : c.title;
          if (c.messages.length === 0) {
            supabase.from("chats").update({ title }).eq("id", chatId).then(() => {});
          }
          return { ...c, title, messages: [...c.messages, userChatMsg] };
        }
        return c;
      })
    );

    const currentChat = chats.find((c) => c.id === chatId);
    const aiMessages = [
      ...(currentChat?.messages || []).map((m) => ({
        role: m.sender === "user" ? "user" as const : "assistant" as const,
        content: m.text,
      })),
      { role: "user" as const, content: text },
    ];

    setIsStreaming(true);
    let assistantContent = "";
    const streamingTimeout = setTimeout(() => setIsStreaming(false), 60000);
    let requestTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        toast.error("Session expired. Please sign in again.");
        return;
      }

      const controller = new AbortController();
      requestTimeout = setTimeout(() => controller.abort(), 45000);

      // Include unit_id for unit-specific chats
      const bodyPayload: any = { messages: aiMessages, chatId };
      if (currentChat?.unit_id) bodyPayload.unitId = currentChat.unit_id;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
        body: JSON.stringify(bodyPayload),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Failed to connect to AI" }));
        if (errData.limit_reached) {
          toast.error(errData.error, { duration: 10000 });
          if (!errData.is_paid) {
            setTimeout(() => window.dispatchEvent(new CustomEvent("show-payment-prompt")), 500);
          }
        } else {
          toast.error(errData.error || "AI service error");
        }
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

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
      if (e instanceof Error && e.name === "AbortError") {
        toast.error("AI response timed out. Please try a shorter question.");
      } else if (e instanceof TypeError && e.message.includes("Failed to fetch")) {
        toast.error("Connection failed while reaching AI. Please try again.");
      } else {
        toast.error("Failed to get AI response");
      }
    } finally {
      if (requestTimeout) clearTimeout(requestTimeout);
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
    <ChatContext.Provider value={{ chats, activeChat, isStreaming, createChat, setActiveChat, sendMessage, deleteChat, renameChat, loadChats }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};
