import React, { createContext, useCallback, useContext, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

type MessagePart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ProcessedFile {
  file: File;
  name: string;
  type: "image" | "text" | "pdf" | "word" | "spreadsheet" | "file";
  size: string;
  preview?: string;
  text?: string;
  embeddingText?: string;
  base64?: string;
  mediaType?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: number;
  attachments?: { name: string; type: string; url?: string }[];
  rawContent?: string | MessagePart[];
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
  sendMessage: (text: string, overrideChatId?: string, files?: ProcessedFile[], teachMeMode?: boolean, openedSources?: { id: string; title: string; file_name: string }[]) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  deleteAllChats: () => Promise<void>;
  renameChat: (id: string, newTitle: string) => Promise<void>;
  loadChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

const parseStoredContent = (content: string): string | MessagePart[] => {
  if (typeof content === "string" && content.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed as MessagePart[];
    } catch {
      return content;
    }
  }

  return content;
};

const extractAttachmentLabel = (text: string) => {
  const firstLine = text.split("\n")[0]?.trim() ?? "";
  const match = firstLine.match(/^\[(?:Attached file|Attached PDF):\s*(.+?)(?:\s+—.*)?\]$/);
  return match?.[1]?.trim() ?? null;
};

const getDisplayTextPart = (text: string) => {
  const attachmentLabel = extractAttachmentLabel(text);
  if (attachmentLabel) return attachmentLabel;
  return text.trim();
};

const getDisplayText = (content: string | MessagePart[]) => {
  if (typeof content === "string") {
    return getDisplayTextPart(content) || "Attachment sent";
  }

  const parts: string[] = [];

  for (const part of content) {
    if (part.type === "image_url") {
      parts.push("Image attached");
      continue;
    }

    const line = getDisplayTextPart(part.text);
    if (line) parts.push(line);
  }

  return parts.join("\n\n").trim() || "Attachment sent";
};

const buildAttachmentPreviews = (files?: ProcessedFile[]) => {
  if (!files?.length) return undefined;

  return files.map((file) => ({
    name: file.file.name,
    type: file.file.type,
    url: file.preview,
  }));
};

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
        messages: (msgRows || []).map((message) => {
          const rawContent = parseStoredContent(message.content);

          return {
            id: message.id,
            text: getDisplayText(rawContent),
            rawContent,
            sender: message.role === "user" ? "user" : "bot",
            timestamp: new Date(message.created_at).getTime(),
          };
        }),
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
    setChats((prev) => prev.map((chat) => chat.id === id ? { ...chat, title: trimmed } : chat));
  }, []);

  const embedFilesInBackground = useCallback(async (files: ProcessedFile[], unitId: string, chatId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      for (const file of files) {
        if (!file.embeddingText || file.embeddingText.trim().length < 20) continue;

        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embed-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: file.embeddingText.slice(0, 50000),
            fileName: file.file.name,
            title: file.file.name,
            unitId,
            chatId,
          }),
        });
      }

      toast.success(`${files.map((file) => `"${file.file.name}"`).join(", ")} added to unit knowledge base`);
    } catch (error) {
      console.error("Background embedding failed:", error);
    }
  }, []);

  const sendMessage = useCallback(async (text: string, overrideChatId?: string, attachedFiles?: ProcessedFile[], teachMeMode?: boolean, openedSources?: { id: string; title: string; file_name: string }[]) => {
    const chatId = overrideChatId || activeChatId;
    if (!user || !chatId) return;

    let currentChat = chats.find((chat) => chat.id === chatId) || null;

    if (!currentChat) {
      const { data: chatRow } = await supabase
        .from("chats")
        .select("id, title, chat_type, unit_id, created_at")
        .eq("id", chatId)
        .single();

      if (chatRow) {
        currentChat = {
          id: chatRow.id,
          title: chatRow.title,
          messages: [],
          timestamp: new Date(chatRow.created_at).getTime(),
          chat_type: ((chatRow as any).chat_type as "general" | "unit") || "general",
          unit_id: (chatRow as any).unit_id || undefined,
        };
      }
    }

    const messageContent: MessagePart[] = [];

    if (attachedFiles?.length) {
      for (const file of attachedFiles) {
        if (file.type === "image" && file.base64 && file.mediaType) {
          messageContent.push({
            type: "image_url",
            image_url: { url: `data:${file.mediaType};base64,${file.base64}` },
          });
        } else if (file.text) {
          const truncated = file.text.length > 15000
            ? `${file.text.slice(0, 15000)}\n...[truncated for length]`
            : file.text;

          messageContent.push({
            type: "text",
            text: `[Attached file: ${file.file.name}]\n\`\`\`\n${truncated}\n\`\`\``,
          });
        } else if (file.base64 && file.mediaType === "application/pdf") {
          messageContent.push({
            type: "text",
            text: `[Attached PDF: ${file.file.name} — Please analyze this document based on any text content provided]`,
          });
        } else {
          messageContent.push({
            type: "text",
            text: `[Attached file: ${file.file.name} (${file.type})]`,
          });
        }
      }
    }

    if (text.trim()) {
      messageContent.push({ type: "text", text: text.trim() });
    }

    const finalContent = messageContent.length === 1 && messageContent[0].type === "text"
      ? messageContent[0].text
      : messageContent;

    const storedContent = typeof finalContent === "string" ? finalContent : JSON.stringify(finalContent);
    const displayText = getDisplayText(finalContent);

    const { data: userMessage } = await supabase
      .from("chat_messages")
      .insert({
        chat_id: chatId,
        user_id: user.id,
        role: "user",
        content: storedContent,
      })
      .select()
      .single();

    if (!userMessage) return;

    const attachmentPreviews = buildAttachmentPreviews(attachedFiles);
    const userChatMessage: ChatMessage = {
      id: userMessage.id,
      text: displayText,
      rawContent: finalContent,
      sender: "user",
      timestamp: Date.now(),
      attachments: attachmentPreviews,
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== chatId) return chat;

        const titleSeed = text.trim() || attachedFiles?.[0]?.file.name || "File analysis";
        const title = chat.messages.length === 0
          ? (titleSeed.length > 30 ? `${titleSeed.slice(0, 30)}…` : titleSeed)
          : chat.title;

        if (chat.messages.length === 0) {
          supabase.from("chats").update({ title }).eq("id", chatId).then(() => {});
        }

        return {
          ...chat,
          title,
          messages: [...chat.messages, userChatMessage],
        };
      })
    );

    if (currentChat?.chat_type === "unit" && currentChat.unit_id && attachedFiles?.length) {
      const filesToEmbed = attachedFiles.filter((file) => file.embeddingText && file.embeddingText.trim().length >= 20);
      if (filesToEmbed.length > 0) {
        void embedFilesInBackground(filesToEmbed, currentChat.unit_id, chatId);
      }
    }

    const historyMessages = (currentChat?.messages || []).map((message) => ({
      role: message.sender === "user" ? "user" as const : "assistant" as const,
      content: message.rawContent ?? message.text,
    }));

    const aiMessages = [
      ...historyMessages,
      { role: "user" as const, content: finalContent },
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

      const bodyPayload: Record<string, unknown> = { messages: aiMessages, chatId };
      if (currentChat?.unit_id) bodyPayload.unitId = currentChat.unit_id;
      if (teachMeMode) bodyPayload.teachMeMode = true;
      if (openedSources && openedSources.length > 0) bodyPayload.openedSources = openedSources;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to connect to AI" }));

        if (errorData.limit_reached) {
          toast.error(errorData.error, { duration: 10000 });
          if (!errorData.is_paid) {
            setTimeout(() => window.dispatchEvent(new CustomEvent("show-payment-prompt")), 500);
          }
        } else {
          toast.error(errorData.error || "AI service error");
        }

        return;
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const botMessageId = `bot-${Date.now()}`;
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, { id: botMessageId, text: "", sender: "bot", timestamp: Date.now() }],
              }
            : chat
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

          const jsonString = line.slice(6).trim();
          if (jsonString === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonString);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;

            if (content) {
              assistantContent += content;
              setChats((prev) =>
                prev.map((chat) =>
                  chat.id === chatId
                    ? {
                        ...chat,
                        messages: chat.messages.map((message) =>
                          message.id === botMessageId ? { ...message, text: assistantContent } : message
                        ),
                      }
                    : chat
                )
              );
            }
          } catch {
            textBuffer = `${line}\n${textBuffer}`;
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
    } catch (error) {
      console.error("Stream error:", error);
      if (error instanceof Error && error.name === "AbortError") {
        toast.error("AI response timed out. Please try a shorter question.");
      } else if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        toast.error("Connection failed while reaching AI. Please try again.");
      } else {
        toast.error("Failed to get AI response");
      }
    } finally {
      if (requestTimeout) clearTimeout(requestTimeout);
      clearTimeout(streamingTimeout);
      setIsStreaming(false);
    }
  }, [activeChatId, chats, embedFilesInBackground, user]);

  const deleteChat = useCallback(async (id: string) => {
    await supabase.from("chats").delete().eq("id", id);
    setChats((prev) => prev.filter((chat) => chat.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  }, [activeChatId]);

  const deleteAllChats = useCallback(async () => {
    if (!user) return;
    await supabase.from("chats").delete().eq("user_id", user.id);
    setChats([]);
    setActiveChatId(null);
  }, [user]);

  return (
    <ChatContext.Provider value={{ chats, activeChat, isStreaming, createChat, setActiveChat, sendMessage, deleteChat, deleteAllChats, renameChat, loadChats }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};