import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, type ProcessedFile } from "@/contexts/ChatContext";
import { useArtifacts, detectArtifactType } from "@/contexts/ArtifactContext";
import { useTeachMeSession } from "@/hooks/useTeachMeSession";
import { parseControlTags, stripControlTags } from "@/lib/teachMePrompt";
import { generateDocument, type DocType } from "@/utils/documentGenerator";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import { MermaidBlock } from "@/components/MermaidBlock";
import rehypeKatex from "rehype-katex";
import { generatePDF, generateDOCX, generatePPTX, generateXLSX } from "@/utils/documentGenerator";
import sekaniLogo from "@/assets/sekani-logo.png";
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
  Play,
  Upload,
  MoreVertical,
  ChevronRight,
  GraduationCap,
  ClipboardList,
} from "lucide-react";
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
import { TeachMePanel } from "@/components/TeachMePanel";
import { getTimeBasedGreeting } from "@/utils/greetings";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: ListChecks, label: "Assignments", prompt: "What assignments do I have pending this week?" },
  { icon: Calendar, label: "Schedule", prompt: "Show me my class schedule for this week" },
  { icon: Search, label: "Notes", prompt: "Help me find lecture notes for my current units" },
  { icon: PenLine, label: "Exams", prompt: "Help me prepare for my upcoming exams with study tips" },
];

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

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex justify-start"
  >
    <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-2">Sekani is thinking...</span>
      </div>
    </div>
  </motion.div>
);

