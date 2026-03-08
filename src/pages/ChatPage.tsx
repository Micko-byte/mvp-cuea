import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { useArtifacts } from "@/contexts/ArtifactContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  MessageSquarePlus,
  Send,
  BookOpen,
  Calendar,
  FileText,
  ClipboardList,
  LogOut,
  Trash2,
  GraduationCap,
  ChevronDown,
  Paperclip,
  Settings,
  FolderOpen,
  Sparkles,
  Loader2,
  Shield,
  Image as ImageIcon,
  File,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutTemplate,
  X,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AcademicCalendar } from "@/components/AcademicCalendar";
import ArtifactViewer from "@/components/ArtifactViewer";
import { getTimeBasedGreeting } from "@/utils/greetings";

const SUGGESTIONS = [
  { icon: ClipboardList, label: "Assignments", desc: "Check pending assignments", prompt: "What assignments do I have pending this week?" },
  { icon: Calendar, label: "Schedule", desc: "View class timetable", prompt: "Show me my class schedule for this week" },
  { icon: FileText, label: "Notes", desc: "Access lecture notes", prompt: "Help me find lecture notes for my current units" },
  { icon: BookOpen, label: "Exams", desc: "Exam preparation", prompt: "Help me prepare for my upcoming exams with study tips" },
];

const SIDEBAR_NAV = [
  { icon: LayoutTemplate, label: "Artifacts", path: "/artifacts" },
];

