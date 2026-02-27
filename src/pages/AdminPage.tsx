import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, BookOpen, FileText, BarChart3, Activity,
  Bell, Settings, LogOut, GraduationCap, Menu, X, TrendingUp, TrendingDown,
  UserCheck, BookMarked, AlertTriangle, CheckCircle, Clock, Upload, Search,
  Download, Eye, Trash2, Plus, Shield, Database, Globe, Key, Save,
  Filter, MoreVertical, Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "courses", label: "Courses & Units", icon: BookOpen },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "health", label: "System Health", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

const METRICS = [
  { label: "Active Users", value: "1,247", change: "+12.5%", up: true, icon: UserCheck, color: "text-success" },
  { label: "Total Courses", value: "86", change: "+3", up: true, icon: BookMarked, color: "text-info" },
  { label: "Chat Sessions", value: "3,841", change: "+28.3%", up: true, icon: BarChart3, color: "text-primary" },
  { label: "Avg Response", value: "1.2s", change: "-0.3s", up: true, icon: Clock, color: "text-warning" },
];

const RECENT_ACTIVITY = [
  { text: "New student registered: Mary Achieng", time: "2 min ago", type: "info" },
  { text: "Course 'Data Structures' updated by Dr. Omondi", time: "15 min ago", type: "success" },
  { text: "High API latency detected (>2s)", time: "1 hour ago", type: "warning" },
  { text: "Backup completed successfully", time: "3 hours ago", type: "success" },
  { text: "5 new materials uploaded for CS301", time: "5 hours ago", type: "info" },
];

const HEALTH_SERVICES = [
  { name: "Database", status: "healthy", latency: "45ms", uptime: "99.9%" },
  { name: "API Server", status: "healthy", latency: "120ms", uptime: "99.8%" },
  { name: "File Storage", status: "warning", latency: "890ms", uptime: "98.5%" },
  { name: "AI Service", status: "healthy", latency: "340ms", uptime: "99.7%" },
];

const DEMO_USERS = [
  { name: "John Mwangi", email: "john@students.cuea.edu", role: "Student", status: "Active", lastLogin: "Today", sessions: 45 },
  { name: "Mary Achieng", email: "mary@students.cuea.edu", role: "Student", status: "Active", lastLogin: "Today", sessions: 32 },
  { name: "Dr. Omondi", email: "omondi@cuea.edu", role: "Lecturer", status: "Active", lastLogin: "Yesterday", sessions: 18 },
  { name: "Prof. Njeri", email: "njeri@cuea.edu", role: "Admin", status: "Active", lastLogin: "Today", sessions: 67 },
  { name: "Peter Kamau", email: "peter@students.cuea.edu", role: "Student", status: "Inactive", lastLogin: "2 weeks ago", sessions: 3 },
  { name: "Grace Wanjiku", email: "grace@students.cuea.edu", role: "Student", status: "Active", lastLogin: "Today", sessions: 28 },
  { name: "Dr. Kipchoge", email: "kipchoge@cuea.edu", role: "Lecturer", status: "Active", lastLogin: "Today", sessions: 22 },
];

const DEMO_DOCUMENTS = [
  { name: "Data Structures Notes Ch.1-5", unit: "CS201", type: "PDF", size: "2.4 MB", uploadedBy: "Dr. Omondi", date: "Feb 25, 2026", downloads: 156 },
  { name: "Algorithm Analysis Tutorial", unit: "CS301", type: "DOCX", size: "1.1 MB", uploadedBy: "Dr. Kipchoge", date: "Feb 24, 2026", downloads: 89 },
  { name: "Database Design Slides", unit: "CS202", type: "PPTX", size: "5.8 MB", uploadedBy: "Prof. Njeri", date: "Feb 23, 2026", downloads: 203 },
  { name: "Operating Systems Lab Manual", unit: "CS305", type: "PDF", size: "3.2 MB", uploadedBy: "Dr. Omondi", date: "Feb 22, 2026", downloads: 94 },
  { name: "Software Engineering Case Study", unit: "CS401", type: "PDF", size: "1.7 MB", uploadedBy: "Dr. Kipchoge", date: "Feb 20, 2026", downloads: 67 },
  { name: "Computer Networks Exam 2025", unit: "CS303", type: "PDF", size: "0.8 MB", uploadedBy: "Prof. Njeri", date: "Feb 18, 2026", downloads: 312 },
];

const COURSES_DATA = [
  { name: "Computer Science", code: "CS", units: 24, students: 186, faculty: "Science & Technology" },
  { name: "Law", code: "LAW", units: 18, students: 142, faculty: "Law" },
  { name: "Education", code: "EDU", units: 20, students: 231, faculty: "Education" },
  { name: "Commerce", code: "COM", units: 16, students: 198, faculty: "Commerce" },
  { name: "Theology", code: "THEO", units: 14, students: 87, faculty: "Theology" },
  { name: "Arts", code: "ARTS", units: 22, students: 156, faculty: "Arts & Social Sciences" },
];

