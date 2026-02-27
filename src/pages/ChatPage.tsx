import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus, Send, BookOpen, Calendar, FileText, ClipboardList,
  Menu, X, LogOut, Trash2, GraduationCap, ChevronDown, Mic, Paperclip,
  Settings, User, CreditCard, Palette, HelpCircle, FolderOpen, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const SUGGESTIONS = [
  { icon: ClipboardList, label: "Assignments", desc: "Check pending assignments", prompt: "What assignments do I have pending this week?" },
  { icon: Calendar, label: "Schedule", desc: "View class timetable", prompt: "Show me my class schedule for this week" },
  { icon: FileText, label: "Notes", desc: "Access lecture notes", prompt: "Help me find lecture notes for my current units" },
  { icon: BookOpen, label: "Exams", desc: "Exam preparation", prompt: "Help me prepare for my upcoming exams with study tips" },
];

const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex justify-start"
  >
    <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
      <div className="flex items-center gap-1.5">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground/50"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-2">CUEA AI is thinking...</span>
      </div>
    </div>
  </motion.div>
);

const ChatPage = () => {
  const { user, logout } = useAuth();
  const { chats, activeChat, createChat, setActiveChat, sendMessage, deleteChat } = useChat();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "projects">("chats");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (!activeChat) createChat();
    setIsTyping(true);
    setTimeout(() => {
      sendMessage(input.trim());
      setTimeout(() => setIsTyping(false), 1200);
    }, 50);
    setInput("");
    inputRef.current?.focus();
  };

  const handleSuggestion = (prompt: string) => {
    if (!activeChat) createChat();
    setIsTyping(true);
    setTimeout(() => {
      sendMessage(prompt);
      setTimeout(() => setIsTyping(false), 1200);
    }, 50);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-[280px] flex-shrink-0 bg-sidebar flex flex-col border-r border-sidebar-border"
          >
            {/* Header */}
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-sidebar-primary" />
                </div>
                <span className="font-display font-bold text-sidebar-foreground text-lg">CUEA AI</span>
              </div>
              <Button
                onClick={() => { createChat(); }}
                className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 justify-start gap-2"
                size="sm"
              >
                <MessageSquarePlus className="w-4 h-4" /> New Chat
              </Button>
            </div>

            {/* Tabs */}
            <div className="px-4 pt-3 flex gap-1">
              <button
                onClick={() => setActiveTab("chats")}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
                  activeTab === "chats" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/60"
                }`}
              >
                Chats
              </button>
              <button
                onClick={() => setActiveTab("projects")}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
                  activeTab === "projects" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/60"
                }`}
              >
                Projects
              </button>
            </div>

            {/* Units */}
            {user?.selectedUnits && user.selectedUnits.length > 0 && (
              <div className="px-4 py-3 border-b border-sidebar-border">
                <button
                  onClick={() => setUnitsOpen(!unitsOpen)}
                  className="flex items-center justify-between w-full text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3 h-3" /> My Units ({user.selectedUnits.length})
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${unitsOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {unitsOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="pt-2 space-y-1">
                        {user.selectedUnits.map((unit) => (
                          <div key={unit} className="text-sm text-sidebar-foreground/80 py-1.5 px-2 rounded-md hover:bg-sidebar-accent/50 cursor-pointer flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-sidebar-foreground/30" />
                            {unit}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Chat/Projects List */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {activeTab === "chats" ? (
                <>
                  <p className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/40 px-1 mb-2">Recent</p>
                  {chats.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquarePlus className="w-8 h-8 text-sidebar-foreground/20 mx-auto mb-2" />
                      <p className="text-sm text-sidebar-foreground/30">No chats yet</p>
                      <p className="text-xs text-sidebar-foreground/20 mt-1">Start a conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {chats.map((chat) => (
                        <div
                          key={chat.id}
                          onClick={() => setActiveChat(chat.id)}
                          className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                            activeChat?.id === chat.id
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">{chat.title}</span>
                            <span className="text-xs text-sidebar-foreground/30 block mt-0.5">
                              {chat.messages.length} messages
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
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
                  <p className="text-xs text-sidebar-foreground/20 mt-1">Create your first project</p>
                  <Button size="sm" variant="outline" className="mt-3 text-sidebar-foreground/60 border-sidebar-border hover:bg-sidebar-accent/50">
                    New Project
                  </Button>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="p-4 border-t border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-bold text-sidebar-accent-foreground">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-sidebar-foreground/50 truncate">{user?.courseName || user?.role}</p>
                </div>
                <button onClick={() => setSettingsOpen(true)} className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1">
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => { logout(); navigate("/"); }} className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center px-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-lg mr-2">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1">
            <h2 className="font-display font-semibold text-foreground text-sm">
              {activeChat ? activeChat.title : "CUEA AI Assistant"}
            </h2>
            {activeChat && (
              <p className="text-xs text-muted-foreground">{activeChat.messages.length} messages</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-lg">
                <div className="w-20 h-20 rounded-3xl bg-gradient-maroon flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <GraduationCap className="w-10 h-10 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  {getGreeting()}, {user?.name?.split(" ")[0]}! 👋
                </h2>
                <p className="text-muted-foreground mb-8">How can I help you with your studies today?</p>
                <div className="grid grid-cols-2 gap-3">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      onClick={() => handleSuggestion(s.prompt)}
                      className="p-4 rounded-xl border border-border bg-card hover:shadow-card hover:-translate-y-0.5 transition-all text-left group"
                    >
                      <s.icon className="w-5 h-5 mb-2 text-primary" />
                      <p className="font-display font-semibold text-sm text-foreground">{s.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                    </motion.button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3" /> Powered by AI trained on CUEA curriculum
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
              {activeChat.messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i === activeChat.messages.length - 1 ? 0 : 0 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex flex-col gap-1">
                    <div
                      className={`max-w-[420px] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-gradient-maroon text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.sender === "bot" && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-semibold text-primary">CUEA AI</span>
                        </div>
                      )}
                      {msg.text}
                    </div>
                    <span className={`text-[10px] text-muted-foreground px-1 ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </motion.div>
              ))}
              <AnimatePresence>
                {isTyping && <TypingIndicator />}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <button className="p-2.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Ask CUEA AI anything..."
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all placeholder:text-muted-foreground/60"
                />
              </div>
              <button className="p-2.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors">
                <Mic className="w-5 h-5" />
              </button>
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="icon"
                className="bg-gradient-maroon hover:opacity-90 rounded-xl h-11 w-11 flex-shrink-0 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
              CUEA AI may produce inaccurate information. Always verify with your lecturers.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Settings</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general">
            <TabsList className="bg-muted w-full">
              <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
              <TabsTrigger value="account" className="flex-1">Account</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Sound Notifications</p>
                  <p className="text-xs text-muted-foreground">Play sound for new messages</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Compact Messages</p>
                  <p className="text-xs text-muted-foreground">Reduce spacing between messages</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Show Timestamps</p>
                  <p className="text-xs text-muted-foreground">Display time on messages</p>
                </div>
                <Switch defaultChecked />
              </div>
            </TabsContent>
            <TabsContent value="account" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Name</Label>
                <Input defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</Label>
                <Input defaultValue={user?.email} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Program</Label>
                <Input defaultValue={user?.program || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Admission Number</Label>
                <Input defaultValue={user?.admissionNumber || ""} disabled />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage;