const VoiceInputVisualizer = () => (
  <div className="flex h-8 items-end gap-1" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => (
      <motion.div
        key={i}
        className="w-1.5 rounded-full bg-primary"
        animate={{ height: [10, 24 - i * 2, 14 + (i % 2) * 8, 20 - (i % 3) * 3, 10] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }}
      />
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ChatPage = () => {
  const { user, profile, role, logout, isAuthenticated, isLoading: authLoading, refreshProfile } = useAuth();
  const {
    chats,
    activeChat,
    isStreaming,
    createChat,
    setActiveChat,
    sendMessage,
    deleteChat,
    deleteAllChats,
    renameChat,
    loadChats,
  } = useChat();
  const { viewerOpen, addArtifact, createFromCodeBlock } = useArtifacts();
  const { nickname, getChatBg } = usePersonalization();
  const teachMe = useTeachMeSession();
  const [teachMeActive, setTeachMeActive] = useState(false);
  const navigate = useNavigate();

  // UI state
  const [input, setInput] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileUnitsOpen, setMobileUnitsOpen] = useState(false); // right panel on mobile
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<ProcessedFile[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState("");
  const [showVoicePreview, setShowVoicePreview] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const paymentCancelledRef = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "card">("mpesa");
  const [paymentPlan, setPaymentPlan] = useState<"individual" | "group">("individual");
  const [groupEmails, setGroupEmails] = useState<string[]>(["", "", "", "", ""]);
  const [unitUploading, setUnitUploading] = useState(false);
  const [unitUploadProgress, setUnitUploadProgress] = useState<Record<string, string>>({});
  const [pastPaperUploading, setPastPaperUploading] = useState(false);
  const [pastPaperUploadProgress, setPastPaperUploadProgress] = useState<Record<string, string>>({});
  const [pastPaperCount, setPastPaperCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [enrolledUnits, setEnrolledUnits] = useState<EnrolledUnit[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null); // for right panel accordion

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pastPaperInputRef = useRef<HTMLInputElement>(null);
  const unitUploadInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const micSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) loadChats();
  }, [isAuthenticated, loadChats]);

  useEffect(() => {
    if (!user) return;
    const loadUnits = async () => {
      const { data } = await supabase
        .from("student_units")
        .select("unit_id, units(code, name, lecturer)")
        .eq("user_id", user.id);
      if (data) {
        setEnrolledUnits(
          data.map((su: any) => ({
            unit_id: su.unit_id,
            unit_code: su.units?.code || "",
            unit_name: su.units?.name || "",
            lecturer: su.units?.lecturer || null,
          })),
        );
      }
    };
    loadUnits();
  }, [user]);

  useEffect(() => {
    if (!selectedUnitId) {
      setPastPaperCount(0);
      setNotesCount(0);
      return;
    }
    const loadCounts = async () => {
      const [ppRes, notesRes] = await Promise.all([
        supabase
          .from("materials")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", selectedUnitId)
          .eq("document_type", "past_paper"),
        supabase
          .from("materials")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", selectedUnitId)
          .eq("document_type", "notes"),
      ]);
      setPastPaperCount(ppRes.count || 0);
      setNotesCount(notesRes.count || 0);
    };
    loadCounts();
  }, [selectedUnitId]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      setShowScrollButton(!atBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeChat?.id]);

  useEffect(() => {
    const handler = () => setShowPaymentDialog(true);
    window.addEventListener("show-payment-prompt", handler);
    return () => window.removeEventListener("show-payment-prompt", handler);
  }, []);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      toast.success("Payment successful! 🎉 Welcome to Sekani Premium!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (payment === "failed") {
      toast.error("Payment was not completed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isStreaming]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileMenuOpen]);

  // Parse Teach Me control tags
  useEffect(() => {
    if (!teachMeActive || !activeChat || isStreaming) return;
    const msgs = activeChat.messages;
    const lastMsg = msgs[msgs.length - 1];
    if (!lastMsg || lastMsg.sender !== "bot") return;
    const tags = parseControlTags(lastMsg.text);
    if (tags.topicOutline && !teachMe.session) {
      const outline = tags.topicOutline.map((t: any, i: number) => ({
        ...t,
        status: i === 0 ? "active" : "locked",
      }));
      const unitName = selectedUnit?.unit_name || activeChat.title || "Unit";
      teachMe.createSession(activeChat.id, unitName, outline);
    }
    if (teachMe.session) {
      if (tags.topicDone !== null) teachMe.updateTopicProgress(teachMe.session.id, tags.topicDone, "done");
      if (tags.eli5Triggered !== null)
        teachMe.updateTopicProgress(teachMe.session.id, tags.eli5Triggered, "active", true);
      if (tags.checkpoint) {
        teachMe.addCheckpointScore(teachMe.session.id, {
          afterTopic: tags.checkpoint.afterTopic,
          score: tags.checkpoint.score,
          total: tags.checkpoint.total,
          passed: tags.checkpoint.score >= 3,
        });
      }
      if (tags.unitComplete) {
        teachMe.markComplete(teachMe.session.id);
        toast.success("🎓 Unit complete! Amazing work!");
      }
    }
  }, [activeChat?.messages, isStreaming, teachMeActive]);

  useEffect(() => {
    if (renamingChatId) renameInputRef.current?.focus();
  }, [renamingChatId]);

  useEffect(() => {
    if (!activeChat) return;
    const restoreTeachMe = async () => {
      const existing = await teachMe.loadSession(activeChat.id);
      if (existing && existing.status === "active") {
        setTeachMeActive(true);
        if (existing.focusMode) document.body.classList.add("focus-mode");
      } else {
        if (teachMeActive && !teachMe.session) {
          setTeachMeActive(false);
          document.body.classList.remove("focus-mode");
        }
      }
    };
    restoreTeachMe();
  }, [activeChat?.id]);

  // Touch swipe gestures — left sidebar (from left edge) + right panel (from right edge)
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
      const screenW = window.innerWidth;
      touchStartRef.current = null;
      if (Math.abs(dx) < 50 || dy > 100) return;
      // Left sidebar: swipe right from left edge
      if (dx > 0 && startX < 30 && !mobileSidebarOpen) setMobileSidebarOpen(true);
      else if (dx < 0 && mobileSidebarOpen) setMobileSidebarOpen(false);
      // Right units panel: swipe left from right edge
      else if (dx < 0 && startX > screenW - 30 && !mobileUnitsOpen) setMobileUnitsOpen(true);
      else if (dx > 0 && mobileUnitsOpen) setMobileUnitsOpen(false);
    },
    [mobileSidebarOpen, mobileUnitsOpen],
  );

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

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
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.type.includes("spreadsheetml"))
      return "spreadsheet";
    if (
      file.type === "text/plain" ||
      file.type === "text/csv" ||
      file.type === "text/markdown" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".md")
    )
      return "text";
    return "file";
  };

  const processAttachedFile = async (file: File): Promise<ProcessedFile> => {
    const processed: ProcessedFile = { file, name: file.name, type: getCategory(file), size: humanSize(file.size) };
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
        processed.text = `[Word document: ${file.name}]`;
      }
      return processed;
    }
    if (file.type === "application/pdf") {
      const { base64 } = await toBase64(file);
      processed.base64 = base64;
      processed.mediaType = "application/pdf";
      processed.text = `[PDF document: ${file.name} (${humanSize(file.size)}). For best results, copy and paste text directly.]`;
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

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const displayName = nickname || profile?.name || user?.email?.split("@")[0] || "Student";
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // ─── Send ────────────────────────────────────────────────────────────────────

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if ((!text && attachedFiles.length === 0) || isStreaming) return;
    let chat = activeChat;
    if (!chat) {
      chat = selectedUnitId ? await createChat("unit", selectedUnitId) : await createChat("general");
      if (!chat) return;
    }
    const filesToSend = attachedFiles.length > 0 ? attachedFiles : undefined;
    setInput("");
    setAttachedFiles([]);
    inputRef.current?.focus();
    await sendMessage(text, chat.id, filesToSend, teachMeActive);
  };

  const handleSuggestion = async (prompt: string) => {
    let chat = activeChat;
    if (!chat) {
      chat = selectedUnitId ? await createChat("unit", selectedUnitId) : await createChat("general");
      if (!chat) return;
    }
    await sendMessage(prompt, chat.id);
  };

  // ─── Unit selection (from right panel) ───────────────────────────────────────

  const handleSelectUnit = async (unitId: string) => {
    setSelectedUnitId(unitId);
    setExpandedUnitId(unitId);
    setShowArtifacts(false);
    // Create or switch to a unit chat
    const existingUnitChat = chats.find((c) => c.chat_type === "unit" && c.unit_id === unitId);
    if (existingUnitChat) {
      setActiveChat(existingUnitChat.id);
    } else {
      await createChat("unit", unitId);
    }
    if (isMobile) setMobileUnitsOpen(false);
  };

  // ─── Upload handlers ──────────────────────────────────────────────────────────

  const handleUnitTrainUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedUnitId || !user) return;
    const selectedUnitData = enrolledUnits.find((u) => u.unit_id === selectedUnitId);
    if (!selectedUnitData) return;
    setUnitUploading(true);
    const progress: Record<string, string> = {};
    for (const file of Array.from(files)) {
      const key = `${selectedUnitId}_${file.name}`;
      progress[key] = "Uploading...";
      setUnitUploadProgress({ ...progress });
      try {
        const storagePath = `uploads/${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("materials").upload(storagePath, file);
        if (uploadError) {
          progress[key] = `❌ ${uploadError.message}`;
          setUnitUploadProgress({ ...progress });
          continue;
        }
        const { data: material, error: matError } = await supabase
          .from("materials")
          .insert({
            title: file.name.replace(/\.[^.]+$/, ""),
            file_name: file.name,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
            unit_id: selectedUnitId,
            uploaded_by: user.id,
            storage_path: storagePath,
            embedding_status: "processing",
          })
          .select("id")
          .single();
        if (matError) {
          progress[key] = `❌ ${matError.message}`;
          setUnitUploadProgress({ ...progress });
          continue;
        }
        progress[key] = "🧠 Training AI...";
        setUnitUploadProgress({ ...progress });
        const { error: embedError } = await supabase.functions.invoke("process-document", {
          body: {
            materialId: material?.id,
            title: file.name,
            unitCode: selectedUnitData.unit_code,
            storagePath,
            fileType: file.type,
          },
        });
        if (embedError) {
          progress[key] = `❌ ${embedError.message}`;
          setUnitUploadProgress({ ...progress });
          continue;
        }
        progress[key] = "✅ Trained";
        setUnitUploadProgress({ ...progress });
      } catch (err) {
        progress[key] = `❌ ${err instanceof Error ? err.message : "Unknown"}`;
        setUnitUploadProgress({ ...progress });
      }
    }
    setUnitUploading(false);
    setUnitUploadProgress({});
    if (selectedUnitId) {
      const { count } = await supabase
        .from("materials")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", selectedUnitId)
        .eq("document_type", "notes");
      setNotesCount(count || 0);
    }
    toast.success("Training complete! Your AI is now smarter. 🧠");
  };

  const handlePastPaperUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedUnitId || !user) return;
    const selectedUnitData = enrolledUnits.find((u) => u.unit_id === selectedUnitId);
    if (!selectedUnitData) return;
    setPastPaperUploading(true);
    const progress: Record<string, string> = {};
    for (const file of Array.from(files)) {
      const key = `pp_${selectedUnitId}_${file.name}`;
      progress[key] = "Uploading...";
      setPastPaperUploadProgress({ ...progress });
      try {
        const storagePath = `uploads/${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("materials").upload(storagePath, file);
        if (uploadError) {
          progress[key] = `❌ ${uploadError.message}`;
          setPastPaperUploadProgress({ ...progress });
          continue;
        }
        const { data: material, error: matError } = await supabase
          .from("materials")
          .insert({
            title: file.name.replace(/\.[^.]+$/, ""),
            file_name: file.name,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
            unit_id: selectedUnitId,
            uploaded_by: user.id,
            storage_path: storagePath,
            embedding_status: "processing",
            document_type: "past_paper",
          } as any)
          .select("id")
          .single();
        if (matError) {
          progress[key] = `❌ ${matError.message}`;
          setPastPaperUploadProgress({ ...progress });
          continue;
        }
        progress[key] = "🧠 Analyzing...";
        setPastPaperUploadProgress({ ...progress });
        const { error: embedError } = await supabase.functions.invoke("process-document", {
          body: {
            materialId: material?.id,
            title: file.name,
            unitCode: selectedUnitData.unit_code,
            storagePath,
            fileType: file.type,
            documentType: "past_paper",
            skipHashCheck: true,
          },
        });
        if (embedError) {
          progress[key] = `❌ ${embedError.message}`;
          setPastPaperUploadProgress({ ...progress });
          continue;
        }
        progress[key] = "✅ Analyzed";
        setPastPaperUploadProgress({ ...progress });
      } catch (err) {
        progress[key] = `❌ ${err instanceof Error ? err.message : "Unknown"}`;
        setPastPaperUploadProgress({ ...progress });
      }
    }
    setPastPaperUploading(false);
    setPastPaperUploadProgress({});
    const { count } = await supabase
      .from("materials")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", selectedUnitId)
      .eq("document_type", "past_paper");
    setPastPaperCount(count || 0);
    toast.success("Past papers analyzed! Exam Mode is ready. 📝");
  };

  // ─── Voice ────────────────────────────────────────────────────────────────────

  const applyVoiceDraft = () => {
    const transcript = voiceDraft.trim();
    if (!transcript) return;
    setInput((prev) => (prev.trim() ? `${prev.trimEnd()} ${transcript}` : transcript));
    setVoiceDraft("");
    setShowVoicePreview(false);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
      el.focus();
    });
  };

  const discardVoiceDraft = () => {
    setVoiceDraft("");
    setShowVoicePreview(false);
    inputRef.current?.focus();
  };

  const toggleVoice = async () => {
    if (!micSupported) return;
    if (isListening) {
      mediaRecorderRef.current?.stop();
      return;
    }
    setVoiceDraft("");
    setShowVoicePreview(false);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsListening(false);
        mediaRecorderRef.current = null;
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 1000) {
          toast.error("Recording too short. Try again.");
          return;
        }
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe`, {
            method: "POST",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: formData,
          });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "Transcription failed");
          }
          const result = await resp.json();
          const transcript = result.text?.trim();
          if (transcript) {
            setVoiceDraft(transcript);
            setShowVoicePreview(true);
          } else toast.error("No speech detected. Try again.");
        } catch (err: any) {
          toast.error(err.message || "Transcription failed.");
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorder.start(250);
      setIsListening(true);
    } catch {
      toast.error("Microphone access denied.");
    }
  };

  // ─── Payment ──────────────────────────────────────────────────────────────────

  const cancelPaymentPolling = () => {
    paymentCancelledRef.current = true;
    setPaymentVerifying(false);
    setShowPaymentDialog(false);
    toast.info("Payment cancelled.");
  };

  const pollPaymentStatus = async (reference: string) => {
    paymentCancelledRef.current = false;
    setPaymentVerifying(true);
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      if (paymentCancelledRef.current) return;
      await new Promise((r) => setTimeout(r, 5000));
      if (paymentCancelledRef.current) return;
      const { data } = await supabase.from("payments").select("status").eq("paystack_reference", reference).single();
      if (data?.status === "success") {
        setPaymentVerifying(false);
        setShowPaymentDialog(false);
        toast.success("Payment successful! 🎉 Welcome to Sekani Premium!");
        await refreshProfile();
        return;
      } else if (data?.status === "failed") {
        setPaymentVerifying(false);
        toast.error("Payment failed.");
        return;
      }
    }
    setPaymentVerifying(false);
    toast.error("Payment verification timed out.");
  };

  const handlePayment = async () => {
    if (paymentMethod === "card") {
      setPaymentLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          toast.error("Please sign in again.");
          return;
        }
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-initialize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            method: "card",
            plan: paymentPlan,
            groupEmails: paymentPlan === "group" ? [profile?.email || "", ...groupEmails.slice(1)] : undefined,
          }),
        });
        const data = await resp.json();
        if (data.authorization_url && data.reference) {
          window.open(data.authorization_url, "_blank");
          setPaymentLoading(false);
          toast.info("Complete payment in the new tab.");
          pollPaymentStatus(data.reference);
        } else {
          toast.error(data.error || "Failed to initialize card payment");
          setPaymentLoading(false);
        }
      } catch {
        toast.error("Payment initialization failed.");
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
      if (!accessToken) {
        toast.error("Please sign in again.");
        return;
      }
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          phone,
          plan: paymentPlan,
          groupEmails: paymentPlan === "group" ? [profile?.email || "", ...groupEmails.slice(1)] : undefined,
        }),
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

  const handleCreateArtifact = (content: string, language: string) => {
    const type = detectArtifactType(language, content);
    addArtifact({ title: `${language.toUpperCase() || "CODE"} Snippet`, content, language, type });
  };

  const handleRetry = async (msgIndex: number) => {
    if (!activeChat || isStreaming) return;
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
    await sendMessage(newText.trim(), activeChat.id);
  };

  const handleRenameSubmit = async (chatId: string) => {
    if (renameValue.trim()) await renameChat(chatId, renameValue);
    setRenamingChatId(null);
  };

  // ─── Derived state ────────────────────────────────────────────────────────────

  const selectedUnit = enrolledUnits.find((u) => u.unit_id === selectedUnitId);

  // Only general chats in left sidebar
  const generalChats = useMemo(() => chats.filter((c) => c.chat_type !== "unit"), [chats]);

  const groupedChats = useMemo(() => {
    const groups: Record<string, typeof generalChats> = {};
    for (const chat of generalChats) {
      const group = getDateGroup(chat.timestamp);
      if (!groups[group]) groups[group] = [];
      groups[group].push(chat);
    }
    return groups;
  }, [generalChats]);

  const chatBgStyle = (() => {
    const bg = getChatBg();
    if (bg && bg.url)
      return {
        backgroundImage: `url(${bg.url})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
      };
    return {};
  })();

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const toggleSidebar = () => {
    if (isMobile) setMobileSidebarOpen(!mobileSidebarOpen);
    else setSidebarExpanded(!sidebarExpanded);
  };

  // ─── Chat item renderer ───────────────────────────────────────────────────────

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
        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${activeChat?.id === chat.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40"}`}
      >
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRenameSubmit(chat.id);
              }}
              className="flex items-center gap-1"
            >
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(chat.id)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setRenamingChatId(null);
                }}
                className="bg-transparent border-b border-primary text-sm w-full outline-none py-0.5"
                onClick={(e) => e.stopPropagation()}
              />
              <button type="submit" onClick={(e) => e.stopPropagation()} className="p-0.5 text-primary">
                <Check className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <>
              <span className="truncate block">{chat.title}</span>
              <span className="text-xs text-sidebar-foreground/30 block mt-0.5 truncate">{preview}</span>
            </>
          )}
        </div>
        {!isRenaming && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1 hover:bg-sidebar-accent rounded"
                title="Options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-36 p-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingChatId(chat.id);
                  setRenameValue(chat.title);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteChatId(chat.id);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  };

  // ─── LEFT SIDEBAR content (general chats + artifacts only) ───────────────────

  const sidebarContent = (
    <>
      {/* Logo + Toggle */}
      <div className={`p-4 ${!sidebarExpanded && !isMobile ? "px-1.5 py-3" : ""}`}>
        {sidebarExpanded || isMobile ? (
          <div className="flex items-center gap-3 mb-4">
            <img src={sekaniLogo} alt="Sekani" className="w-8 h-8" />
            <span className="font-display font-bold text-sidebar-foreground text-lg">Sekani</span>
            <button
              onClick={toggleSidebar}
              className="ml-auto p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              title="Collapse sidebar"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 mb-3">
            <img src={sekaniLogo} alt="Sekani" className="w-9 h-9" />
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              title="Expand sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* New Chat */}
        {sidebarExpanded || isMobile ? (
          <Button
            onClick={() => {
              createChat("general");
              setSelectedUnitId(null);
              setShowArtifacts(false);
              if (isMobile) setMobileSidebarOpen(false);
            }}
            className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 justify-start gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" /> New Chat
          </Button>
        ) : (
          <Button
            onClick={() => createChat("general")}
            className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 p-0 flex items-center justify-center"
            size="icon"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Artifacts link */}
      {(sidebarExpanded || isMobile) && (
        <div className="px-3 mb-1">
          <button
            onClick={() => {
              setShowArtifacts(true);
              if (isMobile) setMobileSidebarOpen(false);
            }}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${showArtifacts ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40"}`}
          >
            <LayoutGrid className="w-4 h-4" /> <span>Artifacts</span>
          </button>
        </div>
      )}
      {!sidebarExpanded && !isMobile && (
        <div className="flex flex-col items-center px-1 mb-2">
          <button
            onClick={() => setShowArtifacts(true)}
            className="p-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/40 transition-colors"
            title="Artifacts"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Chat history — general only */}
      <div className="flex-1 overflow-y-auto sidebar-scroll-area px-3 py-2">
        {sidebarExpanded || isMobile ? (
          generalChats.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-sidebar-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-sidebar-foreground/30">No chats yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 mb-1">
                <p className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/40">
                  Chat History
                </p>
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="text-xs text-destructive/70 hover:text-destructive transition-colors"
                >
                  Delete All
                </button>
              </div>
              {DATE_GROUP_ORDER.map((group) => {
                const groupChats = groupedChats[group];
                if (!groupChats || groupChats.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/40 px-1 mb-1.5">
                      {group}
                    </p>
                    <div className="space-y-0.5">{groupChats.map(renderChatItem)}</div>
                  </div>
                );
              })}
            </div>
          )
        ) : null}
      </div>

      {/* Bottom: Profile */}
      <div ref={profileMenuRef} className={`relative ${!sidebarExpanded && !isMobile ? "px-1.5 py-3" : "p-3"}`}>
        <AnimatePresence>
          {profileMenuOpen && (sidebarExpanded || isMobile) && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-3 right-3 mb-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50"
            >
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
                {role === "admin" && (
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("/admin");
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors"
                  >
                    <Shield className="w-4 h-4 text-muted-foreground" /> <span>Admin Dashboard</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate("/personalization");
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors"
                >
                  <User className="w-4 h-4 text-muted-foreground" /> <span>Personalization</span>
                </button>
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" /> <span>Settings</span>
                </button>
                <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors">
                  <CircleHelp className="w-4 h-4 text-muted-foreground" /> <span>Help</span>
                </button>
                <div className="mx-3 my-2 border-t border-border" />
                <div className="px-2 pb-1">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setShowPaymentDialog(true);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #800000 0%, #b91c1c 100%)", color: "white" }}
                  >
                    <span>⚡ Upgrade to Premium</span>
                  </button>
                </div>
                <div className="my-1.5" />
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors"
                >
                  <LogOut className="w-4 h-4 text-muted-foreground" /> <span>Log out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {sidebarExpanded || isMobile ? (
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-accent/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold text-sidebar-accent-foreground flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.course_name || "Student"}</p>
            </div>
            <ChevronUp
              className={`w-4 h-4 text-sidebar-foreground/40 transition-transform ${profileMenuOpen ? "" : "rotate-180"}`}
            />
          </button>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold text-sidebar-accent-foreground"
              title={displayName}
            >
              {displayName.charAt(0).toUpperCase()}
            </button>
          </div>
        )}
      </div>
    </>
  );

  // ─── RIGHT PANEL content (units + actions) ────────────────────────────────────

  const unitsPanelContent = (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-foreground text-sm">My Units</h2>
          </div>
          {isMobile && (
            <button
              onClick={() => setMobileUnitsOpen(false)}
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Select a unit to start studying</p>
      </div>

      {/* Hidden file inputs (shared across units) */}
      <input
        ref={unitUploadInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.pptx,.txt,.csv,.md"
        className="hidden"
        onChange={(e) => {
          handleUnitTrainUpload(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={pastPaperInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.pptx,.txt"
        className="hidden"
        onChange={(e) => {
          handlePastPaperUpload(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Units list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {enrolledUnits.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No units enrolled</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your course units will appear here</p>
          </div>
        ) : (
          enrolledUnits.map((unit) => {
            const isExpanded = expandedUnitId === unit.unit_id;
            const isSelected = selectedUnitId === unit.unit_id;
            return (
              <div
                key={unit.unit_id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${isExpanded ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:border-border/80"}`}
              >
                {/* Unit header row */}
                <button
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedUnitId(null);
                    } else {
                      handleSelectUnit(unit.unit_id);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${isExpanded ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {unit.unit_code.slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${isExpanded ? "text-primary" : "text-muted-foreground"}`}>
                      {unit.unit_code}
                    </p>
                    <p className="text-sm font-medium text-foreground truncate leading-tight">{unit.unit_name}</p>
                    {unit.lecturer && <p className="text-xs text-muted-foreground truncate">{unit.lecturer}</p>}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Expanded unit panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-2 border-t border-primary/20">
                        {/* Stats row */}
                        <div className="flex gap-2 pt-2">
                          <div className="flex-1 bg-background rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-foreground">{notesCount}</p>
                            <p className="text-[10px] text-muted-foreground">Notes</p>
                          </div>
                          <div className="flex-1 bg-background rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-foreground">{pastPaperCount}</p>
                            <p className="text-[10px] text-muted-foreground">Papers</p>
                          </div>
                        </div>

                        {/* Upload buttons */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-dashed h-8"
                            disabled={unitUploading}
                            onClick={() => unitUploadInputRef.current?.click()}
                          >
                            {unitUploading ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <Upload className="w-3 h-3 mr-1" />
                            )}
                            {unitUploading ? "Training..." : "Add Notes"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-dashed h-8"
                            disabled={pastPaperUploading}
                            onClick={() => pastPaperInputRef.current?.click()}
                          >
                            {pastPaperUploading ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <FileQuestion className="w-3 h-3 mr-1" />
                            )}
                            {pastPaperUploading ? "Analyzing..." : "Past Papers"}
                          </Button>
                        </div>

                        {/* Upload progress */}
                        {Object.entries(unitUploadProgress).length > 0 && (
                          <div className="space-y-0.5">
                            {Object.entries(unitUploadProgress).map(([key, status]) => (
                              <p key={key} className="text-xs text-muted-foreground truncate">
                                {status}
                              </p>
                            ))}
                          </div>
                        )}
                        {Object.entries(pastPaperUploadProgress).length > 0 && (
                          <div className="space-y-0.5">
                            {Object.entries(pastPaperUploadProgress).map(([key, status]) => (
                              <p key={key} className="text-xs text-muted-foreground truncate">
                                {status}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="space-y-1 pt-1">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-0.5">
                            Quick Actions
                          </p>

                          {[
                            {
                              icon: BookOpen,
                              label: "Teach Me",
                              color: "text-emerald-600",
                              onClick: async () => {
                                if (notesCount === 0) {
                                  toast.error("Upload course notes first.");
                                  return;
                                }
                                setTeachMeActive(true);
                                let chat = activeChat;
                                if (!chat) chat = await createChat("unit", unit.unit_id);
                                if (chat)
                                  await sendMessage(
                                    `Start Teach Me Mode for the unit: ${unit.unit_name}. Give me a topic outline and begin teaching.`,
                                    chat.id,
                                    undefined,
                                    true,
                                  );
                                if (isMobile) setMobileUnitsOpen(false);
                              },
                            },
                            {
                              icon: PenLine,
                              label: "Exam Prep",
                              color: "text-blue-600",
                              onClick: async () => {
                                if (notesCount === 0) {
                                  toast.error("Upload course notes first.");
                                  return;
                                }
                                await handleSuggestion(
                                  `Help me prepare for my ${unit.unit_code} exam. Give me the key topics, likely exam questions, and a revision summary based on the uploaded notes.`,
                                );
                                if (isMobile) setMobileUnitsOpen(false);
                              },
                            },
                            ...(pastPaperCount > 0
                              ? [
                                  {
                                    icon: FileQuestion,
                                    label: "Exam Mode",
                                    color: "text-amber-600",
                                    onClick: async () => {
                                      await handleSuggestion(
                                        `[EXAM_MODE] Analyze ALL past papers uploaded for ${unit.unit_code} — ${unit.unit_name}. Cross-reference with course notes to identify: 1) Most frequently tested topics, 2) Common question patterns, 3) Key areas to focus on. Then give me a targeted revision plan.`,
                                      );
                                      if (isMobile) setMobileUnitsOpen(false);
                                    },
                                  },
                                ]
                              : []),
                            {
                              icon: ListChecks,
                              label: "Quiz Me",
                              color: "text-purple-600",
                              onClick: async () => {
                                if (notesCount === 0) {
                                  toast.error("Upload course notes first.");
                                  return;
                                }
                                await handleSuggestion(
                                  `Quiz me on ${unit.unit_code} — ${unit.unit_name}. Start with an easy question from the uploaded notes and wait for my answer.`,
                                );
                                if (isMobile) setMobileUnitsOpen(false);
                              },
                            },
                            {
                              icon: FileText,
                              label: "Summarize",
                              color: "text-rose-600",
                              onClick: async () => {
                                if (notesCount === 0) {
                                  toast.error("Upload course notes first.");
                                  return;
                                }
                                await handleSuggestion(
                                  `Give me a complete summary of all the uploaded notes for ${unit.unit_code} — ${unit.unit_name}. Organize by topic.`,
                                );
                                if (isMobile) setMobileUnitsOpen(false);
                              },
                            },
                          ].map((action) => (
                            <button
                              key={action.label}
                              onClick={action.onClick}
                              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm hover:bg-background transition-colors text-left"
                            >
                              <action.icon className={`w-4 h-4 flex-shrink-0 ${action.color}`} />
                              <span className="font-medium text-foreground">{action.label}</span>
                              <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // ─── Chat input ───────────────────────────────────────────────────────────────

  const chatInput = (
    <div className="max-w-[680px] w-full mx-auto pointer-events-auto">
      {(isListening || isTranscribing) && (
        <div className="mb-2 rounded-3xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {isTranscribing ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <VoiceInputVisualizer />}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{isTranscribing ? "Transcribing…" : "Listening…"}</p>
                <p className="text-xs text-muted-foreground">
                  {isTranscribing ? "Converting speech to text." : "Speak freely — tap Stop when done."}
                </p>
              </div>
            </div>
            {isListening && (
              <button
                onClick={toggleVoice}
                className="rounded-full border border-primary/20 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      )}

      {showVoicePreview && !isListening && voiceDraft && (
        <div className="mb-2 rounded-3xl border border-border bg-card px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Voice preview</p>
              <p className="mt-1 text-sm text-foreground break-words">{voiceDraft}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={discardVoiceDraft}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Discard"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={applyVoiceDraft}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
                title="Use transcript"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachedFiles.map((pf, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-xs bg-card border border-border px-2 py-1 rounded-lg"
            >
              {pf.preview ? (
                <img src={pf.preview} alt="" className="w-6 h-6 rounded object-cover" />
              ) : pf.file.type.startsWith("image/") ? (
                <ImageIcon className="w-3 h-3" />
              ) : (
                <File className="w-3 h-3" />
              )}
              <span className="max-w-[120px] truncate">{pf.file.name}</span>
              <button
                onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div
        className="flex items-end gap-1 rounded-[24px] px-2 py-1.5 bg-[hsl(var(--chat-input-bg))] border border-solid border-inherit"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}
      >
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFileSelected(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFileSelected(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.pptx,.ppt,.md"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFileSelected(e.target.files);
            e.target.value = "";
          }}
        />

        <Popover>
          <PopoverTrigger asChild>
            <button className="flex w-9 h-9 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0">
              <Paperclip className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-52 p-1.5">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
            >
              <Camera className="w-4 h-4 text-muted-foreground" /> Take Photo
            </button>
            <button
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-muted-foreground" /> Upload Image
            </button>
            <button
              onClick={() => docInputRef.current?.click()}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
            >
              <FileText className="w-4 h-4 text-muted-foreground" /> Upload File
            </button>
            <button
              onClick={() =>
                handleSuggestion(
                  "Enter Quiz Mode: Generate exam-style questions for my current unit to help me revise. Ask one question at a time, evaluate my answer, and explain the correct answer step by step.",
                )
              }
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
            >
              <FileQuestion className="w-4 h-4 text-muted-foreground" /> Quizzes
            </button>
          </PopoverContent>
        </Popover>

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
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
          placeholder={selectedUnit ? `Ask about ${selectedUnit.unit_code}...` : "Ask Sekani anything..."}
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground py-2 px-2 min-w-0 resize-none overflow-y-auto"
          style={{ maxHeight: "150px" }}
          rows={1}
          disabled={isStreaming}
        />

        <button
          onClick={toggleVoice}
          disabled={!micSupported || isTranscribing}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${isListening ? "text-primary bg-primary/20 mic-pulse-ring" : isTranscribing ? "text-primary animate-pulse" : "text-muted-foreground hover:text-primary hover:bg-primary/10"} ${!micSupported ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={() => handleSend()}
          disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex-shrink-0 disabled:opacity-40"
        >
          {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside
        className={`hidden md:flex flex-col bg-sidebar flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarExpanded ? "w-[260px]" : "w-[56px]"}`}
      >
        {sidebarContent}
      </aside>

      {/* ── LEFT SIDEBAR (mobile overlay) ── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 w-[280px] z-50 bg-sidebar flex flex-col md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CENTER ── */}
      <div className="flex-1 flex min-w-0">
        <div
          className={`flex-1 flex flex-col min-w-0 relative ${viewerOpen ? "hidden md:flex" : ""}`}
          style={chatBgStyle}
        >
          {/* ── HEADER ── */}
          <header className="h-14 flex items-center px-4 flex-shrink-0 z-10 bg-transparent gap-2">
            {/* Mobile: left sidebar toggle */}
            <button onClick={toggleSidebar} className="p-2 hover:bg-foreground/10 rounded-lg md:hidden flex-shrink-0">
              <PanelLeft className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="flex-1 min-w-0">
              {selectedUnit ? (
                <div>
                  <h2 className="font-display font-semibold text-foreground text-sm truncate leading-tight">
                    {selectedUnit.unit_code} — {selectedUnit.unit_name}
                  </h2>
                </div>
              ) : showArtifacts ? (
                <h2 className="font-display font-semibold text-foreground text-sm">Artifacts</h2>
              ) : (
                <h2 className="font-display font-semibold text-foreground text-sm">
                  {activeChat ? activeChat.title : "Sekani"}
                </h2>
              )}
            </div>

            {/* Teach Me — only when unit selected */}
            {selectedUnit && (
              <button
                onClick={async () => {
                  if (teachMeActive) {
                    teachMe.endSession();
                    setTeachMeActive(false);
                    document.body.classList.remove("focus-mode");
                    return;
                  }
                  if (notesCount === 0) {
                    toast.error("Upload course notes for this unit first.");
                    return;
                  }
                  setTeachMeActive(true);
                  if (activeChat) {
                    const existing = await teachMe.loadSession(activeChat.id);
                    if (existing) return;
                  }
                  let chat = activeChat;
                  if (!chat) chat = await createChat("unit", selectedUnitId!);
                  if (chat)
                    await sendMessage(
                      `Start Teach Me Mode for the unit: ${selectedUnit.unit_name}. Give me a topic outline and begin teaching.`,
                      chat.id,
                      undefined,
                      true,
                    );
                }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all flex-shrink-0 ${teachMeActive ? "bg-emerald-600 text-white border-emerald-600" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                <BookOpen className="w-3 h-3" />
                <span className="hidden sm:inline">{teachMeActive ? "Teaching..." : "Teach Me"}</span>
              </button>
            )}

            {/* Exam button (replaces Calendar) — only when unit selected */}
            {selectedUnit ? (
              <button
                onClick={() => {
                  if (pastPaperCount === 0) {
                    toast.info("Upload past papers first to unlock Exam Mode.");
                    return;
                  }
                  handleSuggestion(
                    `[EXAM_MODE] Analyze ALL past papers uploaded for ${selectedUnit.unit_code} — ${selectedUnit.unit_name}. Cross-reference with course notes to identify: 1) Most frequently tested topics, 2) Common question patterns, 3) Key areas to focus on. Then give me a targeted revision plan.`,
                  );
                }}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${pastPaperCount > 0 ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" : "text-muted-foreground hover:bg-foreground/10"}`}
                title={pastPaperCount > 0 ? "Exam Mode" : "Upload past papers to unlock Exam Mode"}
              >
                <ClipboardList className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setCalendarOpen(!calendarOpen)}
                className="p-2 hover:bg-foreground/10 rounded-lg text-foreground flex-shrink-0"
                title="Academic Calendar"
              >
                <Calendar className="w-5 h-5" />
              </button>
            )}

            {/* Mobile: right units panel toggle */}
            <button
              onClick={() => setMobileUnitsOpen(true)}
              className="p-2 hover:bg-foreground/10 rounded-lg md:hidden flex-shrink-0"
              title="My Units"
            >
              <GraduationCap className="w-5 h-5" />
            </button>
          </header>

          {/* ── CONTENT AREA ── */}
          {showArtifacts ? (
            <div className="flex-1 overflow-y-auto">
              <ArtifactsPage />
            </div>
          ) : (
            (() => {
              const isNewChat = !activeChat || activeChat.messages.length === 0;
              return (
                <>
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto chat-scroll-area">
                    <AnimatePresence mode="wait">
                      {isNewChat ? (
                        <motion.div
                          key="new-chat"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, y: 40 }}
                          transition={{ duration: 0.3 }}
                          className="flex flex-col items-center justify-center h-full px-4"
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mb-6"
                          >
                            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                              {greeting}, {displayName.split(" ")[0]}
                            </h2>
                            <p className="text-muted-foreground text-sm">
                              {selectedUnit
                                ? `Ask anything about ${selectedUnit.unit_code} — ${selectedUnit.unit_name}`
                                : "How can I help you with your studies today?"}
                            </p>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="w-full px-4 md:px-0"
                          >
                            {chatInput}
                          </motion.div>
                          {/* General suggestions (no unit selected) */}
                          {!selectedUnit && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="flex flex-wrap justify-center gap-2.5 mt-5 max-w-[680px] w-full px-4 md:px-0"
                            >
                              {SUGGESTIONS.map((s, i) => (
                                <motion.button
                                  key={s.label}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.25 + i * 0.08 }}
                                  onClick={() => handleSuggestion(s.prompt)}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 glass-card hover:-translate-y-0.5 transition-all"
                                  style={{ borderRadius: "30px" }}
                                >
                                  <s.icon className="w-4 h-4 text-primary flex-shrink-0" />
                                  <span className="font-display font-semibold text-sm text-foreground whitespace-nowrap">
                                    {s.label}
                                  </span>
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                          {/* Unit selected but no messages — show select unit nudge on mobile */}
                          {!selectedUnit && isMobile && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.4 }}
                              className="mt-4"
                            >
                              <button
                                onClick={() => setMobileUnitsOpen(true)}
                                className="flex items-center gap-2 text-sm text-primary border border-primary/30 rounded-full px-4 py-2 hover:bg-primary/5 transition-colors"
                              >
                                <GraduationCap className="w-4 h-4" /> Browse My Units
                              </button>
                            </motion.div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="active-chat"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-4"
                        >
                          {activeChat!.messages.map((msg, msgIndex) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`group/msg flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div className="flex flex-col gap-1 max-w-[85%]">
                                {(() => {
                                  const chatBg = getChatBg();
                                  const hasCustomBg = chatBg && chatBg.url;
                                  const bubbleStyle = hasCustomBg
                                    ? msg.sender === "user"
                                      ? { background: chatBg.userBubble, color: chatBg.userText }
                                      : { background: chatBg.botBubble, color: chatBg.botText }
                                    : msg.sender === "user"
                                      ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                                      : undefined;
                                  const bubbleClass =
                                    msg.sender === "user"
                                      ? `px-4 py-3 rounded-2xl text-sm leading-relaxed rounded-br-md`
                                      : `px-4 py-3 rounded-2xl text-sm leading-relaxed rounded-bl-md ${!hasCustomBg ? "bg-muted text-foreground" : ""}`;
                                  return (
                                    <div className={bubbleClass} style={bubbleStyle}>
                                      {msg.sender === "bot" && (
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <img src={sekaniLogo} alt="Sekani" className="w-4 h-4" />
                                          <span className="text-xs font-semibold text-primary">Sekani</span>
                                        </div>
                                      )}
                                      {msg.sender === "bot" ? (
                                        <div className="prose prose-sm max-w-none dark:prose-invert break-words [overflow-wrap:anywhere] [word-break:break-word]">
                                          <ReactMarkdown
                                            remarkPlugins={[remarkMath, remarkGfm]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                              a({ href, children, ...props }) {
                                                if (href?.startsWith("download:")) {
                                                  const format = href.replace("download:", "") as
                                                    | "pdf"
                                                    | "docx"
                                                    | "pptx"
                                                    | "xlsx";
                                                  const generators: Record<string, () => void> = {
                                                    pdf: () => generatePDF(msg.text, activeChat?.title || "Document"),
                                                    docx: () => generateDOCX(msg.text, activeChat?.title || "Document"),
                                                    pptx: () =>
                                                      generatePPTX(msg.text, activeChat?.title || "Presentation"),
                                                    xlsx: () =>
                                                      generateXLSX(msg.text, activeChat?.title || "Spreadsheet"),
                                                  };
                                                  return (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        generators[format]?.();
                                                      }}
                                                      className="inline-flex items-center gap-2 px-4 py-2.5 my-1 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                      style={{
                                                        background:
                                                          "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
                                                        color: "hsl(var(--primary-foreground))",
                                                        boxShadow: "0 2px 8px hsl(var(--primary) / 0.3)",
                                                      }}
                                                    >
                                                      <Download className="w-4 h-4" />
                                                      <span>{String(children).replace("📥 ", "")}</span>
                                                    </button>
                                                  );
                                                }
                                                return (
                                                  <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                                                    {children}
                                                  </a>
                                                );
                                              },
                                              table: ({ children }: any) => (
                                                <div className="my-3 overflow-x-auto rounded-lg border border-border">
                                                  <table className="min-w-full divide-y divide-border text-sm">
                                                    {children}
                                                  </table>
                                                </div>
                                              ),
                                              thead: ({ children }: any) => (
                                                <thead className="bg-muted/50">{children}</thead>
                                              ),
                                              tbody: ({ children }: any) => (
                                                <tbody className="divide-y divide-border">{children}</tbody>
                                              ),
                                              tr: ({ children }: any) => (
                                                <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
                                              ),
                                              th: ({ children }: any) => (
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                  {children}
                                                </th>
                                              ),
                                              td: ({ children }: any) => (
                                                <td className="px-3 py-2 text-sm text-foreground">{children}</td>
                                              ),
                                              code({ className, children, ...props }) {
                                                const match = /language-(\w+)/.exec(className || "");
                                                const lang = match ? match[1] : "";
                                                const codeStr = String(children).replace(/\n$/, "");
                                                if (lang === "mermaid") return <MermaidBlock code={codeStr} />;
                                                const isBlock = codeStr.includes("\n") || !!lang;
                                                const canPreview = [
                                                  "html",
                                                  "htm",
                                                  "javascript",
                                                  "js",
                                                  "jsx",
                                                  "tsx",
                                                  "svg",
                                                ].includes(lang.toLowerCase());
                                                if (isBlock) {
                                                  return (
                                                    <div className="relative group/code my-2">
                                                      {lang && (
                                                        <div className="flex items-center justify-between bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-t-lg text-xs">
                                                          <span className="font-mono">{lang}</span>
                                                          <div className="flex items-center gap-1 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                                            <button
                                                              onClick={() => {
                                                                navigator.clipboard.writeText(codeStr);
                                                                toast.success("Copied!");
                                                              }}
                                                              className="px-2 py-0.5 rounded hover:bg-zinc-700 transition-colors"
                                                            >
                                                              Copy
                                                            </button>
                                                            {canPreview && (
                                                              <button
                                                                onClick={() => handleCreateArtifact(codeStr, lang)}
                                                                className="px-2 py-0.5 rounded hover:bg-zinc-700 text-blue-400 transition-colors flex items-center gap-1"
                                                              >
                                                                <Play className="w-3 h-3" /> Run
                                                              </button>
                                                            )}
                                                            <button
                                                              onClick={() =>
                                                                handleCreateArtifact(codeStr, lang || "text")
                                                              }
                                                              className="px-2 py-0.5 rounded hover:bg-zinc-700 text-emerald-400 transition-colors flex items-center gap-1"
                                                            >
                                                              <Code2 className="w-3 h-3" /> Artifact
                                                            </button>
                                                          </div>
                                                        </div>
                                                      )}
                                                      <pre
                                                        className={`bg-zinc-900 text-zinc-100 ${lang ? "rounded-b-lg" : "rounded-lg"} p-3 overflow-x-auto`}
                                                      >
                                                        <code className={className} {...props}>
                                                          {children}
                                                        </code>
                                                      </pre>
                                                      {!lang && (
                                                        <button
                                                          onClick={() => handleCreateArtifact(codeStr, "text")}
                                                          className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md"
                                                        >
                                                          <Code2 className="w-3 h-3" /> Artifact
                                                        </button>
                                                      )}
                                                    </div>
                                                  );
                                                }
                                                return (
                                                  <code
                                                    className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                                                    {...props}
                                                  >
                                                    {children}
                                                  </code>
                                                );
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
                                                      <p className="text-xs text-muted-foreground mt-1.5 text-center italic">
                                                        {alt}
                                                      </p>
                                                    )}
                                                  </div>
                                                );
                                              },
                                            }}
                                          >
                                            {(() => {
                                              const raw = teachMeActive
                                                ? stripControlTags(msg.text || "...")
                                                : msg.text || "...";
                                              return raw
                                                .replace(/\\\((.+?)\\\)/g, "$$$1$$")
                                                .replace(/\\\[(.+?)\\\]/gs, "$$$$$1$$$$");
                                            })()}
                                          </ReactMarkdown>
                                        </div>
                                      ) : editingMsgId === msg.id ? (
                                        <form
                                          onSubmit={(e) => {
                                            e.preventDefault();
                                            handleEditMessage(msg.id, editingMsgText);
                                          }}
                                          className="flex items-center gap-2"
                                        >
                                          <input
                                            value={editingMsgText}
                                            onChange={(e) => setEditingMsgText(e.target.value)}
                                            className="flex-1 bg-transparent border-b border-primary-foreground/50 outline-none text-sm"
                                            autoFocus
                                          />
                                          <button type="submit" className="p-0.5">
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button type="button" onClick={() => setEditingMsgId(null)} className="p-0.5">
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </form>
                                      ) : (
                                        <span className="break-words [word-break:break-word] [overflow-wrap:anywhere]">
                                          {msg.text}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Action buttons */}
                                <div
                                  className={`flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                >
                                  <button
                                    onClick={() => copyToClipboard(msg.text)}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Copy"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  {msg.sender === "user" && (
                                    <button
                                      onClick={() => {
                                        setEditingMsgId(msg.id);
                                        setEditingMsgText(msg.text);
                                      }}
                                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                      title="Edit"
                                    >
                                      <Pen className="w-3 h-3" />
                                    </button>
                                  )}
                                  {msg.sender === "bot" && (
                                    <>
                                      <button
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        title="Good response"
                                      >
                                        <ThumbsUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        title="Bad response"
                                      >
                                        <ThumbsDown className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleRetry(msgIndex)}
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        title="Retry"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                  {msg.sender === "bot" && msg.text.length > 100 && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                          title="Download"
                                        >
                                          <Download className="w-3 h-3" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent side="top" align="start" className="w-40 p-1.5">
                                        <button
                                          onClick={() => generatePDF(msg.text, activeChat?.title || "Document")}
                                          className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-accent transition-colors"
                                        >
                                          📄 PDF
                                        </button>
                                        <button
                                          onClick={() => generateDOCX(msg.text, activeChat?.title || "Document")}
                                          className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-accent transition-colors"
                                        >
                                          📝 Word (.docx)
                                        </button>
                                        <button
                                          onClick={() => generatePPTX(msg.text, activeChat?.title || "Presentation")}
                                          className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-accent transition-colors"
                                        >
                                          📊 PowerPoint (.pptx)
                                        </button>
                                        <button
                                          onClick={() => generateXLSX(msg.text, activeChat?.title || "Spreadsheet")}
                                          className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-accent transition-colors"
                                        >
                                          📈 Excel (.xlsx)
                                        </button>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>

                                {/* Smart Suggestions after bot messages */}
                                {msg.sender === "bot" &&
                                  msg.text.length > 50 &&
                                  msgIndex === activeChat!.messages.length - 1 &&
                                  !isStreaming && (
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
                                        onClick={() =>
                                          handleSend(
                                            "Summarize the key points from your last response in bullet points",
                                          )
                                        }
                                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors font-medium"
                                      >
                                        📋 Summarize
                                      </button>
                                    </div>
                                  )}
                                <span
                                  className={`text-[10px] text-muted-foreground px-1 ${msg.sender === "user" ? "text-right" : "text-left"}`}
                                >
                                  {formatTime(msg.timestamp)}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                          <AnimatePresence>
                            {isStreaming && activeChat!.messages[activeChat!.messages.length - 1]?.sender !== "bot" && (
                              <TypingIndicator />
                            )}
                          </AnimatePresence>
                          <div ref={messagesEndRef} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {!isNewChat && (
                    <div className="relative">
                      {showScrollButton && (
                        <button
                          onClick={() =>
                            chatContainerRef.current?.scrollTo({
                              top: chatContainerRef.current.scrollHeight,
                              behavior: "smooth",
                            })
                          }
                          className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="absolute bottom-4 left-0 right-0 z-20 px-4 pointer-events-none"
                        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                      >
                        {chatInput}
                      </motion.div>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </div>

        {/* Artifact viewer */}
        {viewerOpen && (
          <div className="hidden md:flex w-[45%] min-w-[300px] max-w-[600px]">
            <ArtifactViewer />
          </div>
        )}
        {viewerOpen && (
          <div className="flex md:hidden fixed inset-0 z-50 bg-background">
            <ArtifactViewer />
          </div>
        )}

        {/* Teach Me Panel */}
        <AnimatePresence>
          {teachMeActive && teachMe.session && !viewerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-40 md:hidden"
                onClick={() => {
                  if (teachMe.session) teachMe.markComplete(teachMe.session.id);
                  setTeachMeActive(false);
                  teachMe.endSession();
                  document.body.classList.remove("focus-mode");
                }}
              />
              <TeachMePanel
                session={teachMe.session}
                onToggleFocusMode={() => {
                  if (teachMe.session) {
                    teachMe.toggleFocusMode(teachMe.session.id);
                    document.body.classList.toggle("focus-mode", !teachMe.session.focusMode);
                  }
                }}
                onEndSession={() => {
                  if (teachMe.session) teachMe.markComplete(teachMe.session.id);
                  setTeachMeActive(false);
                  teachMe.endSession();
                  document.body.classList.remove("focus-mode");
                }}
              />
            </>
          )}
        </AnimatePresence>

        {/* ── RIGHT UNITS PANEL (desktop) ── */}
        {!viewerOpen && !teachMeActive && (
          <aside className="hidden md:flex flex-col w-[260px] flex-shrink-0 border-l border-border bg-card/50">
            {unitsPanelContent}
          </aside>
        )}
      </div>

      {/* ── RIGHT UNITS PANEL (mobile bottom sheet) ── */}
      <AnimatePresence>
        {mobileUnitsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileUnitsOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl border-t border-border md:hidden"
              style={{ maxHeight: "85vh" }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 32px)" }}>
                {unitsPanelContent}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DIALOGS ── */}

      {/* Settings */}
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
        }}
      />

      <ConfirmDialog
        open={showDeleteAllConfirm}
        onOpenChange={setShowDeleteAllConfirm}
        title="Delete All Chats?"
        description="This will permanently delete all your conversations. This action cannot be undone."
        confirmLabel="Delete All"
        onConfirm={async () => {
          await deleteAllChats();
          setShowDeleteAllConfirm(false);
        }}
      />

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
        }}
      />

      {/* Payment Dialog */}
      <Dialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          if (!paymentVerifying) setShowPaymentDialog(open);
        }}
      >
        <DialogContent className="backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl max-w-md max-h-[90vh] overflow-y-auto">
          {paymentVerifying ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg font-semibold">Authenticating Payment...</p>
              <p className="text-sm text-muted-foreground text-center">
                {paymentMethod === "card"
                  ? "Complete payment in the new tab."
                  : "Please complete the M-Pesa prompt on your phone."}
                <br />
                We'll detect it automatically.
              </p>
              <Button variant="outline" size="sm" onClick={cancelPaymentPolling} className="mt-4">
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center">Upgrade to Premium</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground text-center">
                  You've reached your free daily limit. Upgrade to keep learning!
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentPlan("individual")}
                    className={`border rounded-xl p-4 text-center transition-all ${paymentPlan === "individual" ? "border-2 border-primary bg-primary/5" : "border-border"}`}
                  >
                    <p
                      className="text-xs font-semibold uppercase"
                      style={{
                        color: paymentPlan === "individual" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      Individual
                    </p>
                    <p className="text-2xl font-bold mt-1">KES 129</p>
                    <p className="text-xs text-muted-foreground">1 user</p>
                  </button>
                  <button
                    onClick={() => setPaymentPlan("group")}
                    className={`border rounded-xl p-4 text-center transition-all ${paymentPlan === "group" ? "border-2 border-primary bg-primary/5" : "border-border"}`}
                  >
                    <p
                      className="text-xs font-semibold uppercase"
                      style={{
                        color: paymentPlan === "group" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      Group
                    </p>
                    <p className="text-2xl font-bold mt-1">KES 499</p>
                    <p className="text-xs text-muted-foreground">5 users</p>
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Unlimited tokens • One-time payment</p>
                </div>
                {paymentPlan === "group" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Group Member Emails (5 required)</Label>
                    {groupEmails.map((ge, i) => (
                      <Input
                        key={i}
                        type="email"
                        placeholder={i === 0 ? "Your email (auto-filled)" : `Member ${i + 1} email`}
                        value={i === 0 ? profile?.email || ge : ge}
                        disabled={i === 0}
                        onChange={(e) => {
                          const updated = [...groupEmails];
                          updated[i] = e.target.value;
                          setGroupEmails(updated);
                        }}
                        className={`text-sm ${i === 0 ? "bg-muted/50" : ""}`}
                      />
                    ))}
                  </div>
                )}
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
                      Enter your M-Pesa number to receive the payment prompt
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    You'll be redirected to a secure Paystack page to complete your card payment.
                  </p>
                )}
                <Button
                  onClick={handlePayment}
                  disabled={
                    paymentLoading ||
                    (paymentMethod === "mpesa" && !paymentPhone.trim()) ||
                    (paymentPlan === "group" && groupEmails.slice(1).some((e) => !e.trim()))
                  }
                  className="w-full text-white font-semibold py-3"
                  style={{ backgroundColor: "#800000" }}
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...
                    </>
                  ) : paymentMethod === "mpesa" ? (
                    `Pay KES ${paymentPlan === "group" ? "499" : "129"} via M-Pesa`
                  ) : (
                    `Pay KES ${paymentPlan === "group" ? "499" : "129"} via Card`
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage;
