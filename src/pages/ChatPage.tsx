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
  ScrollText,
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
import { SourcesPanel } from "@/components/SourcesPanel";
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

// ─── Global styles injected once ─────────────────────────────────────────────

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cal+Sans:wght@400;600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  :root {
    --sk-sidebar-bg: #0c1220;
    --sk-sidebar-border: rgba(255,255,255,0.06);
    --sk-sidebar-item-hover: rgba(255,255,255,0.05);
    --sk-sidebar-item-active: rgba(99,102,241,0.18);
    --sk-sidebar-text: rgba(255,255,255,0.55);
    --sk-sidebar-text-active: rgba(255,255,255,0.92);
    --sk-accent: #6366f1;
    --sk-accent2: #8b5cf6;
    --sk-user-bubble-from: #4f46e5;
    --sk-user-bubble-to: #7c3aed;
    --sk-font-display: 'Cal Sans', 'DM Sans', system-ui, sans-serif;
    --sk-font-body: 'DM Sans', system-ui, sans-serif;
  }

  .sk-font-display { font-family: var(--sk-font-display); }
  .sk-font-body { font-family: var(--sk-font-body); }

  /* ── Scrollbars ── */
  .sk-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
  .sk-scroll::-webkit-scrollbar-track { background: transparent; }
  .sk-scroll::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: 99px;
  }
  .sk-scroll::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.4);
  }
  .sk-sidebar-scroll::-webkit-scrollbar { width: 3px; }
  .sk-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
  .sk-sidebar-scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 99px;
  }
  .sk-sidebar-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.2);
  }

  /* ── Typing dots ── */
  @keyframes sk-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  /* ── Mic pulse ── */
  @keyframes sk-mic-pulse {
    0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
    70% { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
    100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
  }
  .sk-mic-active { animation: sk-mic-pulse 1.2s ease-out infinite; }

  /* ── Sidebar collapsed icon tooltip ── */
  .sk-icon-btn-wrap { position: relative; }
  .sk-icon-btn-wrap .sk-tooltip {
    position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%);
    background: hsl(var(--popover)); color: hsl(var(--popover-foreground));
    font-size: 12px; font-family: var(--sk-font-body); white-space: nowrap;
    padding: 4px 10px; border-radius: 8px;
    border: 1px solid hsl(var(--border));
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    opacity: 0; pointer-events: none; transition: opacity .15s;
    z-index: 100;
  }
  .sk-icon-btn-wrap:hover .sk-tooltip { opacity: 1; }

  /* ── Message prose overrides ── */
  .sk-prose p { margin: 0.45em 0; }
  .sk-prose p:first-child { margin-top: 0; }
  .sk-prose p:last-child { margin-bottom: 0; }
  .sk-prose ul, .sk-prose ol { padding-left: 1.25em; margin: 0.5em 0; }
  .sk-prose li { margin: 0.2em 0; }
  .sk-prose strong { font-weight: 600; }

  /* ── Input focus ring ── */
  .sk-input-bar:focus-within {
    border-color: rgba(99,102,241,0.5) !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
  }
`;

function injectStyles() {
  if (document.getElementById("sk-global-styles")) return;
  const el = document.createElement("style");
  el.id = "sk-global-styles";
  el.textContent = GLOBAL_STYLES;
  document.head.appendChild(el);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex justify-start"
  >
    <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-[4px] bg-card border border-border/60 shadow-sm">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-indigo-400/60"
          style={{
            animation: `sk-bounce 0.9s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1.5 sk-font-body">Sekani is thinking…</span>
    </div>
  </motion.div>
);

