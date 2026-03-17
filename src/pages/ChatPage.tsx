import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, type ProcessedFile } from "@/contexts/ChatContext";
import { useArtifacts, detectArtifactType } from "@/contexts/ArtifactContext";
import { generateDocument, type DocType } from "@/utils/documentGenerator";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { generatePDF, generateDOCX, generatePPTX, generateXLSX } from "@/utils/documentGenerator";
import { Download } from "lucide-react";
import {
  Plus,
  ArrowUp,
  BookOpen,
  Calendar,
  FileText,
  ListChecks,
  LogOut,
  Trash2,
  Sparkles,
  ChevronDown,
  Paperclip,
  Settings,
  FolderOpen,
  Loader2,
  Shield,
  Image as ImageIcon,
  File,
  LayoutGrid,
  X,
  Code2,
  ChevronUp,
  Camera,
  FileQuestion,
  User,
  CircleHelp,
  Mic,
  Globe,
  MessageSquare,
  Search,
  PenLine,
  Pencil,
  Check,
  PanelRight,
  PanelLeft,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Pen,
  Play } from
"lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import ArtifactsPage from "@/pages/ArtifactsPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AcademicCalendar } from "@/components/AcademicCalendar";
import ArtifactViewer from "@/components/ArtifactViewer";
import { getTimeBasedGreeting } from "@/utils/greetings";

const SUGGESTIONS = [
{ icon: ListChecks, label: "Assignments", prompt: "What assignments do I have pending this week?" },
{ icon: Calendar, label: "Schedule", prompt: "Show me my class schedule for this week" },
{ icon: Search, label: "Notes", prompt: "Help me find lecture notes for my current units" },
{ icon: PenLine, label: "Exams", prompt: "Help me prepare for my upcoming exams with study tips" }];


// Date grouping helpers
function getDateGroup(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "Previous 7 Days";
  if (date >= monthAgo) return "Previous 30 Days";
  return "Older";
}

const DATE_GROUP_ORDER = ["Today", "Yesterday", "Previous 7 Days", "Previous 30 Days", "Older"];

interface EnrolledUnit {
  unit_id: string;
  unit_code: string;
  unit_name: string;
  lecturer: string | null;
}

const TypingIndicator = () =>
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  className="flex justify-start">
  
    <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) =>
      <motion.div
        key={i}
        className="w-2 h-2 rounded-full bg-muted-foreground/50"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />

      )}
        <span className="text-xs text-muted-foreground ml-2">CUEA AI is thinking...</span>
      </div>
    </div>
  </motion.div>;