// Chart data
const userGrowthData = [
  { month: "Sep", students: 820, lecturers: 45 },
  { month: "Oct", students: 890, lecturers: 48 },
  { month: "Nov", students: 950, lecturers: 50 },
  { month: "Dec", students: 920, lecturers: 50 },
  { month: "Jan", students: 1100, lecturers: 55 },
  { month: "Feb", students: 1247, lecturers: 58 },
];

const usageData = [
  { day: "Mon", sessions: 450, queries: 1200 },
  { day: "Tue", sessions: 520, queries: 1450 },
  { day: "Wed", sessions: 480, queries: 1300 },
  { day: "Thu", sessions: 560, queries: 1600 },
  { day: "Fri", sessions: 420, queries: 1100 },
  { day: "Sat", sessions: 280, queries: 750 },
  { day: "Sun", sessions: 220, queries: 600 },
];

const coursePopularityData = [
  { name: "CS", value: 186, color: "hsl(345, 100%, 25%)" },
  { name: "EDU", value: 231, color: "hsl(210, 100%, 50%)" },
  { name: "COM", value: 198, color: "hsl(142, 70%, 40%)" },
  { name: "LAW", value: 142, color: "hsl(36, 100%, 50%)" },
  { name: "ARTS", value: 156, color: "hsl(280, 60%, 50%)" },
  { name: "THEO", value: 87, color: "hsl(0, 0%, 50%)" },
];

const responseTimeData = [
  { time: "00:00", value: 1.1 },
  { time: "04:00", value: 0.9 },
  { time: "08:00", value: 1.4 },
  { time: "12:00", value: 1.8 },
  { time: "16:00", value: 1.5 },
  { time: "20:00", value: 1.2 },
  { time: "23:59", value: 1.0 },
];

const AdminPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);

  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  const filteredUsers = DEMO_USERS.filter(
    (u) => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredDocs = DEMO_DOCUMENTS.filter(
    (d) => d.name.toLowerCase().includes(docSearch.toLowerCase()) || d.unit.toLowerCase().includes(docSearch.toLowerCase())
  );

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {METRICS.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-xl border border-border p-5 shadow-card hover:-translate-y-0.5 transition-transform"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{m.label}</p>
                      <p className="text-2xl font-display font-bold text-foreground mt-1">{m.value}</p>
                    </div>
                    <div className={`p-2 rounded-lg bg-muted ${m.color}`}>
                      <m.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3">
                    {m.up ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                    <span className={`text-xs font-semibold ${m.up ? "text-success" : "text-destructive"}`}>{m.change}</span>
                    <span className="text-xs text-muted-foreground">vs last week</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quick Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">User Growth</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={userGrowthData}>
                    <defs>
                      <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(345, 100%, 25%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(345, 100%, 25%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(345, 10%, 88%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" />
                    <Tooltip />
                    <Area type="monotone" dataKey="students" stroke="hsl(345, 100%, 25%)" fill="url(#colorStudents)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">Weekly Usage</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(345, 10%, 88%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" />
                    <Tooltip />
                    <Bar dataKey="sessions" fill="hsl(345, 100%, 25%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="queries" fill="hsl(345, 30%, 75%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {RECENT_ACTIVITY.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        a.type === "success" ? "bg-success" : a.type === "warning" ? "bg-warning" : "bg-info"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{a.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-foreground">System Health</h3>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-sm font-medium text-success">Operational</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {HEALTH_SERVICES.map((s) => (
                    <div key={s.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          s.status === "healthy" ? "bg-success" : s.status === "warning" ? "bg-warning animate-pulse" : "bg-destructive"
                        }`} />
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                      </div>
                      <span className={`text-sm ${s.status === "warning" ? "text-warning font-medium" : "text-muted-foreground"}`}>
                        {s.latency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "users":
        return (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-semibold text-foreground">User Management</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{DEMO_USERS.length} total users</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button size="sm" className="bg-gradient-maroon hover:opacity-90 flex-shrink-0">
                    <Plus className="w-4 h-4 mr-1" /> Add User
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Name</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden md:table-cell">Email</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Role</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Status</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden lg:table-cell">Sessions</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden md:table-cell">Last Login</th>
                      <th className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {u.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <span className="text-sm font-medium text-foreground">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            u.role === "Admin" ? "bg-primary/10 text-primary" :
                            u.role === "Lecturer" ? "bg-info/10 text-info" :
                            "bg-muted text-muted-foreground"
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            u.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                          }`}>{u.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{u.sessions}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{u.lastLogin}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "courses":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-foreground text-lg">Courses & Units</h3>
                <p className="text-sm text-muted-foreground">{COURSES_DATA.length} courses, {COURSES_DATA.reduce((a, c) => a + c.units, 0)} units total</p>
              </div>
              <Button size="sm" className="bg-gradient-maroon hover:opacity-90">
                <Plus className="w-4 h-4 mr-1" /> Add Course
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {COURSES_DATA.map((c, i) => (
                <motion.div
                  key={c.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">{c.code}</span>
                  </div>
                  <h4 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{c.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{c.faculty}</p>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-lg font-display font-bold text-foreground">{c.units}</p>
                      <p className="text-xs text-muted-foreground">Units</p>
                    </div>
                    <div>
                      <p className="text-lg font-display font-bold text-foreground">{c.students}</p>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case "documents":
        return (
          <div className="space-y-6">
            {/* Upload Area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
              className={`bg-card rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                dragOver ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1">Upload Documents</h3>
              <p className="text-sm text-muted-foreground mb-4">Drag and drop files here, or click to browse</p>
              <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/5">
                Browse Files
              </Button>
              <p className="text-xs text-muted-foreground mt-3">PDF, DOC, DOCX, PPT, PPTX, TXT — Max 20MB</p>
            </div>

            {/* Documents Table */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-semibold text-foreground">Document Library</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{DEMO_DOCUMENTS.length} documents</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Document</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden md:table-cell">Unit</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden lg:table-cell">Uploaded By</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden md:table-cell">Size</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden lg:table-cell">Downloads</th>
                      <th className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((d, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                              d.type === "PDF" ? "bg-destructive/10 text-destructive" :
                              d.type === "DOCX" ? "bg-info/10 text-info" :
                              "bg-warning/10 text-warning"
                            }`}>
                              {d.type}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{d.name}</p>
                              <p className="text-xs text-muted-foreground">{d.date}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">{d.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{d.uploadedBy}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{d.size}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{d.downloads}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-info">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Queries", value: "12,847", change: "+18%", up: true },
                { label: "Avg. Session", value: "8.4 min", change: "+2.1 min", up: true },
                { label: "Retention Rate", value: "76.3%", change: "+4.2%", up: true },
                { label: "Error Rate", value: "0.3%", change: "-0.1%", up: true },
              ].map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card rounded-xl border border-border p-4 shadow-card"
                >
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-display font-bold text-foreground mt-1">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-xs font-semibold text-success">{kpi.change}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">User Growth Trend</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={userGrowthData}>
                    <defs>
                      <linearGradient id="colorStudents2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(345, 100%, 25%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(345, 100%, 25%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLecturers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(345, 10%, 88%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" />
                    <Tooltip />
                    <Area type="monotone" dataKey="students" stroke="hsl(345, 100%, 25%)" fill="url(#colorStudents2)" strokeWidth={2} name="Students" />
                    <Area type="monotone" dataKey="lecturers" stroke="hsl(210, 100%, 50%)" fill="url(#colorLecturers)" strokeWidth={2} name="Lecturers" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">Course Enrollment</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={coursePopularityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {coursePopularityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {coursePopularityData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">Daily Sessions & Queries</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(345, 10%, 88%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" />
                    <Tooltip />
                    <Bar dataKey="sessions" fill="hsl(345, 100%, 25%)" radius={[4, 4, 0, 0]} name="Sessions" />
                    <Bar dataKey="queries" fill="hsl(345, 30%, 75%)" radius={[4, 4, 0, 0]} name="Queries" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">API Response Time</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(345, 10%, 88%)" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" unit="s" />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="hsl(142, 70%, 40%)" strokeWidth={2} dot={{ fill: "hsl(142, 70%, 40%)" }} name="Response Time" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      case "health":
        return (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-4 h-4 rounded-full bg-success animate-pulse" />
                <h3 className="font-display text-xl font-bold text-foreground">All Systems Operational</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {HEALTH_SERVICES.map((s) => (
                  <div key={s.name} className="bg-muted/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 rounded-full ${s.status === "healthy" ? "bg-success" : "bg-warning animate-pulse"}`} />
                      <span className="font-display font-semibold text-foreground text-sm">{s.name}</span>
                    </div>
                    <p className="text-2xl font-display font-bold text-foreground">{s.latency}</p>
                    <p className="text-xs text-muted-foreground mt-1">Response time</p>
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">Uptime</p>
                      <p className="text-sm font-semibold text-success">{s.uptime}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Uptime chart */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h3 className="font-display font-semibold text-foreground mb-4">Response Time (24h)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(345, 10%, 88%)" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(0, 3%, 42%)" unit="s" />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="hsl(142, 70%, 40%)" strokeWidth={2} dot={{ fill: "hsl(142, 70%, 40%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h3 className="font-display font-semibold text-foreground mb-4">Recent Alerts</h3>
              <div className="space-y-3">
                {[
                  { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/5 border-warning/20", title: "File Storage latency elevated", desc: "Response time exceeding 800ms threshold • 1 hour ago" },
                  { icon: CheckCircle, color: "text-success", bg: "bg-success/5 border-success/20", title: "Database backup completed", desc: "All tables backed up successfully • 3 hours ago" },
                  { icon: CheckCircle, color: "text-success", bg: "bg-success/5 border-success/20", title: "SSL certificate renewed", desc: "Certificate valid until March 2027 • 1 day ago" },
                  { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/5 border-warning/20", title: "Memory usage spike detected", desc: "Brief 85% memory usage on API server • 2 days ago • Resolved" },
                ].map((alert, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.bg}`}>
                    <alert.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.color}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6 max-w-4xl">
            <Tabs defaultValue="general">
              <TabsList className="bg-muted">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="backup">Backup</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-6 space-y-6">
                <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold text-foreground">General Settings</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Site Name</Label>
                      <Input defaultValue="CUEA AI Assistant" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Admin Email</Label>
                      <Input defaultValue="admin@cuea.edu" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Max File Size (MB)</Label>
                      <Input type="number" defaultValue="20" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Default Language</Label>
                      <Select defaultValue="en">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="sw">Swahili</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
                      <p className="text-xs text-muted-foreground">Temporarily disable user access</p>
                    </div>
                    <Switch />
                  </div>
                  <Button className="bg-gradient-maroon hover:opacity-90">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="security" className="mt-6 space-y-6">
                <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold text-foreground">Security Settings</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { title: "Require Uppercase", desc: "Passwords must contain uppercase letters", defaultChecked: true },
                      { title: "Require Numbers", desc: "Passwords must contain numbers", defaultChecked: true },
                      { title: "Require Special Characters", desc: "Passwords must contain special characters", defaultChecked: false },
                      { title: "Two-Factor Authentication", desc: "Require 2FA for admin accounts", defaultChecked: false },
                    ].map((setting) => (
                      <div key={setting.title} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{setting.title}</p>
                          <p className="text-xs text-muted-foreground">{setting.desc}</p>
                        </div>
                        <Switch defaultChecked={setting.defaultChecked} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Min Password Length</Label>
                      <Input type="number" defaultValue="8" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Session Timeout (min)</Label>
                      <Input type="number" defaultValue="30" />
                    </div>
                  </div>
                  <Button className="bg-gradient-maroon hover:opacity-90">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="mt-6 space-y-6">
                <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Bell className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold text-foreground">Notification Settings</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { title: "Email Notifications", desc: "Receive system alerts via email", defaultChecked: true },
                      { title: "New User Notifications", desc: "Get notified when new users register", defaultChecked: true },
                      { title: "System Health Alerts", desc: "Receive alerts when services go down", defaultChecked: true },
                      { title: "Weekly Reports", desc: "Receive weekly analytics summary", defaultChecked: false },
                    ].map((setting) => (
                      <div key={setting.title} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{setting.title}</p>
                          <p className="text-xs text-muted-foreground">{setting.desc}</p>
                        </div>
                        <Switch defaultChecked={setting.defaultChecked} />
                      </div>
                    ))}
                  </div>
                  <Button className="bg-gradient-maroon hover:opacity-90">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="backup" className="mt-6 space-y-6">
                <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Database className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold text-foreground">Backup Configuration</h3>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Automated Backups</p>
                      <p className="text-xs text-muted-foreground">Enable automatic database backups</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Frequency</Label>
                      <Select defaultValue="daily">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Retention (days)</Label>
                      <Input type="number" defaultValue="30" />
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <p className="text-sm font-medium text-foreground">Last Backup</p>
                    <p className="text-xs text-muted-foreground mt-1">February 27, 2026 at 03:00 AM — 245 MB</p>
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-xs font-medium text-success">Completed successfully</span>
                    </div>
                  </div>
                  <Button className="bg-gradient-maroon hover:opacity-90">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-[260px]" : "w-0 overflow-hidden"} flex-shrink-0 bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300`}>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-sidebar-primary" />
            </div>
            <div>
              <span className="font-display font-bold text-sidebar-foreground text-lg">CUEA AI</span>
              <p className="text-xs text-sidebar-foreground/50">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-accent-foreground">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/50">Administrator</p>
            </div>
            <button onClick={() => { logout(); navigate("/"); }} className="text-sidebar-foreground/40 hover:text-sidebar-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-lg">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="font-display font-semibold text-foreground text-lg">
              {NAV_ITEMS.find((n) => n.id === activeSection)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-muted rounded-lg">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
