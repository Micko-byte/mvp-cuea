import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { useArtifacts } from "@/contexts/ArtifactContext";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
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
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutGrid,
  X,
  Code2,
  ChevronUp,
  User,
  CircleHelp,
  Mic,
  Globe,
  MessageSquare,
  Search,
  PenLine,
} from "lucide-react";
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
  {
    icon: ListChecks,
    label: "Assignments",
    prompt: "What assignments do I have pending this week?",
  },
  {
    icon: Calendar,
    label: "Schedule",
    prompt: "Show me my class schedule for this week",
  },
  {
    icon: Search,
    label: "Notes",
    prompt: "Help me find lecture notes for my current units",
  },
  {
    icon: PenLine,
    label: "Exams",
    prompt: "Help me prepare for my upcoming exams with study tips",
  },
];

const SIDEBAR_NAV = [{ icon: LayoutGrid, label: "Artifacts", key: "artifacts" }];

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
        <span className="text-xs text-muted-foreground ml-2">CUEA AI is thinking...</span>
      </div>
    </div>
  </motion.div>
);

const ChatPage = () => {
  const { user, profile, role, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const { chats, activeChat, isStreaming, createChat, setActiveChat, sendMessage, deleteChat, loadChats } = useChat();
  const { viewerOpen, addArtifact } = useArtifacts();
  const { nickname, getChatBg } = usePersonalization();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "projects">("chats");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileMenuOpen]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) loadChats();
  }, [isAuthenticated, loadChats]);

  // Listen for payment prompt event
  useEffect(() => {
    const handler = () => setShowPaymentDialog(true);
    window.addEventListener("show-payment-prompt", handler);
    return () => window.removeEventListener("show-payment-prompt", handler);
  }, []);

  // Check for payment callback in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      toast.success("Payment successful! 🎉 You now have 200,000 tokens/day. Thank you for supporting CUEA AI!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (payment === "failed") {
      toast.error("Payment was not completed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isStreaming]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
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
      if (dx > 0 && startX < 30 && !mobileSidebarOpen) {
        setMobileSidebarOpen(true);
      } else if (dx < 0 && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    },
    [mobileSidebarOpen],
  );

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || isStreaming) return;
    let chat = activeChat;
    if (!chat) {
      chat = await createChat();
      if (!chat) return;
    }
    setInput("");
    inputRef.current?.focus();
    await sendMessage(text, chat.id);
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
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setInput(finalTranscript + interim);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) {
        handleSend(finalTranscript.trim());
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  const handlePayment = async () => {
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
      });
      const data = await resp.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || "Failed to initialize payment");
      }
    } catch (e) {
      toast.error("Payment initialization failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSuggestion = async (prompt: string) => {
    let chat = activeChat;
    if (!chat) {
      chat = await createChat();
      if (!chat) return;
    }
    await sendMessage(prompt, chat.id);
  };

  const handleCreateArtifact = (content: string, language: string) => {
    let type: "code" | "html" | "svg" | "markdown" | "table" = "code";
    if (language === "html" || language === "htm") type = "html";
    else if (language === "svg") type = "svg";
    else if (language === "markdown" || language === "md") type = "markdown";
    else if (language === "csv") type = "table";
    addArtifact({ title: `${language.toUpperCase()} Snippet`, content, language, type });
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const displayName = nickname || profile?.name || user?.email?.split("@")[0] || "Student";

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarExpanded(!sidebarExpanded);
    }
  };

  const sidebarContent = (
    <>
      {/* Logo + Toggle */}
      <div className={`p-4 ${!sidebarExpanded && !isMobile ? "px-1.5 py-3" : ""}`}>
        {sidebarExpanded || isMobile ? (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-sidebar-primary" />
            </div>
            <span className="font-display font-bold text-sidebar-foreground text-lg">CUEA AI</span>
            <button
              onClick={toggleSidebar}
              className="ml-auto p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-sidebar-primary" />
            </div>
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* New Chat */}
        {sidebarExpanded || isMobile ? (
          <Button
            onClick={() => {
              createChat();
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
            onClick={() => createChat()}
            className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 p-0 flex items-center justify-center"
            size="icon"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Nav items */}
      {sidebarExpanded || isMobile ? (
        <div className="px-3 space-y-0.5">
          {SIDEBAR_NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setShowArtifacts(true);
                if (isMobile) setMobileSidebarOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/40 transition-colors"
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}

          {profile?.course_name && (
            <div className="px-3 py-2">
              <button
                onClick={() => setUnitsOpen(!unitsOpen)}
                className="flex items-center justify-between w-full text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-3 h-3" /> My Course
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${unitsOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {unitsOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-sidebar-foreground/80 pt-2 px-2">{profile.course_name}</p>
                    {profile.program && (
                      <p className="text-xs text-sidebar-foreground/50 px-2">
                        {profile.program} &bull; Year {profile.year} &bull; Sem {profile.semester}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="px-0 pt-2 flex gap-1">
            {(["chats", "projects"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors capitalize ${activeTab === tab ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/60"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-1 flex flex-col items-center gap-1">
          {SIDEBAR_NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setShowArtifacts(true)}
              className="p-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/40 transition-colors"
              title={item.label}
            >
              <item.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}

      {/* Recent Chats list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {sidebarExpanded || isMobile ? (
          activeTab === "chats" ? (
            <>
              <p className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/40 px-1 mb-2">
                Recent
              </p>
              {chats.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-sidebar-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-sidebar-foreground/30">No chats yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => {
                        setActiveChat(chat.id);
                        setShowArtifacts(false);
                        if (isMobile) setMobileSidebarOpen(false);
                      }}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${activeChat?.id === chat.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{chat.title}</span>
                        <span className="text-xs text-sidebar-foreground/30 block mt-0.5">
                          {chat.messages.length} messages
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteChatId(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <FolderOpen className="w-8 h-8 text-sidebar-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-sidebar-foreground/30">No projects yet</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center gap-1">
            {chats.slice(0, 8).map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${activeChat?.id === chat.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/50 hover:bg-sidebar-accent/40"}`}
                title={chat.title}
              >
                {chat.title.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        )}
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
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span>Admin Dashboard</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate("/personalization");
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>Personalization</span>
                </button>
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span>Settings</span>
                </button>
                <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors">
                  <CircleHelp className="w-4 h-4 text-muted-foreground" />
                  <span>Help</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
                </button>
                <div className="my-1.5" />
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors"
                >
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                  <span>Log out</span>
                </button>
              </div>
              <div className="px-4 py-2.5 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-popover-foreground truncate">{displayName}</p>
                    <p className="text-[10px] text-muted-foreground">{profile?.program || "Student"}</p>
                  </div>
                </div>
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
  const hasChatBg = !!chatBgStyle.backgroundImage;

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-sidebar flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarExpanded ? "w-[280px]" : "w-[56px]"}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
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

      {/* Main Content */}
      <div className="flex-1 flex min-w-0">
        <div
          className={`flex-1 flex flex-col min-w-0 relative ${viewerOpen ? "hidden md:flex" : ""}`}
          style={chatBgStyle}
        >
          {/* Header — no bottom border */}
          <header className="h-14 flex items-center px-4 flex-shrink-0 z-10 bg-background">
            <button onClick={toggleSidebar} className="p-2 hover:bg-foreground/10 rounded-lg mr-2 md:hidden">
              <PanelLeftOpen className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="font-display font-semibold text-foreground text-sm">
                {showArtifacts ? "Artifacts" : activeChat ? activeChat.title : "CUEA AI Assistant"}
              </h2>
            </div>
            <button
              onClick={() => setCalendarOpen(!calendarOpen)}
              className="p-2 hover:bg-foreground/10 rounded-lg"
              title="Academic Calendar"
            >
              <CalendarDays className="w-5 h-5 text-muted-foreground" />
            </button>
          </header>

          {showArtifacts ? (
            <div className="flex-1 overflow-y-auto">
              <ArtifactsPage />
            </div>
          ) : (() => {
            const isNewChat = !activeChat || activeChat.messages.length === 0;

            // Shared input — mic & attach hidden on mobile to keep send button fully visible
            const chatInput = (
              <div className="max-w-[680px] w-full mx-auto pointer-events-auto">
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {attachedFiles.map((file, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs bg-card border border-border px-2 py-1 rounded-lg"
                      >
                        {file.type.startsWith("image/") ? (
                          <ImageIcon className="w-3 h-3" />
                        ) : (
                          <File className="w-3 h-3" />
                        )}
                        <span className="max-w-[120px] truncate">{file.name}</span>
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
                  className="flex items-center gap-1 rounded-[30px] px-2 py-1.5 bg-[hsl(var(--chat-input-bg))]"
                  style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.15)" }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                      e.target.value = "";
                    }}
                  />
                  {/* Attach — desktop only */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Ask CUEA AI anything..."
                    className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground py-2 px-2"
                    disabled={isStreaming}
                  />
                  {/* Mic — desktop only */}
                  <div
                    className="hidden sm:block relative flex-shrink-0"
                    title={
                      !speechSupported
                        ? "Voice input isn't supported on this browser"
                        : isListening
                          ? "Stop recording"
                          : "Voice input"
                    }
                  >
                    <button
                      onClick={toggleVoice}
                      disabled={!speechSupported}
                      className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0 relative ${isListening ? "text-primary bg-primary/20 mic-pulse-ring" : "text-muted-foreground hover:text-primary hover:bg-primary/10"} ${!speechSupported ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Send — always visible, sized to fit snugly */}
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isStreaming}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex-shrink-0 disabled:opacity-40"
                  >
                    {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );

            return (
              <>
                <div className="flex-1 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {isNewChat ? (
                      <motion.div
                        key="new-chat"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="flex flex-col items-center justify-center h-full px-4"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center mb-6"
                        >
                          <div className="w-20 h-20 rounded-3xl bg-gradient-maroon flex items-center justify-center mx-auto mb-6 shadow-glow">
                            <Sparkles className="w-10 h-10 text-primary-foreground" />
                          </div>
                          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                            {greeting}, {displayName.split(" ")[0]}
                          </h2>
                          <p className="text-muted-foreground">How can I help you with your studies today?</p>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="w-full px-4 md:px-0"
                        >
                          {chatInput}
                        </motion.div>

                        {/* Suggestion pills — icon left, label, no subtitle, 30px radius, auto-size */}
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
                      </motion.div>
                    ) : (
                      <motion.div
                        key="active-chat"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-4"
                      >
                        {activeChat!.messages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div className="flex flex-col gap-1 max-w-[85%]">
                              {(() => {
                                const chatBg = getChatBg();
                                const hasCustomBg = chatBg && chatBg.url;
                                const bubbleStyle = hasCustomBg
                                  ? msg.sender === "user"
                                    ? { background: chatBg.userBubble, color: chatBg.userText }
                                    : { background: chatBg.botBubble, color: chatBg.botText }
                                  : undefined;
                                const bubbleClass = hasCustomBg
                                  ? `px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.sender === "user" ? "rounded-br-md" : "rounded-bl-md"}`
                                  : `px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.sender === "user" ? "bg-gradient-maroon text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`;
                                return (
                                  <div className={bubbleClass} style={bubbleStyle}>
                                    {msg.sender === "bot" && (
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-xs font-semibold text-primary">CUEA AI</span>
                                      </div>
                                    )}
                                    {msg.sender === "bot" ? (
                                      <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <ReactMarkdown
                                          components={{
                                            code({ className, children, ...props }) {
                                              const match = /language-(\w+)/.exec(className || "");
                                              const lang = match ? match[1] : "";
                                              const codeStr = String(children).replace(/\n$/, "");
                                              const isBlock = codeStr.includes("\n") || lang;
                                              if (isBlock) {
                                                return (
                                                  <div className="relative group/code">
                                                    <pre className="bg-card border border-border rounded-lg p-3 overflow-x-auto">
                                                      <code className={className} {...props}>
                                                        {children}
                                                      </code>
                                                    </pre>
                                                    <button
                                                      onClick={() => handleCreateArtifact(codeStr, lang || "text")}
                                                      className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md"
                                                    >
                                                      <Code2 className="w-3 h-3" /> Open as Artifact
                                                    </button>
                                                  </div>
                                                );
                                              }
                                              return (
                                                <code className={className} {...props}>
                                                  {children}
                                                </code>
                                              );
                                            },
                                          }}
                                        >
                                          {msg.text || "..."}
                                        </ReactMarkdown>
                                      </div>
                                    ) : (
                                      msg.text
                                    )}
                                  </div>
                                );
                              })()}
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
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="absolute bottom-4 left-0 right-0 z-20 px-4 pointer-events-none"
                    style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                  >
                    {chatInput}
                  </motion.div>
                )}
              </>
            );
          })()}
        </div>

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
      </div>

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
                <Input value={profile?.admission_number || ""} readOnly />
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
        onOpenChange={(open) => { if (!open) setDeleteChatId(null); }}
        title="Delete Chat?"
        description="This will permanently delete this conversation. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteChatId) deleteChat(deleteChatId);
          setDeleteChatId(null);
        }}
      />

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Log Out?"
        description="Are you sure you want to log out of your account?"
        confirmLabel="Log Out"
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout();
          navigate("/");
        }}
      />

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Upgrade to CUEA AI Premium 🎓</DialogTitle>
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
              <p className="text-xs text-muted-foreground">One-time payment • Supports CUEA AI infrastructure</p>
            </div>
            <Button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="w-full text-white font-semibold py-3"
              style={{ backgroundColor: "#800000" }}
            >
              {paymentLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
              ) : (
                "Pay KES 200 with Paystack"
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Your funds support us to build and improve CUEA AI services
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage;
