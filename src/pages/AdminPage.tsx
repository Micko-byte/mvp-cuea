import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, BookOpen, FileText, BarChart3, Activity,
  Bell, Settings, LogOut, GraduationCap, Menu, X, TrendingUp, TrendingDown,
  UserCheck, BookMarked, AlertTriangle, CheckCircle, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  { name: "Database", status: "healthy", latency: "45ms" },
  { name: "API Server", status: "healthy", latency: "120ms" },
  { name: "File Storage", status: "warning", latency: "890ms" },
  { name: "AI Service", status: "healthy", latency: "340ms" },
];

const DEMO_USERS = [
  { name: "John Mwangi", email: "john@students.cuea.edu", role: "Student", status: "Active", lastLogin: "Today" },
  { name: "Mary Achieng", email: "mary@students.cuea.edu", role: "Student", status: "Active", lastLogin: "Today" },
  { name: "Dr. Omondi", email: "omondi@cuea.edu", role: "Lecturer", status: "Active", lastLogin: "Yesterday" },
  { name: "Prof. Njeri", email: "njeri@cuea.edu", role: "Admin", status: "Active", lastLogin: "Today" },
  { name: "Peter Kamau", email: "peter@students.cuea.edu", role: "Student", status: "Inactive", lastLogin: "2 weeks ago" },
];

const AdminPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Metrics Grid */}
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

            {/* Activity + Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
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

              {/* System Health */}
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
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground">User Management</h3>
              <Button size="sm" className="bg-gradient-maroon hover:opacity-90">Add User</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Name</th>
                    <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Email</th>
                    <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Role</th>
                    <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Status</th>
                    <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_USERS.map((u, i) => (
                    <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {u.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-foreground">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          u.role === "Admin" ? "bg-primary/10 text-primary" :
                          u.role === "Lecturer" ? "bg-info/10 text-info" :
                          "bg-muted text-muted-foreground"
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          u.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        }`}>{u.status}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{u.lastLogin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "courses":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground text-lg">Courses & Units</h3>
              <Button size="sm" className="bg-gradient-maroon hover:opacity-90">Add Course</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {["Computer Science", "Law", "Education", "Commerce", "Theology", "Arts"].map((c, i) => (
                <motion.div
                  key={c}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-display font-semibold text-foreground">{c}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{Math.floor(Math.random() * 20 + 5)} units • {Math.floor(Math.random() * 200 + 50)} students</p>
                </motion.div>
              ))}
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
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${s.status === "healthy" ? "bg-success" : "bg-warning animate-pulse"}`} />
                      <span className="font-display font-semibold text-foreground text-sm">{s.name}</span>
                    </div>
                    <p className="text-2xl font-display font-bold text-foreground">{s.latency}</p>
                    <p className="text-xs text-muted-foreground mt-1">Response time</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h3 className="font-display font-semibold text-foreground mb-4">Recent Alerts</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">File Storage latency elevated</p>
                    <p className="text-xs text-muted-foreground mt-1">Response time exceeding 800ms threshold • 1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Database backup completed</p>
                    <p className="text-xs text-muted-foreground mt-1">All tables backed up successfully • 3 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-card rounded-xl border border-border p-12 shadow-card text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-foreground text-lg">
              {NAV_ITEMS.find((n) => n.id === activeSection)?.label}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">This section is under development.</p>
          </div>
        );
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
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
