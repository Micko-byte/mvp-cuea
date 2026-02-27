import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus, Send, BookOpen, Calendar, FileText, ClipboardList,
  Menu, X, LogOut, Trash2, GraduationCap, ChevronDown, Mic, Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  { icon: ClipboardList, label: "Assignments", desc: "Check pending assignments", color: "text-info" },
  { icon: Calendar, label: "Schedule", desc: "View class timetable", color: "text-success" },
  { icon: FileText, label: "Notes", desc: "Access lecture notes", color: "text-warning" },
  { icon: BookOpen, label: "Exams", desc: "Exam preparation tips", color: "text-destructive" },
];

const ChatPage = () => {
  const { user, logout } = useAuth();
  const { chats, activeChat, createChat, setActiveChat, sendMessage, deleteChat } = useChat();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (!activeChat) createChat();
    // small delay to ensure chat is created
    setTimeout(() => sendMessage(input.trim()), 50);
    setInput("");
  };

  const handleSuggestion = (text: string) => {
    if (!activeChat) createChat();
    setTimeout(() => sendMessage(text), 50);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
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
            {/* Sidebar Header */}
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-sidebar-primary" />
                </div>
                <span className="font-display font-bold text-sidebar-foreground text-lg">CUEA AI</span>
              </div>
              <Button
                onClick={createChat}
                className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 justify-start gap-2"
                size="sm"
              >
                <MessageSquarePlus className="w-4 h-4" /> New Chat
              </Button>
            </div>

            {/* Units */}
            {user?.selectedUnits && user.selectedUnits.length > 0 && (
              <div className="px-4 py-3 border-b border-sidebar-border">
                <button
                  onClick={() => setUnitsOpen(!unitsOpen)}
                  className="flex items-center justify-between w-full text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/60"
                >
                  My Units
                  <ChevronDown className={`w-3 h-3 transition-transform ${unitsOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {unitsOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="pt-2 space-y-1">
                        {user.selectedUnits.map((unit) => (
                          <div key={unit} className="text-sm text-sidebar-foreground/80 py-1 px-2 rounded hover:bg-sidebar-accent/50 cursor-pointer">
                            {unit}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <p className="text-xs uppercase tracking-wider font-semibold text-sidebar-foreground/40 px-1 mb-2">Recent Chats</p>
              {chats.length === 0 ? (
                <p className="text-sm text-sidebar-foreground/30 px-1">No chats yet</p>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => setActiveChat(chat.id)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                        activeChat?.id === chat.id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40"
                      }`}
                    >
                      <span className="truncate flex-1">{chat.title}</span>
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
            </div>

            {/* Profile */}
            <div className="p-4 border-t border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-accent-foreground">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-sidebar-foreground/50 truncate">{user?.courseName || user?.role}</p>
                </div>
                <button onClick={() => { logout(); navigate("/"); }} className="text-sidebar-foreground/40 hover:text-sidebar-foreground">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center px-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-lg mr-2">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h2 className="font-display font-semibold text-foreground">
            {activeChat ? activeChat.title : "CUEA AI Assistant"}
          </h2>
        </header>

        {/* Messages / Welcome */}
        <div className="flex-1 overflow-y-auto">
          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-lg">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <GraduationCap className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  {getGreeting()}, {user?.name?.split(" ")[0]}!
                </h2>
                <p className="text-muted-foreground mb-8">How can I help you with your studies today?</p>
                <div className="grid grid-cols-2 gap-3">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSuggestion(`Help me with my ${s.label.toLowerCase()}`)}
                      className="p-4 rounded-xl border border-border bg-card hover:shadow-card hover:-translate-y-0.5 transition-all text-left group"
                    >
                      <s.icon className={`w-5 h-5 mb-2 ${s.color}`} />
                      <p className="font-display font-semibold text-sm text-foreground">{s.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
              {activeChat.messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-gradient-maroon text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <button className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask CUEA AI anything..."
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
              />
            </div>
            <button className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
              <Mic className="w-5 h-5" />
            </button>
            <Button onClick={handleSend} size="icon" className="bg-gradient-maroon hover:opacity-90 rounded-xl h-11 w-11 flex-shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