const ChatPage = () => {
  const { user, profile, role, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const { chats, activeChat, isStreaming, createChat, setActiveChat, sendMessage, deleteChat, renameChat, loadChats } =
  useChat();
  const { viewerOpen, addArtifact, createFromCodeBlock } = useArtifacts();
  const { nickname, getChatBg } = usePersonalization();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<ProcessedFile[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "card">("mpesa");
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mainTab, setMainTab] = useState<"general" | "units">("general");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [enrolledUnits, setEnrolledUnits] = useState<EnrolledUnit[]>([]);
  const recognitionRef = useRef<any>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileMenuOpen]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<{x: number;y: number;} | null>(null);

  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, authLoading, navigate]);
  useEffect(() => {
    if (isAuthenticated) loadChats();
  }, [isAuthenticated, loadChats]);

  // Load enrolled units
  useEffect(() => {
    if (!user) return;
    const loadUnits = async () => {
      const { data } = await supabase.
      from("student_units").
      select("unit_id, units(code, name, lecturer)").
      eq("user_id", user.id);
      if (data) {
        setEnrolledUnits(
          data.map((su: any) => ({
            unit_id: su.unit_id,
            unit_code: su.units?.code || "",
            unit_name: su.units?.name || "",
            lecturer: su.units?.lecturer || null
          }))
        );
      }
    };
    loadUnits();
  }, [user]);

  useEffect(() => {
    const handler = () => setShowPaymentDialog(true);
    window.addEventListener("show-payment-prompt", handler);
    return () => window.removeEventListener("show-payment-prompt", handler);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      toast.success("Payment successful! 🎉 You now have 200,000 tokens/day.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (payment === "failed") {
      toast.error("Payment was not completed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isStreaming]);

  // Focus rename input
  useEffect(() => {
    if (renamingChatId) renameInputRef.current?.focus();
  }, [renamingChatId]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);
      const startX = touchStartRef.current.x;
      touchStartRef.current = null;
      if (Math.abs(dx) < 50 || dy > 100) return;
      if (dx > 0 && startX < 30 && !mobileSidebarOpen) setMobileSidebarOpen(true);else
      if (dx < 0 && mobileSidebarOpen) setMobileSidebarOpen(false);
    },
    [mobileSidebarOpen]
  );

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  const humanSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const toBase64 = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const [, base64 = ""] = dataUrl.split(",");
    return { dataUrl, base64 };
  };

  const getCategory = (file: File): ProcessedFile["type"] => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type === "application/pdf") return "pdf";
    if (file.name.endsWith(".docx") || file.type.includes("wordprocessingml")) return "word";
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.type.includes("spreadsheetml")) return "spreadsheet";
    if (
      file.type === "text/plain" ||
      file.type === "text/csv" ||
      file.type === "text/markdown" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".md")
    ) {
      return "text";
    }
    return "file";
  };

  const processAttachedFile = async (file: File): Promise<ProcessedFile> => {
    const processed: ProcessedFile = {
      file,
      name: file.name,
      type: getCategory(file),
      size: humanSize(file.size),
    };

    if (file.type.startsWith("image/")) {
      const { base64, dataUrl } = await toBase64(file);
      processed.base64 = base64;
      processed.mediaType = file.type;
      processed.preview = dataUrl;
      return processed;
    }

    if (
      file.type === "text/plain" ||
      file.type === "text/csv" ||
      file.type === "text/markdown" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".md")
    ) {
      const text = await file.text();
      processed.text = text;
      processed.embeddingText = text;
      return processed;
    }

    if (file.name.endsWith(".docx") || file.type.includes("wordprocessingml")) {
      try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        processed.text = result.value;
        processed.embeddingText = result.value;
      } catch {
        processed.text = `[Word document: ${file.name} — content extraction unavailable in browser]`;
      }
      return processed;
    }

    if (file.type === "application/pdf") {
      const { base64 } = await toBase64(file);
      processed.base64 = base64;
      processed.mediaType = "application/pdf";
      processed.text = `[PDF document: ${file.name} (${humanSize(file.size)}). Note: PDF text extraction is limited in the browser. The AI will do its best to help based on the filename and any context you provide. For best results with PDFs, copy and paste the text content directly into the chat.]`;
      return processed;
    }

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.type.includes("spreadsheetml")) {
      try {
        const XLSX = await import("xlsx");
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const parts: string[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          parts.push(`Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(worksheet)}`);
        }

        processed.text = parts.join("\n\n");
        processed.embeddingText = processed.text;
      } catch {
        processed.text = `[Excel file: ${file.name}]`;
      }
      return processed;
    }

    processed.text = `[Attached file: ${file.name} (${processed.type})]`;
    return processed;
  };

  const processFiles = async (files: File[]) => Promise.all(files.map(processAttachedFile));

  const handleFileSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const processed = await processFiles(Array.from(files));
    setAttachedFiles((prev) => [...prev, ...processed]);
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if ((!text && attachedFiles.length === 0) || isStreaming) return;

    let chat = activeChat;
    if (!chat) {
      if (mainTab === "units" && selectedUnitId) {
        chat = await createChat("unit", selectedUnitId);
      } else {
        chat = await createChat("general");
      }
      if (!chat) return;
    }

    const filesToSend = attachedFiles.length > 0 ? attachedFiles : undefined;
    setInput("");
    setAttachedFiles([]);
    inputRef.current?.focus();
    await sendMessage(text, chat.id, filesToSend);
  };

  const speechSupported =
  typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const toggleVoice = () => {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;
    let finalTranscript = "";
    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;else
        interim += e.results[i][0].transcript;
      }
      setInput(finalTranscript + interim);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) handleSend(finalTranscript.trim());
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  const pollPaymentStatus = async (reference: string) => {
    setPaymentVerifying(true);
    const maxAttempts = 60; // 5 minutes at 5s intervals
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const { data } = await supabase
        .from("payments")
        .select("status")
        .eq("paystack_reference", reference)
        .single();
      if (data?.status === "success") {
        setPaymentVerifying(false);
        setShowPaymentDialog(false);
        toast.success("Payment successful! 🎉 You now have 200,000 tokens/day.");
        return;
      } else if (data?.status === "failed") {
        setPaymentVerifying(false);
        toast.error("Payment failed. Please try again.");
        return;
      }
    }
    setPaymentVerifying(false);
    toast.error("Payment verification timed out. If you paid, it will be confirmed shortly.");
  };

  const handlePayment = async () => {
    if (paymentMethod === "card") {
      // Card payment via Paystack redirect
      setPaymentLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) { toast.error("Please sign in again."); return; }
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-initialize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ method: "card" })
        });
        const data = await resp.json();
        if (data.authorization_url) {
          window.open(data.authorization_url, "_blank");
          toast.info("Complete payment in the new tab.");
        } else {
          toast.error(data.error || "Failed to initialize card payment");
        }
      } catch {
        toast.error("Payment initialization failed.");
      } finally {
        setPaymentLoading(false);
      }
      return;
    }

    const phone = paymentPhone.trim();
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number (e.g. 0712345678)");
      return;
    }
    setPaymentLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) { toast.error("Please sign in again."); return; }
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ phone })
      });
      const data = await resp.json();
      if (data.reference) {
        setPaymentLoading(false);
        setPaymentPhone("");
        toast.success("Check your phone for the M-Pesa prompt.");
        pollPaymentStatus(data.reference);
      } else {
        toast.error(data.error || "Failed to initialize payment");
        setPaymentLoading(false);
      }
    } catch {
      toast.error("Payment initialization failed.");
      setPaymentLoading(false);
    }
  };

  const handleSuggestion = async (prompt: string) => {
    let chat = activeChat;
    if (!chat) {
      chat = await createChat("general");
      if (!chat) return;
    }
    await sendMessage(prompt, chat.id);
  };

  const handleCreateArtifact = (content: string, language: string) => {
    const type = detectArtifactType(language, content);
    addArtifact({ title: `${language.toUpperCase() || 'CODE'} Snippet`, content, language, type });
  };

  const handleDocumentDownload = async (format: DocType) => {
    if (!activeChat) return;
    const lastBotMsg = [...activeChat.messages].reverse().find(m => m.sender === 'bot');
    if (!lastBotMsg) return;
    const cleanContent = lastBotMsg.text.replace(/\[.*?\]\(download:[^)]+\)/g, '').trim();
    const title = activeChat.title || 'CUEA AI Document';
    try {
      await generateDocument({ title, content: cleanContent, type: format });
      toast.success(`${format.toUpperCase()} downloaded!`);
    } catch (e: any) {
      toast.error('Download failed: ' + e.message);
    }
  };

  const handleRenameSubmit = async (chatId: string) => {
    if (renameValue.trim()) await renameChat(chatId, renameValue);
    setRenamingChatId(null);
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const displayName = nickname || profile?.name || user?.email?.split("@")[0] || "Student";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleRetry = async (msgIndex: number) => {
    if (!activeChat || isStreaming) return;
    // Find the last user message before this bot message
    const msgs = activeChat.messages;
    let lastUserMsg = "";
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (msgs[i].sender === "user") {
        lastUserMsg = msgs[i].text;
        break;
      }
    }
    if (lastUserMsg) await sendMessage(lastUserMsg, activeChat.id);
  };

  const handleEditMessage = async (msgId: string, newText: string) => {
    if (!newText.trim() || !activeChat) return;
    setEditingMsgId(null);
    // Re-send the edited message as a new message
    await sendMessage(newText.trim(), activeChat.id);
  };

  // Filter chats based on current tab/unit
  const filteredChats = useMemo(() => {
    if (mainTab === "general") return chats.filter((c) => c.chat_type !== "unit");
    if (selectedUnitId) return chats.filter((c) => c.chat_type === "unit" && c.unit_id === selectedUnitId);
    return [];
  }, [chats, mainTab, selectedUnitId]);

  // Group chats by date
  const groupedChats = useMemo(() => {
    const groups: Record<string, typeof filteredChats> = {};
    for (const chat of filteredChats) {
      const group = getDateGroup(chat.timestamp);
      if (!groups[group]) groups[group] = [];
      groups[group].push(chat);
    }
    return groups;
  }, [filteredChats]);

  const selectedUnit = enrolledUnits.find((u) => u.unit_id === selectedUnitId);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

  }

  const toggleSidebar = () => {
    if (isMobile) setMobileSidebarOpen(!mobileSidebarOpen);else
    setSidebarExpanded(!sidebarExpanded);
  };

  const renderChatItem = (chat: (typeof chats)[0]) => {
    const isRenaming = renamingChatId === chat.id;
    const preview = chat.messages[0]?.text?.slice(0, 50) || "Empty chat";

    return (
      <div
        key={chat.id}
        onClick={() => {
          if (!isRenaming) {
            setActiveChat(chat.id);
            setShowArtifacts(false);
            if (isMobile) setMobileSidebarOpen(false);
          }
        }}
        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${activeChat?.id === chat.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40"}`}>
        
        <div className="flex-1 min-w-0">
          {isRenaming ?
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRenameSubmit(chat.id);
            }}
            className="flex items-center gap-1">
            
              <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRenameSubmit(chat.id)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setRenamingChatId(null);
              }}
              className="bg-transparent border-b border-primary text-sm w-full outline-none py-0.5"
              onClick={(e) => e.stopPropagation()} />
            

              <button type="submit" onClick={(e) => e.stopPropagation()} className="p-0.5 text-primary">
                <Check className="w-3 h-3" />
              </button>
            </form> :

          <>
              <span className="truncate block">{chat.title}</span>
              <span className="text-xs text-sidebar-foreground/30 block mt-0.5 truncate">{preview}</span>
            </>
          }
        </div>
        {!isRenaming &&
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
            <button
            onClick={(e) => {
              e.stopPropagation();
              setRenamingChatId(chat.id);
              setRenameValue(chat.title);
            }}
            className="p-1 hover:text-primary"
            title="Rename">
            
              <Pencil className="w-3 h-3" />
            </button>
            <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteChatId(chat.id);
            }}
            className="p-1 hover:text-destructive"
            title="Delete">
            
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        }
      </div>);

  };

  const sidebarContent =
  <>
      {/* Logo + Toggle */}
      <div className={`p-4 ${!sidebarExpanded && !isMobile ? "px-1.5 py-3" : ""}`}>
        {sidebarExpanded || isMobile ?
      <div className="flex items-center gap-3 mb-4">
            <span className="font-display font-bold text-sidebar-foreground text-lg">CUEA AI </span>
            <button
          onClick={toggleSidebar}
          className="ml-auto p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          title="Collapse sidebar">
          
              <PanelRight className="w-4 h-4" />
            </button>
          </div> :

      <div className="flex flex-col items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-sidebar-primary" />
            </div>
            <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          title="Expand sidebar">
          
              <PanelLeft className="w-5 h-5" />
            </button>
          </div>
      }

        {/* New Chat */}
        {sidebarExpanded || isMobile ?
      <Button
        onClick={() => {
          if (mainTab === "units" && selectedUnitId) createChat("unit", selectedUnitId);else
          createChat("general");
          setShowArtifacts(false);
          if (isMobile) setMobileSidebarOpen(false);
        }}
        className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 justify-start gap-2"
        size="sm">
        
            <Plus className="w-4 h-4" /> New Chat
          </Button> :

      <Button
        onClick={() => createChat("general")}
        className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 p-0 flex items-center justify-center"
        size="icon">
        
            <Plus className="w-4 h-4" />
          </Button>
      }
      </div>

      {/* Main Tabs: General / Units */}
      {(sidebarExpanded || isMobile) &&
    <div className="px-3 space-y-2">
          <div className="flex gap-1 bg-sidebar-accent/30 rounded-lg p-0.5">
            <button
          onClick={() => {
            setMainTab("general");
            setSelectedUnitId(null);
            setShowArtifacts(false);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-md transition-colors ${mainTab === "general" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/50 hover:text-sidebar-foreground/70"}`}>
          
              <Globe className="w-3.5 h-3.5" /> General
            </button>
            <button
          onClick={() => {
            setMainTab("units");
            setShowArtifacts(false);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-md transition-colors ${mainTab === "units" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/50 hover:text-sidebar-foreground/70"}`}>
          
              <BookOpen className="w-3.5 h-3.5" /> My Units
            </button>
          </div>

          {/* Artifacts link */}
          <button
        onClick={() => {
          setShowArtifacts(true);
          if (isMobile) setMobileSidebarOpen(false);
        }}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/40 transition-colors">
        
            <LayoutGrid className="w-4 h-4" /> <span>Artifacts</span>
          </button>
        </div>
    }

      {/* Unit Cards or Chat List */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {sidebarExpanded || isMobile ?
      mainTab === "units" && !selectedUnitId ?
      // Show unit cards
      enrolledUnits.length === 0 ?
      <div className="text-center py-8">
                <BookOpen className="w-8 h-8 text-sidebar-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-sidebar-foreground/30">No units enrolled</p>
                <p className="text-xs text-sidebar-foreground/20 mt-1">Units from your course will appear here</p>
              </div> :

      <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/40 px-1 mb-2">
                  Select a Unit
                </p>
                {enrolledUnits.map((unit) =>
        <button
          key={unit.unit_id}
          onClick={() => setSelectedUnitId(unit.unit_id)}
          className="w-full text-left p-3 rounded-xl border border-sidebar-accent/50 hover:bg-sidebar-accent/40 transition-colors">
          
                    <p className="text-xs font-bold text-primary">{unit.unit_code}</p>
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{unit.unit_name}</p>
                    {unit.lecturer && <p className="text-xs text-sidebar-foreground/40 mt-0.5">{unit.lecturer}</p>}
                  </button>
        )}
              </div> :


      // Show chat list grouped by date
      <>
              {mainTab === "units" && selectedUnitId &&
        <button
          onClick={() => setSelectedUnitId(null)}
          className="flex items-center gap-1 text-xs text-primary mb-3 hover:underline">
          
                  ← All Units
                </button>
        }
              {selectedUnit &&
        <div className="mb-3 p-2 rounded-lg bg-sidebar-accent/30">
                  <p className="text-xs font-bold text-primary">{selectedUnit.unit_code}</p>
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{selectedUnit.unit_name}</p>
                </div>
        }
              {filteredChats.length === 0 ?
        <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-sidebar-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-sidebar-foreground/30">No chats yet</p>
                </div> :

        <div className="space-y-3">
                  {DATE_GROUP_ORDER.map((group) => {
            const groupChats = groupedChats[group];
            if (!groupChats || groupChats.length === 0) return null;
            return (
              <div key={group}>
                        <p className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/40 px-1 mb-1.5">
                          {group}
                        </p>
                        <div className="space-y-0.5">{groupChats.map(renderChatItem)}</div>
                      </div>);

          })}
                </div>
        }
            </> :


      <div className="flex flex-col items-center gap-1">
            {chats.slice(0, 8).map((chat) =>
        <button
          key={chat.id}
          onClick={() => setActiveChat(chat.id)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${activeChat?.id === chat.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/50 hover:bg-sidebar-accent/40"}`}
          title={chat.title}>
          
                {chat.title.charAt(0).toUpperCase()}
              </button>
        )}
          </div>
      }
      </div>

      {/* Bottom: Profile */}
      <div ref={profileMenuRef} className={`relative ${!sidebarExpanded && !isMobile ? "px-1.5 py-3" : "p-3"}`}>
        <AnimatePresence>
          {profileMenuOpen && (sidebarExpanded || isMobile) &&
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-3 right-3 mb-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50">
          
              <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-popover-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email || "student"}</p>
                  </div>
                </div>
              </div>
              <div className="py-1.5">
                {role === "admin" &&
            <button
              onClick={() => {
                setProfileMenuOpen(false);
                navigate("/admin");
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors">
              
                    <Shield className="w-4 h-4 text-muted-foreground" /> <span>Admin Dashboard</span>
                  </button>
            }
                <button
              onClick={() => {
                setProfileMenuOpen(false);
                navigate("/personalization");
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors">
              
                  <User className="w-4 h-4 text-muted-foreground" /> <span>Personalization</span>
                </button>
                <button
              onClick={() => {
                setProfileMenuOpen(false);
                setSettingsOpen(true);
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors">
              
                  <Settings className="w-4 h-4 text-muted-foreground" /> <span>Settings</span>
                </button>
                <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors">
                  <CircleHelp className="w-4 h-4 text-muted-foreground" /> <span>Help</span>
                </button>

                {/* ── UPGRADE BUTTON ── */}
                <div className="mx-3 my-2 border-t border-border" />
                <div className="px-2 pb-1">
                  <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  setShowPaymentDialog(true);
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #800000 0%, #b91c1c 100%)", color: "white" }}>
                
                    
                    <span>⚡ Upgrade to Premium</span>
                  </button>
                </div>
                {/* ── END UPGRADE BUTTON ── */}

                <div className="my-1.5" />
                <button
              onClick={() => {
                setProfileMenuOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors">
              
                  <LogOut className="w-4 h-4 text-muted-foreground" /> <span>Log out</span>
                </button>
              </div>
            </motion.div>
        }
        </AnimatePresence>

        {sidebarExpanded || isMobile ?
      <button
        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-accent/40 transition-colors">
        
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold text-sidebar-accent-foreground flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.course_name || "Student"}</p>
            </div>
            <ChevronUp
          className={`w-4 h-4 text-sidebar-foreground/40 transition-transform ${profileMenuOpen ? "" : "rotate-180"}`} />
        
          </button> :

      <div className="flex flex-col items-center gap-2">
            <button
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold text-sidebar-accent-foreground"
          title={displayName}>
          
              {displayName.charAt(0).toUpperCase()}
            </button>
          </div>
      }
      </div>
    </>;


  const chatBgStyle = (() => {
    const bg = getChatBg();
    if (bg && bg.url)
    return {
      backgroundImage: `url(${bg.url})`,
      backgroundSize: "cover" as const,
      backgroundPosition: "center" as const
    };
    return {};
  })();

  // Chat input component
  const chatInput =
  <div className="max-w-[680px] w-full mx-auto pointer-events-auto">
    {attachedFiles.length > 0 &&
    <div className="flex flex-wrap gap-1.5 mb-2">
          {attachedFiles.map((pf, i) =>
      <span
        key={i}
        className="inline-flex items-center gap-1 text-xs bg-card border border-border px-2 py-1 rounded-lg">
              {pf.preview ? (
                <img src={pf.preview} alt="" className="w-6 h-6 rounded object-cover" />
              ) : pf.file.type.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <File className="w-3 h-3" />}
              <span className="max-w-[120px] truncate">{pf.file.name}</span>
              <button
          onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
          className="text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
      )}
        </div>
    }
      <div
      className="flex items-end gap-1 rounded-[24px] px-2 py-1.5 bg-[hsl(var(--chat-input-bg))] border border-solid border-inherit"
      style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.15)" }}>
      
        {/* Three separate hidden file inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { handleFileSelected(e.target.files); e.target.value = ""; }} />
        <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { handleFileSelected(e.target.files); e.target.value = ""; }} />
        <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.pptx,.ppt,.md" multiple className="hidden"
          onChange={(e) => { handleFileSelected(e.target.files); e.target.value = ""; }} />

        <Popover>
          <PopoverTrigger asChild>
            <button className="relative flex w-9 h-9 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0">
              <Paperclip className="w-4 h-4" />
              {mainTab === "units" && selectedUnitId && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" title="Files will be added to unit knowledge base" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-56 p-1.5">
            <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
              <Camera className="w-4 h-4 text-muted-foreground" /> {mainTab === "units" && selectedUnitId ? "Camera" : "Take Photo — AI analyzes it"}
            </button>
            <button
            onClick={() => photoInputRef.current?.click()}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
              <ImageIcon className="w-4 h-4 text-muted-foreground" /> {mainTab === "units" && selectedUnitId ? "Upload Image" : "Upload Image — AI analyzes it"}
            </button>
            <button
            onClick={() => docInputRef.current?.click()}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
              <FileText className="w-4 h-4 text-muted-foreground" /> {mainTab === "units" && selectedUnitId ? "Files — AI reads + saves to KB" : "Files — AI reads instantly"}
            </button>
            <button
            onClick={() => {
              handleSuggestion(
                "Enter Quiz Mode: Generate exam-style questions for my current unit to help me revise. Ask one question at a time, evaluate my answer, and explain the correct answer step by step."
              );
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
              <FileQuestion className="w-4 h-4 text-muted-foreground" /> Quizzes
            </button>
          </PopoverContent>
        </Popover>
        <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          // Auto-expand height
          const el = e.target;
          el.style.height = "auto";
          el.style.height = Math.min(el.scrollHeight, 150) + "px";
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder={selectedUnit ? `Ask about ${selectedUnit.unit_code}...` : "Ask CUEA AI anything..."}
        className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground py-2 px-2 min-w-0 resize-none overflow-y-auto"
        style={{ maxHeight: "150px" }}
        rows={1}
        disabled={isStreaming} />
      
        <div
        className="relative flex-shrink-0"
        title={
        !speechSupported ?
        "Voice input isn't supported on this browser" :
        isListening ?
        "Stop recording" :
        "Voice input"
        }>
        
          <button
          onClick={toggleVoice}
          disabled={!speechSupported}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0 relative ${isListening ? "text-primary bg-primary/20 mic-pulse-ring" : "text-muted-foreground hover:text-primary hover:bg-primary/10"} ${!speechSupported ? "opacity-40 cursor-not-allowed" : ""}`}>
          
            <Mic className="w-4 h-4" />
          </button>
        </div>
        <button
        onClick={() => handleSend()}
        disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex-shrink-0 disabled:opacity-40">
        
          {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
        </button>
      </div>
    </div>;


  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-sidebar flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarExpanded ? "w-[280px]" : "w-[56px]"}`}>
        
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen &&
        <>
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)} />
          
            <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed inset-y-0 left-0 w-[280px] z-50 bg-sidebar flex flex-col md:hidden">
            
              {sidebarContent}
            </motion.aside>
          </>
        }
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex min-w-0">
        <div
          className={`flex-1 flex flex-col min-w-0 relative ${viewerOpen ? "hidden md:flex" : ""}`}
          style={chatBgStyle}>
          
          {/* Header */}
          <header className="h-14 flex items-center px-4 flex-shrink-0 z-10 bg-transparent">
            <button onClick={toggleSidebar} className="p-2 hover:bg-foreground/10 rounded-lg mr-2 md:hidden">
              <PanelLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-semibold text-foreground text-sm truncate">
                {showArtifacts ?
                "Artifacts" :
                selectedUnit ?
                `${selectedUnit.unit_code} — ${selectedUnit.unit_name}` :
                activeChat ?
                activeChat.title :
                "CUEA AI"}
              </h2>
            </div>
            <button
              onClick={() => setCalendarOpen(!calendarOpen)}
              className="p-2 hover:bg-foreground/10 rounded-lg text-foreground"
              title="Academic Calendar">
              
              <Calendar className="w-5 h-5" />
            </button>
          </header>

          {showArtifacts ?
          <div className="flex-1 overflow-y-auto">
              <ArtifactsPage />
            </div> :

          (() => {
            const isNewChat = !activeChat || activeChat.messages.length === 0;

            return (
              <>
                  <div className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                      {isNewChat ?
                    <motion.div
                      key="new-chat"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, y: 40 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center justify-center h-full px-4">
                      
                          <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-6">
                        
                            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                              {greeting}, {displayName.split(" ")[0]}
                            </h2>
                            <p className="text-muted-foreground">
                              {selectedUnit ?
                          `Ask anything about ${selectedUnit.unit_code} — ${selectedUnit.unit_name}` :
                          "How can I help you with your studies today?"}
                            </p>
                          </motion.div>
                          <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="w-full px-4 md:px-0">
                        
                            {chatInput}
                          </motion.div>
                          {!selectedUnit &&
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap justify-center gap-2.5 mt-5 max-w-[680px] w-full px-4 md:px-0">
                        
                              {SUGGESTIONS.map((s, i) =>
                        <motion.button
                          key={s.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 + i * 0.08 }}
                          onClick={() => handleSuggestion(s.prompt)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 glass-card hover:-translate-y-0.5 transition-all"
                          style={{ borderRadius: "30px" }}>
                          
                                  <s.icon className="w-4 h-4 text-primary flex-shrink-0" />
                                  <span className="font-display font-semibold text-sm text-foreground whitespace-nowrap">
                                    {s.label}
                                  </span>
                                </motion.button>
                        )}
                            </motion.div>
                      }
                        </motion.div> :

                    <motion.div
                      key="active-chat"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-4">
                      
                          {activeChat!.messages.map((msg, msgIndex) =>
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group/msg flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                        
                              <div className="flex flex-col gap-1 max-w-[85%]">
                                {(() => {
                            const chatBg = getChatBg();
                            const hasCustomBg = chatBg && chatBg.url;
                            const bubbleStyle = hasCustomBg ?
                            msg.sender === "user" ?
                            { background: chatBg.userBubble, color: chatBg.userText } :
                            { background: chatBg.botBubble, color: chatBg.botText } :
                            msg.sender === "user" ?
                            { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" } :
                            undefined;
                            const bubbleClass =
                            msg.sender === "user" ?
                            `px-4 py-3 rounded-2xl text-sm leading-relaxed rounded-br-md` :
                            `px-4 py-3 rounded-2xl text-sm leading-relaxed rounded-bl-md ${!hasCustomBg ? "bg-muted text-foreground" : ""}`;
                            return (
                              <div className={bubbleClass} style={bubbleStyle}>
                                      {msg.sender === "bot" &&
                                <div className="flex items-center gap-1.5 mb-1.5">
                                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                                          <span className="text-xs font-semibold text-primary">CUEA AI</span>
                                        </div>
                                }
                                      {msg.sender === "bot" ?
                                <div className="prose prose-sm max-w-none dark:prose-invert break-words [overflow-wrap:anywhere] [word-break:break-word]">
                                          <ReactMarkdown
                                    components={{
                                      a({ href, children, ...props }) {
                                        if (href?.startsWith("download:")) {
                                          const format = href.replace("download:", "") as "pdf" | "docx" | "pptx" | "xlsx";
                                          const generators: Record<string, () => void> = {
                                            pdf: () => generatePDF(msg.text, activeChat?.title || "Document"),
                                            docx: () => generateDOCX(msg.text, activeChat?.title || "Document"),
                                            pptx: () => generatePPTX(msg.text, activeChat?.title || "Presentation"),
                                            xlsx: () => generateXLSX(msg.text, activeChat?.title || "Spreadsheet"),
                                          };
                                          const icons: Record<string, string> = { pdf: "📄", docx: "📝", pptx: "📊", xlsx: "📈" };
                                          return (
                                            <button
                                              onClick={() => generators[format]?.()}
                                              className="inline-flex items-center gap-2 px-4 py-2.5 my-1 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                              style={{
                                                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                                                color: "hsl(var(--primary-foreground))",
                                                boxShadow: "0 2px 8px hsl(var(--primary) / 0.3)",
                                              }}
                                            >
                                              <Download className="w-4 h-4" />
                                              <span>{String(children).replace("📥 ", "")}</span>
                                            </button>
                                          );
                                        }
                                        return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                                      },
                                      code({ className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || "");
                                        const lang = match ? match[1] : "";
                                        const codeStr = String(children).replace(/\n$/, "");
                                        const isBlock = codeStr.includes("\n") || !!lang;
                                        const canPreview = ['html', 'htm', 'javascript', 'js', 'jsx', 'tsx', 'svg'].includes(lang.toLowerCase());
                                        if (isBlock) {
                                          return (
                                            <div className="relative group/code my-2">
                                              {lang && (
                                                <div className="flex items-center justify-between bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-t-lg text-xs">
                                                  <span className="font-mono">{lang}</span>
                                                  <div className="flex items-center gap-1 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                                    <button
                                                      onClick={() => { navigator.clipboard.writeText(codeStr); toast.success('Copied!'); }}
                                                      className="px-2 py-0.5 rounded hover:bg-zinc-700 transition-colors"
                                                    >Copy</button>
                                                    {canPreview && (
                                                      <button
                                                        onClick={() => handleCreateArtifact(codeStr, lang)}
                                                        className="px-2 py-0.5 rounded hover:bg-zinc-700 text-blue-400 transition-colors flex items-center gap-1"
                                                      ><Play className="w-3 h-3" /> Run</button>
                                                    )}
                                                    <button
                                                      onClick={() => handleCreateArtifact(codeStr, lang || 'text')}
                                                      className="px-2 py-0.5 rounded hover:bg-zinc-700 text-emerald-400 transition-colors flex items-center gap-1"
                                                    ><Code2 className="w-3 h-3" /> Artifact</button>
                                                  </div>
                                                </div>
                                              )}
                                              <pre className={`bg-zinc-900 text-zinc-100 ${lang ? 'rounded-b-lg' : 'rounded-lg'} p-3 overflow-x-auto`}>
                                                <code className={className} {...props}>{children}</code>
                                              </pre>
                                              {!lang && (
                                                <button
                                                  onClick={() => handleCreateArtifact(codeStr, 'text')}
                                                  className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md"
                                                ><Code2 className="w-3 h-3" /> Artifact</button>
                                              )}
                                            </div>);
                                        }
                                        return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
                                      },
                                      img({ src, alt, ...props }) {
                                        return (
                                          <div className="my-3">
                                            <img
                                              src={src}
                                              alt={alt || "Generated image"}
                                              className="max-w-full rounded-xl border border-border shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                                              loading="lazy"
                                              onClick={() => window.open(src, "_blank")}
                                            />
                                            {alt && (
                                              <p className="text-xs text-muted-foreground mt-1.5 text-center italic">{alt}</p>
                                            )}
                                          </div>
                                        );
                                      }
                                    }}>
                                    
                                            {msg.text || "..."}
                                          </ReactMarkdown>
                                        </div> :
                                editingMsgId === msg.id ?
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    handleEditMessage(msg.id, editingMsgText);
                                  }}
                                  className="flex items-center gap-2">
                                  
                                          <input
                                    value={editingMsgText}
                                    onChange={(e) => setEditingMsgText(e.target.value)}
                                    className="flex-1 bg-transparent border-b border-primary-foreground/50 outline-none text-sm"
                                    autoFocus />
                                  
                                          <button type="submit" className="p-0.5">
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button type="button" onClick={() => setEditingMsgId(null)} className="p-0.5">
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </form> :

                                <span className="break-words [word-break:break-word] [overflow-wrap:anywhere]">
                                          {msg.text}
                                        </span>
                                }
                                    </div>);

                          })()}
                                {/* Action buttons */}
                                <div
                            className={`flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                            
                                  <button
                              onClick={() => copyToClipboard(msg.text)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Copy">
                              
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  {msg.sender === "user" &&
                            <button
                              onClick={() => {
                                setEditingMsgId(msg.id);
                                setEditingMsgText(msg.text);
                              }}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit">
                              
                                      <Pen className="w-3 h-3" />
                                    </button>
                            }
                                  {msg.sender === "bot" &&
                            <>
                                      <button
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Good response">
                                
                                        <ThumbsUp className="w-3 h-3" />
                                      </button>
                                      <button
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Bad response">
                                
                                        <ThumbsDown className="w-3 h-3" />
                                      </button>
                                      <button
                                onClick={() => handleRetry(msgIndex)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Retry">
                                
                                        <RotateCcw className="w-3 h-3" />
                                      </button>
                                    </>
                            }
                                  {msg.sender === "bot" && msg.text.length > 100 &&
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="Download as document">
                                  <Download className="w-3 h-3" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="top" align="start" className="w-40 p-1.5">
                                <button
                                  onClick={() => generatePDF(msg.text, activeChat?.title || "Document")}
                                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-accent transition-colors">
                                  📄 PDF
                                </button>
                                <button
                                  onClick={() => generateDOCX(msg.text, activeChat?.title || "Document")}
                                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-accent transition-colors">
                                  📝 Word (.docx)
                                </button>
                                <button
                                  onClick={() => generatePPTX(msg.text, activeChat?.title || "Presentation")}
                                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-accent transition-colors">
                                  📊 PowerPoint (.pptx)
                                </button>
                                <button
                                  onClick={() => generateXLSX(msg.text, activeChat?.title || "Spreadsheet")}
                                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-accent transition-colors">
                                  📈 Excel (.xlsx)
                                </button>
                              </PopoverContent>
                            </Popover>
                            }
                                </div>
                                {/* Smart Suggestions after bot messages */}
                                {msg.sender === "bot" && msg.text.length > 50 && msgIndex === activeChat!.messages.length - 1 && !isStreaming && (
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    <button
                                      onClick={() => handleSend("Explain that in simpler terms, like I'm a beginner")}
                                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors font-medium"
                                    >
                                      💡 Explain simpler
                                    </button>
                                    <button
                                      onClick={() => handleSend("Quiz me on what you just explained")}
                                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors font-medium"
                                    >
                                      🎯 Quiz me
                                    </button>
                                    <button
                                      onClick={() => handleSend("Give me exam-style questions on this topic")}
                                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors font-medium"
                                    >
                                      📝 Exam questions
                                    </button>
                                    <button
                                      onClick={() => handleSend("Summarize the key points from your last response in bullet points")}
                                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors font-medium"
                                    >
                                      📋 Summarize
                                    </button>
                                  </div>
                                )}
                                <span
                            className={`text-[10px] text-muted-foreground px-1 ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                            
                                  {formatTime(msg.timestamp)}
                                </span>
                              </div>
                            </motion.div>
                      )}
                          <AnimatePresence>
                            {isStreaming && activeChat!.messages[activeChat!.messages.length - 1]?.sender !== "bot" &&
                        <TypingIndicator />
                        }
                          </AnimatePresence>
                          <div ref={messagesEndRef} />
                        </motion.div>
                    }
                    </AnimatePresence>
                  </div>

                  {!isNewChat &&
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute bottom-4 left-0 right-0 z-20 px-4 pointer-events-none"
                  style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
                  
                      {chatInput}
                    </motion.div>
                }
                </>);

          })()
          }
        </div>

        {viewerOpen &&
        <div className="hidden md:flex w-[45%] min-w-[300px] max-w-[600px]">
            <ArtifactViewer />
          </div>
        }
        {viewerOpen &&
        <div className="flex md:hidden fixed inset-0 z-50 bg-background">
            <ArtifactViewer />
          </div>
        }
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Settings</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="account">
            <TabsList className="bg-muted w-full">
              <TabsTrigger value="account" className="flex-1">
                Account
              </TabsTrigger>
              <TabsTrigger value="general" className="flex-1">
                General
              </TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Name</Label>
                <Input value={profile?.name || ""} readOnly />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</Label>
                <Input value={profile?.email || ""} readOnly />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Program</Label>
                <Input value={profile?.program || ""} readOnly />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Admission #
                </Label>
                <Input value={profile?.admission_number || "Not set"} readOnly />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Course</Label>
                <Input value={profile?.course_name || ""} readOnly />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Year / Semester
                </Label>
                <Input value={`Year ${profile?.year || "-"} • Semester ${profile?.semester || "-"}`} readOnly />
              </div>
            </TabsContent>
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sound Notifications</p>
                  <p className="text-xs text-muted-foreground">Play sound for new messages</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Show Timestamps</p>
                  <p className="text-xs text-muted-foreground">Display time on messages</p>
                </div>
                <Switch defaultChecked />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AcademicCalendar open={calendarOpen} onClose={() => setCalendarOpen(false)} />

      <ConfirmDialog
        open={!!deleteChatId}
        onOpenChange={(open) => {
          if (!open) setDeleteChatId(null);
        }}
        title="Delete Chat?"
        description="This will permanently delete this conversation."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteChatId) deleteChat(deleteChatId);
          setDeleteChatId(null);
        }} />
      
      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Log Out?"
        description="Are you sure you want to log out?"
        confirmLabel="Log Out"
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout();
          navigate("/");
        }} />
      

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => { if (!paymentVerifying) setShowPaymentDialog(open); }}>
        <DialogContent className="backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl max-w-md">
          {paymentVerifying ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg font-semibold">Authenticating Payment...</p>
              <p className="text-sm text-muted-foreground text-center">
                Please complete the M-Pesa prompt on your phone.<br />This may take a moment.
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center">Upgrade to Premium 🎓</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground text-center">
                  You've reached your free daily limit. Upgrade to keep learning!
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-border rounded-xl p-4 text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Free Plan</p>
                    <p className="text-2xl font-bold mt-1">50K</p>
                    <p className="text-xs text-muted-foreground">tokens/day</p>
                  </div>
                  <div className="border-2 border-primary rounded-xl p-4 text-center bg-primary/5">
                    <p className="text-xs font-semibold text-primary uppercase">Premium</p>
                    <p className="text-2xl font-bold mt-1">200K</p>
                    <p className="text-xs text-muted-foreground">tokens/day</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">KES 200</p>
                  <p className="text-xs text-muted-foreground">One-time payment</p>
                </div>

                {/* Payment Method Tabs */}
                <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                  <button
                    onClick={() => setPaymentMethod("mpesa")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${paymentMethod === "mpesa" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    📱 M-Pesa
                  </button>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${paymentMethod === "card" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    💳 Card
                  </button>
                </div>

                {paymentMethod === "mpesa" ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Phone Number (M-Pesa)</Label>
                    <Input
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      className="text-center text-lg tracking-wider"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Enter your M-Pesa phone number to receive the payment prompt
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    You'll be redirected to a secure Paystack page to complete your card payment.
                  </p>
                )}

                <Button
                  onClick={handlePayment}
                  disabled={paymentLoading || (paymentMethod === "mpesa" && !paymentPhone.trim())}
                  className="w-full text-white font-semibold py-3"
                  style={{ backgroundColor: "#800000" }}
                >
                  {paymentLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                  ) : paymentMethod === "mpesa" ? (
                    "Pay KES 200 via M-Pesa"
                  ) : (
                    "Pay KES 200 via Card"
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>);

};

export default ChatPage;