const VoiceInputVisualizer = () => (
  <div className="flex h-7 items-end gap-1" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => (
      <motion.div
        key={i}
        className="w-1 rounded-full bg-indigo-500"
        animate={{ height: [8, 22 - i * 2, 12 + (i % 2) * 8, 18 - (i % 3) * 3, 8] }}
        transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }}
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
  const [mobileUnitsOpen, setMobileUnitsOpen] = useState(false);
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
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);

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

  // Inject global styles once
  useEffect(() => {
    injectStyles();
  }, []);

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
    const targetId = selectedUnitId || expandedUnitId;
    if (!targetId) {
      setPastPaperCount(0);
      setNotesCount(0);
      return;
    }
    const loadCounts = async () => {
      const [ppRes, notesRes] = await Promise.all([
        supabase
          .from("materials")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", targetId)
          .eq("document_type", "past_paper"),
        supabase
          .from("materials")
          .select("id", { count: "exact", head: true })
          .eq("unit_id", targetId)
          .eq("document_type", "notes"),
      ]);
      setPastPaperCount(ppRes.count || 0);
      setNotesCount(notesRes.count || 0);
    };
    loadCounts();
  }, [selectedUnitId, expandedUnitId]);

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
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (atBottom) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isStreaming]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!teachMeActive || !activeChat || isStreaming) return;
    const msgs = activeChat.messages;
    const lastMsg = msgs[msgs.length - 1];
    if (!lastMsg || lastMsg.sender !== "bot") return;
    const tags = parseControlTags(lastMsg.text);
    if (tags.topicOutline && !teachMe.session) {
      const outline = tags.topicOutline.map((t: any, i: number) => ({ ...t, status: i === 0 ? "active" : "locked" }));
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
          passed: tags.checkpoint.score >= 2,
          strong: tags.checkpoint.strong?.join(", "),
          weak: tags.checkpoint.weak?.join(", "),
        });
      }
      if (tags.readinessUpdate) teachMe.updateReadiness(teachMe.session.id, tags.readinessUpdate.score);
      if (tags.streakUpdate) teachMe.updateStreak(teachMe.session.id, tags.streakUpdate.action);
      if (tags.sessionRecap) teachMe.saveRecap(teachMe.session.id, tags.sessionRecap);
      if (tags.predictedQSession) teachMe.updatePredictedQScore(teachMe.session.id, tags.predictedQSession.score);
      if (tags.memoryUpdate)
        teachMe.upsertStudentMemory(tags.memoryUpdate.topicName, tags.memoryUpdate.unit, tags.memoryUpdate.strength);
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
      if (dx > 0 && startX < 30 && !mobileSidebarOpen) setMobileSidebarOpen(true);
      else if (dx < 0 && mobileSidebarOpen) setMobileSidebarOpen(false);
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
    toast.success("Copied!");
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
    if (inputRef.current) inputRef.current.style.height = "36px";
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

  // ─── Unit selection ───────────────────────────────────────────────────────────

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
    setExpandedUnitId((prev) => (prev === unitId ? null : unitId));
    setShowArtifacts(false);
  };

  const handleNewUnitChat = async (unitId: string) => {
    setSelectedUnitId(unitId);
    setShowArtifacts(false);
    await createChat("unit", unitId);
    if (isMobile) setMobileUnitsOpen(false);
  };

  const handleOpenUnitChat = async (unitId: string) => {
    setSelectedUnitId(unitId);
    setShowArtifacts(false);
    const existingUnitChat = chats.find((c) => c.chat_type === "unit" && c.unit_id === unitId);
    if (existingUnitChat) setActiveChat(existingUnitChat.id);
    else await createChat("unit", unitId);
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
  const generalChats = useMemo(() => chats.filter((c) => c.chat_type !== "unit"), [chats]);
  const unitChats = useMemo(
    () => (selectedUnitId ? chats.filter((c) => c.chat_type === "unit" && c.unit_id === selectedUnitId) : []),
    [chats, selectedUnitId],
  );
  const activeChatList = selectedUnitId ? unitChats : generalChats;
  const groupedChats = useMemo(() => {
    const groups: Record<string, typeof activeChatList> = {};
    for (const chat of activeChatList) {
      const group = getDateGroup(chat.timestamp);
      if (!groups[group]) groups[group] = [];
      groups[group].push(chat);
    }
    return groups;
  }, [activeChatList]);

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
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground sk-font-body">Loading Sekani…</p>
        </div>
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
    const isActive = activeChat?.id === chat.id;
    const preview = chat.messages[0]?.text?.slice(0, 45) || "Empty chat";
    const time = formatTime(chat.timestamp);
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
        className={`group/ci relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 text-sm ${
          isActive ? "bg-indigo-500/15 border border-indigo-500/20" : "border border-transparent hover:bg-white/5"
        }`}
      >
        {/* Active indicator bar */}
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-full" />}

        <div className="flex-1 min-w-0 pl-1">
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
                className="bg-transparent border-b border-indigo-400/60 text-sm w-full outline-none py-0.5 text-white/90 sk-font-body"
                onClick={(e) => e.stopPropagation()}
              />
              <button type="submit" onClick={(e) => e.stopPropagation()} className="p-0.5 text-indigo-400">
                <Check className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <>
              <span
                className={`truncate block text-[13px] font-medium leading-tight sk-font-body ${isActive ? "text-white/90" : "text-white/55"}`}
              >
                {chat.title}
              </span>
              <div className="flex items-center justify-between mt-0.5 gap-2">
                <span className={`text-[11px] truncate ${isActive ? "text-white/40" : "text-white/25"}`}>
                  {preview}
                </span>
                <span className={`text-[10px] flex-shrink-0 ${isActive ? "text-indigo-300/60" : "text-white/20"}`}>
                  {time}
                </span>
              </div>
            </>
          )}
        </div>

        {!isRenaming && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 opacity-0 group-hover/ci:opacity-100 transition-opacity flex-shrink-0 ml-1 hover:bg-white/10 rounded-md"
              >
                <MoreVertical className="w-3.5 h-3.5 text-white/40" />
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

  // ─── LEFT SIDEBAR content ─────────────────────────────────────────────────────

  const sidebarContent = (
    <div
      className="flex flex-col h-full sk-sidebar-scroll overflow-y-auto"
      style={{ background: "var(--sk-sidebar-bg)" }}
    >
      {/* Logo area */}
      <div className={`flex-shrink-0 ${sidebarExpanded || isMobile ? "px-4 pt-5 pb-3" : "px-2 pt-4 pb-3"}`}>
        {sidebarExpanded || isMobile ? (
          <div className="flex items-center gap-3 mb-5">
            {/* Logo renders as SVG/PNG — supports both */}
            <div className="relative flex-shrink-0">
              <img src={sekaniLogo} alt="Sekani" className="w-9 h-9 object-contain" />
              <div className="absolute inset-0 rounded-xl bg-indigo-500/10 -z-10" />
            </div>
            <span
              className="sk-font-display font-semibold text-white/90 tracking-tight"
              style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
            >
              Sekani
            </span>
            <motion.button
              onClick={toggleSidebar}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="ml-auto p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
              title="Collapse sidebar"
            >
              <PanelRight className="w-4 h-4" />
            </motion.button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 mb-3">
            <img src={sekaniLogo} alt="Sekani" className="w-9 h-9 object-contain" />
            <motion.button
              onClick={toggleSidebar}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors"
              title="Expand sidebar"
            >
              <PanelLeft className="w-4.5 h-4.5" />
            </motion.button>
          </div>
        )}

        {/* New Chat button */}
        {sidebarExpanded || isMobile ? (
          <button
            onClick={() => {
              selectedUnitId ? createChat("unit", selectedUnitId) : createChat("general");
              setShowArtifacts(false);
              if (isMobile) setMobileSidebarOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group/newchat sk-font-body hover:opacity-90"
            style={{
              background: "#F5B208",
              color: "#1D2B3B",
            }}
          >
            <Plus className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
            <span>New Chat</span>
          </button>
        ) : (
          <div className="sk-icon-btn-wrap">
            <button
              onClick={() => {
                selectedUnitId ? createChat("unit", selectedUnitId) : createChat("general");
              }}
              className="w-full flex items-center justify-center p-2 rounded-xl transition-colors"
              style={{ background: "#F5B208" }}
            >
              <Plus className="w-4 h-4" style={{ color: "#1D2B3B" }} strokeWidth={2.5} />
            </button>
            <span className="sk-tooltip">New Chat</span>
          </div>
        )}
      </div>

      {/* Artifacts link */}
      {sidebarExpanded || isMobile ? (
        <div className="px-3 mb-1">
          <button
            onClick={() => {
              setShowArtifacts(true);
              if (isMobile) setMobileSidebarOpen(false);
            }}
            className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] transition-all sk-font-body ${
              showArtifacts
                ? "bg-indigo-500/15 text-white/85 border border-indigo-500/20"
                : "text-white/40 hover:text-white/65 hover:bg-white/5 border border-transparent"
            }`}
          >
            <LayoutGrid className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Artifacts</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center px-2 mb-2">
          <div className="sk-icon-btn-wrap w-full">
            <button
              onClick={() => setShowArtifacts(true)}
              className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-colors ${showArtifacts ? "bg-indigo-500/15 text-indigo-300" : "text-white/30 hover:bg-white/5 hover:text-white/60"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <span className="sk-tooltip">Artifacts</span>
          </div>
        </div>
      )}

      {/* Divider */}
      {(sidebarExpanded || isMobile) && (
        <div className="mx-4 mb-3 mt-1" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
      )}

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto px-3 py-1 sk-sidebar-scroll">
        {sidebarExpanded || isMobile ? (
          activeChatList.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-[12px] text-white/25 sk-font-body text-center">
                {selectedUnit ? `No ${selectedUnit.unit_code} chats yet` : "No conversations yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-white/25 sk-font-body">
                  {selectedUnit ? `${selectedUnit.unit_code} Chats` : "History"}
                </p>
                {!selectedUnit && (
                  <button
                    onClick={() => setShowDeleteAllConfirm(true)}
                    className="text-[10px] text-red-400/50 hover:text-red-400 transition-colors sk-font-body"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {DATE_GROUP_ORDER.map((group) => {
                const groupChats = groupedChats[group];
                if (!groupChats || groupChats.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-white/20 px-1 mb-1.5 sk-font-body">
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

      {/* Profile */}
      <div
        ref={profileMenuRef}
        className={`relative flex-shrink-0 ${sidebarExpanded || isMobile ? "p-3" : "px-2 py-3"}`}
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <AnimatePresence>
          {profileMenuOpen && (sidebarExpanded || isMobile) && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute bottom-full left-3 right-3 mb-2 bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-popover-foreground truncate sk-font-body">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate sk-font-body">{profile?.email || "student"}</p>
                  </div>
                </div>
              </div>
              <div className="py-1.5">
                {role === "super_admin" && (
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("/superadmin");
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors sk-font-body"
                  >
                    <Shield className="w-4 h-4 text-muted-foreground" /> Super Admin
                  </button>
                )}
                {(role === "admin" || role === "super_admin") && (
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("/admin");
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors sk-font-body"
                  >
                    <Shield className="w-4 h-4 text-muted-foreground" /> Admin Dashboard
                  </button>
                )}
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate("/personalization");
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors sk-font-body"
                >
                  <User className="w-4 h-4 text-muted-foreground" /> Personalization
                </button>
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors sk-font-body"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" /> Settings
                </button>
                <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors sk-font-body">
                  <CircleHelp className="w-4 h-4 text-muted-foreground" /> Help
                </button>
                <div className="mx-3 my-1.5 border-t border-border" />
                <div className="px-2 pb-1">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setShowPaymentDialog(true);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-semibold rounded-xl transition-opacity hover:opacity-90 sk-font-body"
                    style={{ background: "linear-gradient(135deg,#1D2A3A,#b91c1c)", color: "white" }}
                  >
                    <Sparkles className="w-4 h-4" /> Upgrade to Premium
                  </button>
                </div>
                <div className="my-1" />
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors sk-font-body"
                >
                  <LogOut className="w-4 h-4 text-muted-foreground" /> Log out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {sidebarExpanded || isMobile ? (
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-3 w-full p-2 rounded-xl transition-colors hover:bg-white/5"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-medium text-white/75 truncate sk-font-body">{displayName}</p>
              <p className="text-[11px] text-white/30 truncate sk-font-body">{profile?.course_name || "Student"}</p>
            </div>
            <ChevronUp
              className={`w-3.5 h-3.5 text-white/25 transition-transform duration-200 ${profileMenuOpen ? "" : "rotate-180"}`}
            />
          </button>
        ) : (
          <div className="sk-icon-btn-wrap flex justify-center">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              title={displayName}
            >
              {displayName.charAt(0).toUpperCase()}
            </button>
            <span className="sk-tooltip">{displayName}</span>
          </div>
        )}
      </div>
    </div>
  );

  // ─── RIGHT PANEL content ──────────────────────────────────────────────────────

  const unitsPanelContent = (
    <div className="flex flex-col h-full bg-card/30">
      {/* Panel header */}
      <div className="px-4 py-4 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <h2 className="font-semibold text-foreground text-[13px] sk-font-display">My Units</h2>
          </div>
          {isMobile && (
            <button
              onClick={() => setMobileUnitsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 sk-font-body">Select a unit to start studying</p>
      </div>

      {/* Hidden file inputs */}
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
      <div className="flex-1 overflow-y-auto p-3 space-y-2 sk-scroll">
        {enrolledUnits.length === 0 ? (
          <div className="flex flex-col items-center py-14 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground sk-font-body">No units enrolled</p>
              <p className="text-xs text-muted-foreground/50 mt-1 sk-font-body">Your course units will appear here</p>
            </div>
          </div>
        ) : (
          enrolledUnits.map((unit) => {
            const isExpanded = expandedUnitId === unit.unit_id;
            return (
              <div
                key={unit.unit_id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? "border-indigo-300/30 dark:border-indigo-700/40 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm"
                    : "border-border/60 bg-card hover:border-border"
                }`}
              >
                <button
                  onClick={() => {
                    if (isExpanded) setExpandedUnitId(null);
                    else handleSelectUnit(unit.unit_id);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold sk-font-display ${isExpanded ? "bg-indigo-500 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {unit.unit_code.slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[11px] font-bold tracking-wide sk-font-body ${isExpanded ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"}`}
                    >
                      {unit.unit_code}
                    </p>
                    <p className="text-[13px] font-medium text-foreground truncate leading-tight sk-font-body">
                      {unit.unit_name}
                    </p>
                    {unit.lecturer && (
                      <p className="text-[11px] text-muted-foreground truncate sk-font-body">{unit.lecturer}</p>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-2.5 border-t border-indigo-200/30 dark:border-indigo-800/30">
                        <div className="flex gap-2 pt-2.5">
                          <div className="flex-1 bg-background rounded-xl p-2.5 text-center border border-border/50">
                            <p className="text-xl font-bold text-foreground sk-font-display">{notesCount}</p>
                            <p className="text-[10px] text-muted-foreground sk-font-body">Notes</p>
                          </div>
                          <div className="flex-1 bg-background rounded-xl p-2.5 text-center border border-border/50">
                            <p className="text-xl font-bold text-foreground sk-font-display">{pastPaperCount}</p>
                            <p className="text-[10px] text-muted-foreground sk-font-body">Papers</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-dashed h-8 sk-font-body"
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
                            className="text-xs border-dashed h-8 sk-font-body"
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

                        {Object.entries(unitUploadProgress).length > 0 && (
                          <div className="space-y-0.5">
                            {Object.entries(unitUploadProgress).map(([key, status]) => (
                              <p key={key} className="text-xs text-muted-foreground truncate sk-font-body">
                                {status}
                              </p>
                            ))}
                          </div>
                        )}
                        {Object.entries(pastPaperUploadProgress).length > 0 && (
                          <div className="space-y-0.5">
                            {Object.entries(pastPaperUploadProgress).map(([key, status]) => (
                              <p key={key} className="text-xs text-muted-foreground truncate sk-font-body">
                                {status}
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="space-y-0.5 pt-0.5">
                          <button
                            onClick={() => handleNewUnitChat(unit.unit_id)}
                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm hover:bg-background transition-colors text-left border border-dashed border-border mb-1 sk-font-body"
                          >
                            <Plus className="w-4 h-4 flex-shrink-0 text-indigo-500" />
                            <span className="font-medium text-foreground">New Chat</span>
                          </button>

                          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-1 pb-0.5 sk-font-body">
                            Quick Actions
                          </p>

                          {[
                            {
                              icon: BookOpen,
                              label: "Teach Me",
                              color: "text-emerald-600",
                              bg: "bg-emerald-50 dark:bg-emerald-950/30",
                              onClick: async () => {
                                if (notesCount === 0) {
                                  toast.error("Upload course notes first.");
                                  return;
                                }
                                setTeachMeActive(true);
                                let chat = activeChat;
                                if (!chat || chat.unit_id !== unit.unit_id)
                                  chat = await createChat("unit", unit.unit_id);
                                if (chat)
                                  await sendMessage(
                                    `Start Teach Me Mode for the unit: ${unit.unit_name}. Scan my uploaded notes and past papers, build the topic outline, and begin teaching Topic 1 immediately.`,
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
                              bg: "bg-blue-50 dark:bg-blue-950/30",
                              onClick: async () => {
                                if (notesCount === 0) {
                                  toast.error("Upload course notes first.");
                                  return;
                                }
                                await handleOpenUnitChat(unit.unit_id);
                                await handleSuggestion(
                                  `Help me prepare for my ${unit.unit_code} exam. Give me the key topics, likely exam questions, and a revision summary based on the uploaded notes.`,
                                );
                              },
                            },
                            ...(pastPaperCount > 0
                              ? [
                                  {
                                    icon: FileQuestion,
                                    label: "Exam Mode",
                                    color: "text-amber-600",
                                    bg: "bg-amber-50 dark:bg-amber-950/30",
                                    onClick: async () => {
                                      await handleOpenUnitChat(unit.unit_id);
                                      await handleSuggestion(
                                        `[EXAM_MODE] Analyze ALL past papers uploaded for ${unit.unit_code} — ${unit.unit_name}. Cross-reference with course notes to identify: 1) Most frequently tested topics, 2) Common question patterns, 3) Key areas to focus on. Then give me a targeted revision plan.`,
                                      );
                                    },
                                  },
                                ]
                              : []),
                            {
                              icon: ListChecks,
                              label: "Quiz Me",
                              color: "text-purple-600",
                              bg: "bg-purple-50 dark:bg-purple-950/30",
                              onClick: async () => {
                                if (notesCount === 0) {
                                  toast.error("Upload course notes first.");
                                  return;
                                }
                                await handleOpenUnitChat(unit.unit_id);
                                await handleSuggestion(
                                  `Quiz me on ${unit.unit_code} — ${unit.unit_name}. Start with an easy question from the uploaded notes and wait for my answer.`,
                                );
                              },
                            },
                            {
                              icon: FileText,
                              label: "Summarize",
                              color: "text-rose-600",
                              bg: "bg-rose-50 dark:bg-rose-950/30",
                              onClick: async () => {
                                if (notesCount === 0) {
                                  toast.error("Upload course notes first.");
                                  return;
                                }
                                await handleOpenUnitChat(unit.unit_id);
                                await handleSuggestion(
                                  `Give me a complete summary of all the uploaded notes for ${unit.unit_code} — ${unit.unit_name}. Organize by topic.`,
                                );
                              },
                            },
                          ].map((action) => (
                            <button
                              key={action.label}
                              onClick={action.onClick}
                              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-sm hover:bg-muted/50 transition-colors text-left group/ua sk-font-body"
                            >
                              <div
                                className={`w-7 h-7 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}
                              >
                                <action.icon className={`w-3.5 h-3.5 ${action.color}`} />
                              </div>
                              <span className="font-medium text-foreground">{action.label}</span>
                              <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover/ua:opacity-100 transition-opacity" />
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
    <div className="max-w-[700px] w-full mx-auto pointer-events-auto">
      {/* Voice recording indicator */}
      {(isListening || isTranscribing) && (
        <div className="mb-2.5 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50/80 dark:bg-indigo-950/30 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {isTranscribing ? (
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500 flex-shrink-0" />
              ) : (
                <VoiceInputVisualizer />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground sk-font-body">
                  {isTranscribing ? "Transcribing…" : "Listening…"}
                </p>
                <p className="text-xs text-muted-foreground sk-font-body">
                  {isTranscribing ? "Converting speech to text." : "Speak freely — tap Stop when done."}
                </p>
              </div>
            </div>
            {isListening && (
              <button
                onClick={toggleVoice}
                className="rounded-full border border-indigo-300/40 bg-white/80 dark:bg-black/20 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white dark:hover:bg-black/30 transition-colors sk-font-body"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      )}

      {/* Voice draft preview */}
      {showVoicePreview && !isListening && voiceDraft && (
        <div className="mb-2.5 rounded-2xl border border-border bg-card/80 backdrop-blur-sm px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground sk-font-body">
                Voice preview
              </p>
              <p className="mt-1 text-sm text-foreground break-words sk-font-body">{voiceDraft}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={discardVoiceDraft}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Discard"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={applyVoiceDraft}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                title="Use transcript"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {attachedFiles.map((pf, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-xs bg-card border border-border/60 px-2.5 py-1.5 rounded-xl sk-font-body"
            >
              {pf.preview ? (
                <img src={pf.preview} alt="" className="w-5 h-5 rounded-md object-cover" />
              ) : pf.file.type.startsWith("image/") ? (
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <File className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className="max-w-[120px] truncate text-foreground">{pf.file.name}</span>
              <button
                onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Main input bar */}
      <div
        className="sk-input-bar flex items-end gap-1 rounded-[20px] px-2 py-2"
        style={{
          background: "hsl(var(--chat-input-bg, var(--card)))",
          border: "1.5px solid hsl(var(--border))",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        {/* Hidden file inputs */}
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

        {/* Attach button */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex w-9 h-9 items-center justify-center rounded-xl text-muted-foreground hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex-shrink-0">
              <Paperclip className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-52 p-1.5 rounded-2xl">
            {[
              { icon: Camera, label: "Take Photo", onClick: () => cameraInputRef.current?.click() },
              { icon: ImageIcon, label: "Upload Image", onClick: () => photoInputRef.current?.click() },
              { icon: FileText, label: "Upload File", onClick: () => docInputRef.current?.click() },
              {
                icon: FileQuestion,
                label: "Quizzes",
                onClick: () =>
                  handleSuggestion(
                    "Enter Quiz Mode: Generate exam-style questions for my current unit to help me revise. Ask one question at a time, evaluate my answer, and explain the correct answer step by step.",
                  ),
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm hover:bg-accent transition-colors sk-font-body"
              >
                <item.icon className="w-4 h-4 text-muted-foreground" /> {item.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Textarea */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            const el = e.target;
            el.style.height = "36px";
            el.style.height = Math.min(el.scrollHeight, 150) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={selectedUnit ? `Ask about ${selectedUnit.unit_code}…` : "Ask Sekani anything…"}
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground py-2 px-2 min-w-0 resize-none overflow-y-auto leading-relaxed sk-font-body sk-scroll"
          style={{ maxHeight: "150px", height: "36px" }}
          rows={1}
          disabled={isStreaming}
        />

        {/* Mic button */}
        <button
          onClick={toggleVoice}
          disabled={!micSupported || isTranscribing}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0 ${
            isListening
              ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 sk-mic-active"
              : isTranscribing
                ? "text-indigo-500 animate-pulse"
                : "text-muted-foreground hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          } ${!micSupported ? "opacity-30 cursor-not-allowed" : ""}`}
        >
          {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Send button */}
        <button
          onClick={() => handleSend()}
          disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0 disabled:opacity-30"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "white" }}
        >
          {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex bg-background overflow-hidden sk-font-body">
      {/* ── LEFT SIDEBAR (desktop) ── */}
      <motion.aside
        animate={{ width: sidebarExpanded ? 260 : 60 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-col flex-shrink-0 overflow-hidden"
        style={{ background: "var(--sk-sidebar-bg)" }}
      >
        {sidebarContent}
      </motion.aside>

      {/* ── LEFT SIDEBAR (mobile overlay) ── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 left-0 w-[280px] z-50 flex flex-col md:hidden"
              style={{ background: "var(--sk-sidebar-bg)" }}
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
          <header
            className="h-14 flex items-center px-4 flex-shrink-0 z-10 gap-2"
            style={{
              borderBottom: "1px solid hsl(var(--border) / 0.5)",
              background: "hsl(var(--background) / 0.85)",
              backdropFilter: "blur(12px)",
            }}
          >
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-muted rounded-xl md:hidden flex-shrink-0 transition-colors"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              {selectedUnit ? (
                <div className="flex flex-col gap-0.5">
                  <span
                    className="inline-flex text-[10px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-md w-fit sk-font-body"
                    style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}
                  >
                    {selectedUnit.unit_code}
                  </span>
                  <h2 className="font-semibold text-foreground text-[13px] truncate leading-tight sk-font-display">
                    {selectedUnit.unit_name}
                  </h2>
                </div>
              ) : showArtifacts ? (
                <h2 className="font-semibold text-foreground text-sm sk-font-display">Artifacts</h2>
              ) : (
                <h2 className="font-semibold text-foreground text-sm sk-font-display">
                  {activeChat ? activeChat.title : "Sekani"}
                </h2>
              )}
            </div>

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
                  setSourcesOpen(false);
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
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all flex-shrink-0 sk-font-body font-medium ${
                  teachMeActive
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                    : "border-border text-muted-foreground hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span className="hidden sm:inline">{teachMeActive ? "Teaching…" : "Teach Me"}</span>
              </button>
            )}

            {selectedUnit && !teachMeActive && (
              <button
                onClick={() => setSourcesOpen(!sourcesOpen)}
                className={`hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all flex-shrink-0 sk-font-body font-medium ${
                  sourcesOpen
                    ? "bg-indigo-500 text-white border-indigo-500"
                    : "border-border text-muted-foreground hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                <ScrollText className="w-3 h-3" />
                <span>Sources</span>
              </button>
            )}

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
                className={`p-2 rounded-xl transition-colors flex-shrink-0 ${pastPaperCount > 0 ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" : "text-muted-foreground hover:bg-muted"}`}
                title={pastPaperCount > 0 ? "Exam Mode" : "Upload past papers to unlock"}
              >
                <ClipboardList className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setCalendarOpen(!calendarOpen)}
                className="p-2 hover:bg-muted rounded-xl text-foreground flex-shrink-0 transition-colors"
                title="Academic Calendar"
              >
                <Calendar className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => setMobileUnitsOpen(true)}
              className="p-2 hover:bg-muted rounded-xl md:hidden flex-shrink-0 transition-colors"
              title="My Units"
            >
              <GraduationCap className="w-5 h-5" />
            </button>
          </header>

          {/* ── CONTENT AREA ── */}
          {showArtifacts ? (
            <div className="flex-1 overflow-y-auto sk-scroll">
              <ArtifactsPage />
            </div>
          ) : (
            (() => {
              const isNewChat = !activeChat || activeChat.messages.length === 0;
              return (
                <>
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto sk-scroll">
                    <AnimatePresence mode="wait">
                      {isNewChat ? (
                        <motion.div
                          key="new-chat"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, y: 20 }}
                          transition={{ duration: 0.3 }}
                          className="flex flex-col items-center justify-center h-full px-4 py-8"
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mb-8"
                          >
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <img src={sekaniLogo} alt="Sekani" className="w-10 h-10 object-contain" />
                            </div>
                            <h2
                              className="sk-font-display font-semibold text-foreground mb-2"
                              style={{ fontSize: "clamp(1.4rem, 4vw, 1.9rem)", letterSpacing: "0.04em" }}
                            >
                              {greeting}, {displayName.split(" ")[0]}
                            </h2>
                            <p className="text-muted-foreground text-sm sk-font-body max-w-sm mx-auto">
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

                          {!selectedUnit && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="flex flex-wrap justify-center gap-2.5 mt-6 max-w-[700px] w-full px-4 md:px-0"
                            >
                              {SUGGESTIONS.map((s, i) => (
                                <motion.button
                                  key={s.label}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.25 + i * 0.07 }}
                                  onClick={() => handleSuggestion(s.prompt)}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[30px] border border-border/60 bg-card/80 backdrop-blur-sm hover:border-indigo-300/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:-translate-y-0.5 transition-all shadow-sm sk-font-body"
                                >
                                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                    <s.icon className="w-3.5 h-3.5 text-indigo-500" />
                                  </div>
                                  <span className="font-medium text-sm text-foreground">{s.label}</span>
                                </motion.button>
                              ))}
                            </motion.div>
                          )}

                          {!selectedUnit && isMobile && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.4 }}
                              className="mt-5"
                            >
                              <button
                                onClick={() => setMobileUnitsOpen(true)}
                                className="flex items-center gap-2 text-sm text-indigo-500 border border-indigo-300/40 rounded-full px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors sk-font-body font-medium"
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
                          className="max-w-3xl mx-auto px-4 py-6 pb-32 space-y-5"
                        >
                          {activeChat!.messages.map((msg, msgIndex) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`group/msg flex ${msg.sender === "user" ? "justify-end" : "justify-start"} gap-3`}
                            >
                              {/* Bot avatar */}
                              {msg.sender === "bot" && (
                                <div className="flex-shrink-0 mt-1">
                                  <div
                                    className="w-7 h-7 rounded-xl flex items-center justify-center"
                                    style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
                                  >
                                    <img src={sekaniLogo} alt="S" className="w-4 h-4 object-contain" />
                                  </div>
                                </div>
                              )}

                              <div
                                className={`flex flex-col gap-1 ${msg.sender === "user" ? "items-end max-w-[82%]" : "items-start max-w-[85%]"}`}
                              >
                                {(() => {
                                  const chatBg = getChatBg();
                                  const hasCustomBg = chatBg && chatBg.url;
                                  const userStyle = hasCustomBg
                                    ? { background: chatBg.userBubble, color: chatBg.userText }
                                    : { background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white" };
                                  const botStyle = hasCustomBg
                                    ? { background: chatBg.botBubble, color: chatBg.botText }
                                    : undefined;

                                  return (
                                    <div
                                      className={`px-4 py-3 text-[13.5px] leading-relaxed ${
                                        msg.sender === "user"
                                          ? "rounded-2xl rounded-br-[5px] shadow-sm"
                                          : `rounded-2xl rounded-bl-[5px] shadow-sm ${!hasCustomBg ? "bg-card border border-border/60 text-foreground" : ""}`
                                      }`}
                                      style={msg.sender === "user" ? userStyle : botStyle}
                                    >
                                      {msg.sender === "bot" ? (
                                        <div className="sk-prose prose prose-sm max-w-none dark:prose-invert break-words [overflow-wrap:anywhere] [word-break:break-word]">
                                          <ReactMarkdown
                                            remarkPlugins={[remarkMath, remarkGfm]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                              h1({ children }) {
                                                return (
                                                  <h1
                                                    style={{
                                                      fontSize: "1.45rem",
                                                      fontWeight: 700,
                                                      lineHeight: 1.25,
                                                      marginTop: "1.2rem",
                                                      marginBottom: "0.5rem",
                                                      fontFamily: "var(--sk-font-display)",
                                                      letterSpacing: "-0.01em",
                                                    }}
                                                  >
                                                    {children}
                                                  </h1>
                                                );
                                              },
                                              h2({ children }) {
                                                return (
                                                  <h2
                                                    style={{
                                                      fontSize: "1.15rem",
                                                      fontWeight: 700,
                                                      lineHeight: 1.3,
                                                      marginTop: "1rem",
                                                      marginBottom: "0.45rem",
                                                      fontFamily: "var(--sk-font-display)",
                                                      letterSpacing: "-0.01em",
                                                    }}
                                                  >
                                                    {children}
                                                  </h2>
                                                );
                                              },
                                              h3({ children }) {
                                                return (
                                                  <h3
                                                    style={{
                                                      fontSize: "1rem",
                                                      fontWeight: 600,
                                                      lineHeight: 1.35,
                                                      marginTop: "0.85rem",
                                                      marginBottom: "0.35rem",
                                                    }}
                                                  >
                                                    {children}
                                                  </h3>
                                                );
                                              },
                                              h4({ children }) {
                                                return (
                                                  <h4
                                                    style={{
                                                      fontSize: "0.9rem",
                                                      fontWeight: 600,
                                                      lineHeight: 1.4,
                                                      marginTop: "0.7rem",
                                                      marginBottom: "0.3rem",
                                                    }}
                                                  >
                                                    {children}
                                                  </h4>
                                                );
                                              },
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
                                                      className="inline-flex items-center gap-2 px-4 py-2.5 my-1 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] sk-font-body"
                                                      style={{
                                                        background:
                                                          "linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary)/0.8))",
                                                        color: "hsl(var(--primary-foreground))",
                                                        boxShadow: "0 2px 8px hsl(var(--primary)/0.3)",
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
                                                <div className="my-3 overflow-x-auto rounded-xl border border-border sk-scroll">
                                                  <table className="min-w-full divide-y divide-border text-sm">
                                                    {children}
                                                  </table>
                                                </div>
                                              ),
                                              thead: ({ children }: any) => (
                                                <thead className="bg-muted/60">{children}</thead>
                                              ),
                                              tbody: ({ children }: any) => (
                                                <tbody className="divide-y divide-border">{children}</tbody>
                                              ),
                                              tr: ({ children }: any) => (
                                                <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
                                              ),
                                              th: ({ children }: any) => (
                                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                  {children}
                                                </th>
                                              ),
                                              td: ({ children }: any) => (
                                                <td className="px-3 py-2.5 text-sm text-foreground">{children}</td>
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
                                                    <div className="relative group/code my-2.5 rounded-xl overflow-hidden">
                                                      {lang && (
                                                        <div className="flex items-center justify-between bg-zinc-800 text-zinc-300 px-3.5 py-2 text-xs">
                                                          <span className="font-mono text-zinc-400">{lang}</span>
                                                          <div className="flex items-center gap-1 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                                            <button
                                                              onClick={() => {
                                                                navigator.clipboard.writeText(codeStr);
                                                                toast.success("Copied!");
                                                              }}
                                                              className="px-2 py-0.5 rounded-md hover:bg-zinc-700 transition-colors sk-font-body"
                                                            >
                                                              Copy
                                                            </button>
                                                            {canPreview && (
                                                              <button
                                                                onClick={() => handleCreateArtifact(codeStr, lang)}
                                                                className="px-2 py-0.5 rounded-md hover:bg-zinc-700 text-blue-400 transition-colors flex items-center gap-1 sk-font-body"
                                                              >
                                                                <Play className="w-3 h-3" /> Run
                                                              </button>
                                                            )}
                                                            <button
                                                              onClick={() =>
                                                                handleCreateArtifact(codeStr, lang || "text")
                                                              }
                                                              className="px-2 py-0.5 rounded-md hover:bg-zinc-700 text-emerald-400 transition-colors flex items-center gap-1 sk-font-body"
                                                            >
                                                              <Code2 className="w-3 h-3" /> Artifact
                                                            </button>
                                                          </div>
                                                        </div>
                                                      )}
                                                      <pre
                                                        className={`bg-zinc-900 text-zinc-100 ${lang ? "" : "rounded-xl"} p-3.5 overflow-x-auto sk-scroll`}
                                                      >
                                                        <code className={className} {...props}>
                                                          {children}
                                                        </code>
                                                      </pre>
                                                      {!lang && (
                                                        <button
                                                          onClick={() => handleCreateArtifact(codeStr, "text")}
                                                          className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity flex items-center gap-1 text-xs bg-indigo-500 text-white px-2 py-1 rounded-lg sk-font-body"
                                                        >
                                                          <Code2 className="w-3 h-3" /> Artifact
                                                        </button>
                                                      )}
                                                    </div>
                                                  );
                                                }
                                                return (
                                                  <code
                                                    className="bg-muted px-1.5 py-0.5 rounded-lg text-[13px] font-mono"
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
                                                      alt={alt || "Image"}
                                                      className="max-w-full rounded-xl border border-border shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                                      loading="lazy"
                                                      onClick={() => window.open(src, "_blank")}
                                                    />
                                                    {alt && (
                                                      <p className="text-xs text-muted-foreground mt-1.5 text-center italic sk-font-body">
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
                                            className="flex-1 bg-transparent border-b border-white/50 outline-none text-sm sk-font-body"
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
                                        <span className="break-words [word-break:break-word] [overflow-wrap:anywhere] sk-font-body">
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
                                  {[
                                    { icon: Copy, title: "Copy", onClick: () => copyToClipboard(msg.text) },
                                    ...(msg.sender === "user"
                                      ? [
                                          {
                                            icon: Pen,
                                            title: "Edit",
                                            onClick: () => {
                                              setEditingMsgId(msg.id);
                                              setEditingMsgText(msg.text);
                                            },
                                          },
                                        ]
                                      : []),
                                    ...(msg.sender === "bot"
                                      ? [
                                          { icon: ThumbsUp, title: "Good response", onClick: () => {} },
                                          { icon: ThumbsDown, title: "Bad response", onClick: () => {} },
                                          { icon: RotateCcw, title: "Retry", onClick: () => handleRetry(msgIndex) },
                                        ]
                                      : []),
                                  ].map((btn, idx) => (
                                    <button
                                      key={idx}
                                      onClick={btn.onClick}
                                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                      title={btn.title}
                                    >
                                      <btn.icon className="w-3 h-3" />
                                    </button>
                                  ))}
                                  {msg.sender === "bot" && msg.text.length > 100 && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                          title="Download"
                                        >
                                          <Download className="w-3 h-3" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent side="top" align="start" className="w-44 p-1.5 rounded-xl">
                                        {[
                                          {
                                            emoji: "📄",
                                            label: "PDF",
                                            fn: () => generatePDF(msg.text, activeChat?.title || "Document"),
                                          },
                                          {
                                            emoji: "📝",
                                            label: "Word (.docx)",
                                            fn: () => generateDOCX(msg.text, activeChat?.title || "Document"),
                                          },
                                          {
                                            emoji: "📊",
                                            label: "PowerPoint",
                                            fn: () => generatePPTX(msg.text, activeChat?.title || "Presentation"),
                                          },
                                          {
                                            emoji: "📈",
                                            label: "Excel",
                                            fn: () => generateXLSX(msg.text, activeChat?.title || "Spreadsheet"),
                                          },
                                        ].map((item) => (
                                          <button
                                            key={item.label}
                                            onClick={item.fn}
                                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs hover:bg-accent transition-colors sk-font-body"
                                          >
                                            {item.emoji} {item.label}
                                          </button>
                                        ))}
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>

                                {/* Smart suggestions */}
                                {msg.sender === "bot" &&
                                  msg.text.length > 50 &&
                                  msgIndex === activeChat!.messages.length - 1 &&
                                  !isStreaming && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {[
                                        {
                                          emoji: "💡",
                                          label: "Explain simpler",
                                          prompt: "Explain that in simpler terms, like I'm a beginner",
                                        },
                                        { emoji: "🎯", label: "Quiz me", prompt: "Quiz me on what you just explained" },
                                        {
                                          emoji: "📝",
                                          label: "Exam questions",
                                          prompt: "Give me exam-style questions on this topic",
                                        },
                                        {
                                          emoji: "📋",
                                          label: "Summarize",
                                          prompt: "Summarize the key points from your last response in bullet points",
                                        },
                                      ].map((sug) => (
                                        <button
                                          key={sug.label}
                                          onClick={() => handleSend(sug.prompt)}
                                          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50/80 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 transition-colors font-medium sk-font-body"
                                        >
                                          {sug.emoji} {sug.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                <span
                                  className={`text-[10px] text-muted-foreground px-1 sk-font-body ${msg.sender === "user" ? "text-right" : "text-left"}`}
                                >
                                  {formatTime(msg.timestamp)}
                                </span>
                              </div>

                              {/* User avatar */}
                              {msg.sender === "user" && (
                                <div className="flex-shrink-0 mt-1">
                                  <div
                                    className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-bold text-white"
                                    style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}
                                  >
                                    {displayName.charAt(0).toUpperCase()}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                          <AnimatePresence>
                            {isStreaming && activeChat!.messages[activeChat!.messages.length - 1]?.sender !== "bot" && (
                              <div className="flex justify-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                  <div
                                    className="w-7 h-7 rounded-xl flex items-center justify-center"
                                    style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
                                  >
                                    <img src={sekaniLogo} alt="S" className="w-4 h-4 object-contain" />
                                  </div>
                                </div>
                                <TypingIndicator />
                              </div>
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
                          className="absolute -top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-lg text-xs text-muted-foreground hover:text-foreground transition-colors sk-font-body"
                        >
                          <ChevronDown className="w-3.5 h-3.5" /> Scroll to bottom
                        </button>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
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
          {teachMeActive && !viewerOpen && (
            <TeachMePanel
              session={teachMe.session}
              loading={teachMe.loading || (!teachMe.session && teachMeActive)}
              unitName={selectedUnit?.unit_name || ""}
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
              onSendMessage={(text) => handleSend(text)}
            />
          )}
        </AnimatePresence>

        {/* Sources Panel */}
        {sourcesOpen && selectedUnitId && selectedUnit && !viewerOpen && !teachMeActive && (
          <SourcesPanel
            unitId={selectedUnitId}
            unitName={`${selectedUnit.unit_code} — ${selectedUnit.unit_name}`}
            onClose={() => setSourcesOpen(false)}
          />
        )}

        {/* Right Units Panel (desktop) */}
        {!viewerOpen && !teachMeActive && !sourcesOpen && (
          <aside className="hidden md:flex flex-col w-[260px] flex-shrink-0 border-l border-border/50">
            {unitsPanelContent}
          </aside>
        )}
      </div>

      {/* Right Units Panel (mobile bottom sheet) */}
      <AnimatePresence>
        {mobileUnitsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileUnitsOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl border-t border-border md:hidden shadow-2xl"
              style={{ maxHeight: "88vh" }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="overflow-y-auto sk-scroll" style={{ maxHeight: "calc(88vh - 28px)" }}>
                {unitsPanelContent}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DIALOGS ── */}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="sk-font-display">Settings</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="account">
            <TabsList className="bg-muted w-full rounded-xl">
              <TabsTrigger value="account" className="flex-1 rounded-lg sk-font-body">
                Account
              </TabsTrigger>
              <TabsTrigger value="general" className="flex-1 rounded-lg sk-font-body">
                General
              </TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="space-y-4 mt-4">
              {[
                { label: "Name", value: profile?.name || "" },
                { label: "Email", value: profile?.email || "" },
                { label: "Program", value: profile?.program || "" },
                { label: "Admission #", value: profile?.admission_number || "Not set" },
                { label: "Course", value: profile?.course_name || "" },
                {
                  label: "Year / Semester",
                  value: `Year ${profile?.year || "-"} • Semester ${profile?.semester || "-"}`,
                },
              ].map((field) => (
                <div key={field.label} className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground sk-font-body">
                    {field.label}
                  </Label>
                  <Input value={field.value} readOnly className="rounded-xl sk-font-body" />
                </div>
              ))}
            </TabsContent>
            <TabsContent value="general" className="space-y-4 mt-4">
              {[
                { label: "Sound Notifications", desc: "Play sound for new messages" },
                { label: "Show Timestamps", desc: "Display time on messages" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium sk-font-body">{item.label}</p>
                    <p className="text-xs text-muted-foreground sk-font-body">{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
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
        <DialogContent className="backdrop-blur-xl bg-card/90 border-border/50 shadow-2xl max-w-md max-h-[90vh] overflow-y-auto rounded-3xl sk-scroll">
          {paymentVerifying ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-indigo-200" />
                <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
              </div>
              <p className="text-lg font-semibold sk-font-display">Verifying Payment…</p>
              <p className="text-sm text-muted-foreground text-center sk-font-body">
                {paymentMethod === "card"
                  ? "Complete payment in the new tab."
                  : "Check your phone for the M-Pesa prompt."}
                <br />
                We'll detect it automatically.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelPaymentPolling}
                className="mt-4 rounded-xl sk-font-body"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center sk-font-display">Upgrade to Premium</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground text-center sk-font-body">
                  You've reached your free daily limit. Upgrade to keep learning!
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { plan: "individual" as const, label: "Individual", price: "KES 129", users: "1 user" },
                    { plan: "group" as const, label: "Group", price: "KES 499", users: "5 users" },
                  ].map((opt) => (
                    <button
                      key={opt.plan}
                      onClick={() => setPaymentPlan(opt.plan)}
                      className={`border rounded-2xl p-4 text-center transition-all ${paymentPlan === opt.plan ? "border-2 border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/20" : "border-border"}`}
                    >
                      <p
                        className="text-[10px] font-bold uppercase tracking-wider sk-font-body"
                        style={{ color: paymentPlan === opt.plan ? "#6366f1" : undefined }}
                      >
                        {opt.label}
                      </p>
                      <p className="text-2xl font-bold mt-1 sk-font-display">{opt.price}</p>
                      <p className="text-xs text-muted-foreground sk-font-body">{opt.users}</p>
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground sk-font-body">
                  Unlimited tokens • One-time payment
                </p>

                {paymentPlan === "group" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium sk-font-body">Group Member Emails (5 required)</Label>
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
                        className={`text-sm rounded-xl sk-font-body ${i === 0 ? "bg-muted/50" : ""}`}
                      />
                    ))}
                  </div>
                )}

                <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
                  {[
                    { id: "mpesa" as const, label: "📱 M-Pesa" },
                    { id: "card" as const, label: "💳 Card" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all sk-font-body ${paymentMethod === m.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {paymentMethod === "mpesa" ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium sk-font-body">Phone Number (M-Pesa)</Label>
                    <Input
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      className="text-center text-lg tracking-wider rounded-xl sk-font-body"
                    />
                    <p className="text-xs text-muted-foreground text-center sk-font-body">
                      You'll receive an M-Pesa prompt on your phone
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2 sk-font-body">
                    You'll be redirected to a secure Paystack page to complete card payment.
                  </p>
                )}

                <Button
                  onClick={handlePayment}
                  disabled={
                    paymentLoading ||
                    (paymentMethod === "mpesa" && !paymentPhone.trim()) ||
                    (paymentPlan === "group" && groupEmails.slice(1).some((e) => !e.trim()))
                  }
                  className="w-full text-white font-semibold py-3 rounded-xl sk-font-body"
                  style={{ background: "linear-gradient(135deg,#1D2A3A,#b91c1c)" }}
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing…
                    </>
                  ) : (
                    `Pay KES ${paymentPlan === "group" ? "499" : "129"} via ${paymentMethod === "mpesa" ? "M-Pesa" : "Card"}`
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