const TypingIndicator = () => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
    <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="w-2 h-2 rounded-full bg-muted-foreground/50" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
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
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "projects">("chats");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Greeting memoized per mount
  const greeting = useMemo(() => getTimeBasedGreeting(), []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) loadChats();
  }, [isAuthenticated, loadChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isStreaming]);

  // Swipe gesture handlers for mobile
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    const startX = touchStartRef.current.x;
    touchStartRef.current = null;

    // Minimum 50px horizontal, less than 100px vertical
    if (Math.abs(dx) < 50 || dy > 100) return;

    if (dx > 0 && startX < 30 && !mobileSidebarOpen) {
      setMobileSidebarOpen(true);
    } else if (dx < 0 && mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  }, [mobileSidebarOpen]);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    let chat = activeChat;
    if (!chat) {
      chat = await createChat();
      if (!chat) return;
    }
    const text = input.trim();
    setInput("");
    inputRef.current?.focus();
    await sendMessage(text, chat.id);
  };

  const handleSuggestion = async (prompt: string) => {
    let chat = activeChat;
    if (!chat) {
      chat = await createChat();
      if (!chat) return;
    }
    await sendMessage(prompt, chat.id);
  };

  // Detect code blocks in bot messages and offer artifact creation
  const handleCreateArtifact = (content: string, language: string) => {
    let type: "code" | "html" | "svg" | "markdown" | "table" = "code";
    if (language === "html" || language === "htm") type = "html";
    else if (language === "svg") type = "svg";
    else if (language === "markdown" || language === "md") type = "markdown";
    else if (language === "csv") type = "table";

    addArtifact({
      title: `${language.toUpperCase()} Snippet`,
      content,
      language,
      type,
    });
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const displayName = profile?.name || user?.email?.split("@")[0] || "Student";

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

  /* ─── Sidebar content (shared desktop/mobile) ─── */
  const sidebarContent = (
    <>
      {/* Header */}
      <div className={`p-4 border-b border-sidebar-border ${!sidebarExpanded && !isMobile ? "px-2" : ""}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-sidebar-primary" />
          </div>
          {(sidebarExpanded || isMobile) && (
            <span className="font-display font-bold text-sidebar-foreground text-lg">CUEA AI</span>
          )}
          <button
            onClick={toggleSidebar}
            className="ml-auto p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarExpanded || isMobile ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>
        {(sidebarExpanded || isMobile) ? (
          <Button onClick={() => { createChat(); if (isMobile) setMobileSidebarOpen(false); }} className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 justify-start gap-2" size="sm">
            <MessageSquarePlus className="w-4 h-4" /> New Chat
          </Button>
        ) : (
          <Button onClick={() => createChat()} className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 p-0 flex items-center justify-center" size="icon">
            <MessageSquarePlus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Nav items */}
      {(sidebarExpanded || isMobile) && (
        <div className="px-3 pt-3">
          {SIDEBAR_NAV.map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); if (isMobile) setMobileSidebarOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/40 transition-colors"
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
      {!sidebarExpanded && !isMobile && (
        <div className="px-1 pt-3 flex flex-col items-center gap-1">
          {SIDEBAR_NAV.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="p-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/40 transition-colors"
              title={item.label}
            >
              <item.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      {(sidebarExpanded || isMobile) && (
        <div className="px-4 pt-3 flex gap-1">
          {(["chats", "projects"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors capitalize ${activeTab === tab ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/60"}`}>
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Course info */}
      {(sidebarExpanded || isMobile) && profile?.course_name && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <button onClick={() => setUnitsOpen(!unitsOpen)} className="flex items-center justify-between w-full text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60">
            <span className="flex items-center gap-2"><BookOpen className="w-3 h-3" /> My Course</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${unitsOpen ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {unitsOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <p className="text-sm text-sidebar-foreground/80 pt-2 px-2">{profile.course_name}</p>
                {profile.program && <p className="text-xs text-sidebar-foreground/50 px-2">{profile.program} &bull; Year {profile.year} &bull; Sem {profile.semester}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {(sidebarExpanded || isMobile) ? (
          activeTab === "chats" ? (
            <>
              <p className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/40 px-1 mb-2">Recent</p>
              {chats.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquarePlus className="w-8 h-8 text-sidebar-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-sidebar-foreground/30">No chats yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <div key={chat.id} onClick={() => { setActiveChat(chat.id); if (isMobile) setMobileSidebarOpen(false); }} className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${activeChat?.id === chat.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40"}`}>
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{chat.title}</span>
                        <span className="text-xs text-sidebar-foreground/30 block mt-0.5">{chat.messages.length} messages</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive">
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
          /* Collapsed: show chat icons */
          <div className="flex flex-col items-center gap-1">
            {chats.slice(0, 8).map((chat) => (
              <button key={chat.id} onClick={() => setActiveChat(chat.id)} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${activeChat?.id === chat.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/50 hover:bg-sidebar-accent/40"}`} title={chat.title}>
                {chat.title.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t border-sidebar-border ${!sidebarExpanded && !isMobile ? "px-2" : ""}`}>
        <div className={`flex items-center ${sidebarExpanded || isMobile ? "gap-3" : "flex-col gap-2"}`}>
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold text-sidebar-accent-foreground flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          {(sidebarExpanded || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.course_name || "Student"}</p>
            </div>
          )}
          {(sidebarExpanded || isMobile) && role === "admin" && (
            <button onClick={() => navigate("/admin")} className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1" title="Admin Dashboard">
              <Shield className="w-4 h-4" />
            </button>
          )}
          {(sidebarExpanded || isMobile) ? (
            <>
              <button onClick={() => setSettingsOpen(true)} className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1"><Settings className="w-4 h-4" /></button>
              <button onClick={async () => { await logout(); navigate("/"); }} className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1"><LogOut className="w-4 h-4" /></button>
            </>
          ) : (
            <>
              <button onClick={() => setSettingsOpen(true)} className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1" title="Settings"><Settings className="w-4 h-4" /></button>
              <button onClick={async () => { await logout(); navigate("/"); }} className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1" title="Logout"><LogOut className="w-4 h-4" /></button>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-sidebar border-r border-sidebar-border flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarExpanded ? "w-[280px]" : "w-[56px]"}`}
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
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col min-w-0 ${viewerOpen ? "hidden md:flex" : ""}`}>
          <header className="h-14 flex items-center px-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
            <button onClick={toggleSidebar} className="p-2 hover:bg-muted rounded-lg mr-2 md:hidden">
              <PanelLeftOpen className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="font-display font-semibold text-foreground text-sm">
                {activeChat ? activeChat.title : "CUEA AI Assistant"}
              </h2>
            </div>
            <button onClick={() => setCalendarOpen(!calendarOpen)} className="p-2 hover:bg-muted rounded-lg" title="Academic Calendar">
              <CalendarDays className="w-5 h-5 text-muted-foreground" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">
            {!activeChat || activeChat.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-lg">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-maroon flex items-center justify-center mx-auto mb-6 shadow-glow">
                    <GraduationCap className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                    {greeting}, {displayName.split(" ")[0]}
                  </h2>
                  <p className="text-muted-foreground mb-8">How can I help you with your studies today?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} onClick={() => handleSuggestion(s.prompt)} className="p-4 rounded-xl border border-border bg-card hover:shadow-card hover:-translate-y-0.5 transition-all text-left">
                        <s.icon className="w-5 h-5 mb-2 text-primary" />
                        <p className="font-display font-semibold text-sm text-foreground">{s.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
                {activeChat.messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="flex flex-col gap-1 max-w-[85%]">
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.sender === "user" ? "bg-gradient-maroon text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                        {msg.sender === "bot" && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-primary" />
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
                                          <code className={className} {...props}>{children}</code>
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
                                  return <code className={className} {...props}>{children}</code>;
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
                      <span className={`text-[10px] text-muted-foreground px-1 ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </motion.div>
                ))}
                <AnimatePresence>
                  {isStreaming && activeChat.messages[activeChat.messages.length - 1]?.sender !== "bot" && <TypingIndicator />}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv" className="hidden" onChange={(e) => { if (e.target.files) setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]); e.target.value = ""; }} />
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted">
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {attachedFiles.map((file, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-lg border border-border">
                          {file.type.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <File className="w-3 h-3" />}
                          <span className="max-w-[120px] truncate">{file.name}</span>
                          <button onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder="Ask CUEA AI anything..." className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all" disabled={isStreaming} />
                </div>
                <Button onClick={handleSend} disabled={!input.trim() || isStreaming} size="icon" className="bg-gradient-maroon hover:opacity-90 rounded-xl h-11 w-11 flex-shrink-0 disabled:opacity-40">
                  {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-center mt-2">CUEA AI may produce inaccurate information. Always verify with your lecturers.</p>
            </div>
          </div>
        </div>

        {/* Artifact Viewer Panel (desktop) */}
        {viewerOpen && (
          <div className="hidden md:flex w-[45%] min-w-[300px] max-w-[600px]">
            <ArtifactViewer />
          </div>
        )}

        {/* Artifact Viewer (mobile fullscreen) */}
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
              <TabsTrigger value="account" className="flex-1">Account</TabsTrigger>
              <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="space-y-4 mt-4">
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Name</Label><Input value={profile?.name || ""} readOnly /></div>
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</Label><Input value={profile?.email || ""} readOnly /></div>
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Program</Label><Input value={profile?.program || ""} readOnly /></div>
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Admission #</Label><Input value={profile?.admission_number || ""} readOnly /></div>
            </TabsContent>
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Sound Notifications</p><p className="text-xs text-muted-foreground">Play sound for new messages</p></div><Switch defaultChecked /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Show Timestamps</p><p className="text-xs text-muted-foreground">Display time on messages</p></div><Switch defaultChecked /></div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AcademicCalendar open={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </div>
  );
};

export default ChatPage;
