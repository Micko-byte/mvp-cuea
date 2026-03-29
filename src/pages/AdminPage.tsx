import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import sekaniLogo from "@/assets/sekani-logo.png";
import {
  LayoutDashboard, Users, BookOpen, FileText, BarChart3,
  Settings, LogOut, Menu, X, TrendingUp,
  UserCheck, BookMarked, Clock, Upload, Search,
  Download, Trash2, Plus, Shield, Database, Globe, Save,
  Edit, MessageSquare, Loader2, RefreshCw, ArrowLeft,
  CreditCard, Zap, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "courses", label: "Courses & Units", icon: BookOpen },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "ai-config", label: "AI Config", icon: Zap },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

interface Profile {
  id: string; user_id: string; name: string; email: string;
  admission_number: string | null; program: string | null;
  year: string | null; semester: string | null;
  course: string | null; course_name: string | null;
  avatar_url: string | null; created_at: string;
}
interface UserRole { user_id: string; role: string; }
interface Course { id: string; name: string; code: string; faculty: string; description: string | null; is_active: boolean; }
interface Unit { id: string; name: string; code: string; course_id: string; semester: number; year: number; lecturer: string | null; is_active: boolean; }
interface Material { id: string; title: string; file_name: string; file_type: string; file_size: number; storage_path: string | null; unit_id: string; uploaded_by: string; downloads: number; created_at: string; }

const AdminPage = () => {
  const { user, profile, role, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [tokenUsageToday, setTokenUsageToday] = useState(0);
  const [totalChats, setTotalChats] = useState(0);
  const [payments, setPayments] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [paidUsersCount, setPaidUsersCount] = useState(0);
  const [freeUsersCount, setFreeUsersCount] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; amount: number }[]>([]);
  const [userTokenUsageMap, setUserTokenUsageMap] = useState<Record<string, number>>({});
  const [userChatCounts, setUserChatCounts] = useState<Record<string, number>>({});
  const [userMaterialCounts, setUserMaterialCounts] = useState<Record<string, number>>({});
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedUserChats, setSelectedUserChats] = useState<any[]>([]);
  const [selectedUserMaterials, setSelectedUserMaterials] = useState<Material[]>([]);
  const [selectedUserPayments, setSelectedUserPayments] = useState<any[]>([]);
  const [selectedUserTokens, setSelectedUserTokens] = useState(0);

  // AI Config
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [editRoleDialog, setEditRoleDialog] = useState<{ userId: string; currentRole: string } | null>(null);
  const [editTokenDialog, setEditTokenDialog] = useState<{ userId: string; email: string } | null>(null);
  const [tokenAdjustAmount, setTokenAdjustAmount] = useState("");
  const [tokenAdjustType, setTokenAdjustType] = useState<"add" | "subtract">("add");
  const [userTokenUsage, setUserTokenUsage] = useState<Record<string, number>>({});

  const [newCourse, setNewCourse] = useState({ name: "", code: "", faculty: "", description: "" });
  const [newUnit, setNewUnit] = useState({ name: "", code: "", course_id: "", semester: "1", year: "1", lecturer: "" });
  const [bulkUnitsText, setBulkUnitsText] = useState("");
  const [bulkUnitsCourseId, setBulkUnitsCourseId] = useState("");
  const [bulkUnitsYear, setBulkUnitsYear] = useState("1");
  const [bulkUnitsSemester, setBulkUnitsSemester] = useState("1");
  const [addBulkUnitsOpen, setAddBulkUnitsOpen] = useState(false);
  const [uploadUnitId, setUploadUnitId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [profilesRes, rolesRes, coursesRes, unitsRes, materialsRes, chatsRes, paymentsRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("courses").select("*").order("name"),
      supabase.from("units").select("*").order("name"),
      supabase.from("materials").select("*").order("created_at", { ascending: false }),
      supabase.from("chats").select("id", { count: "exact", head: true }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("system_settings" as any).select("key, value"),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (rolesRes.data) setUserRoles(rolesRes.data as UserRole[]);
    if (coursesRes.data) setCourses(coursesRes.data as Course[]);
    if (unitsRes.data) setUnits(unitsRes.data as Unit[]);
    if (materialsRes.data) setMaterials(materialsRes.data as Material[]);
    setTotalChats(chatsRes.count || 0);

    // Settings
    if (settingsRes.data) {
      const s: Record<string, any> = {};
      for (const row of settingsRes.data as any[]) { s[row.key] = row.value; }
      setSystemSettings(s);
    }

    // Payment analytics
    if (paymentsRes.data) {
      setPayments(paymentsRes.data);
      const successPayments = paymentsRes.data.filter((p: any) => p.status === "success");
      setTotalRevenue(successPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0));
      const paidUserIds = new Set(successPayments.map((p: any) => p.user_id));
      setPaidUsersCount(paidUserIds.size);
      const totalUsers = profilesRes.data?.length || 0;
      setFreeUsersCount(totalUsers - paidUserIds.size);

      // This month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const thisMonthPayments = successPayments.filter((p: any) => p.created_at >= monthStart);
      setMonthRevenue(thisMonthPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0));

      // Daily revenue for last 30 days
      const dailyMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dailyMap[d.toISOString().split("T")[0]] = 0;
      }
      for (const p of successPayments) {
        const day = p.created_at?.split("T")[0];
        if (day && dailyMap[day] !== undefined) dailyMap[day] += p.amount || 0;
      }
      setDailyRevenue(Object.entries(dailyMap).map(([date, amount]) => ({ date: date.slice(5), amount })));
    }

    const { data: tokenData } = await supabase
      .from("token_usage")
      .select("tokens_used")
      .gte("created_at", new Date().toISOString().split("T")[0]);
    setTokenUsageToday(tokenData?.reduce((sum, t) => sum + t.tokens_used, 0) || 0);

    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated && role === "admin") fetchData();
  }, [isAuthenticated, role, fetchData]);

  if (!isLoading && (!isAuthenticated || role !== "admin")) {
    navigate("/");
    return null;
  }

  const getRoleForUser = (userId: string) => userRoles.find(r => r.user_id === userId)?.role || "student";

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Role updated");
    setEditRoleDialog(null);
    fetchData();
  };

  const handleAdjustTokens = async (userId: string) => {
    const amount = parseInt(tokenAdjustAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid positive number"); return; }
    const tokensValue = tokenAdjustType === "subtract" ? amount : -amount;
    const { error } = await supabase.from("token_usage").insert({
      user_id: userId,
      tokens_used: tokensValue,
      model: tokenAdjustType === "add" ? "admin_bonus" : "admin_deduction",
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Tokens ${tokenAdjustType === "add" ? "added" : "deducted"} successfully`);
    setEditTokenDialog(null);
    setTokenAdjustAmount("");
    fetchData();
  };

  const handleAddCourse = async () => {
    if (!newCourse.name || !newCourse.code || !newCourse.faculty) { toast.error("Fill all required fields"); return; }
    const { error } = await supabase.from("courses").insert({ name: newCourse.name, code: newCourse.code, faculty: newCourse.faculty, description: newCourse.description || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Course added");
    setNewCourse({ name: "", code: "", faculty: "", description: "" });
    setAddCourseOpen(false);
    fetchData();
  };

  const handleDeleteCourse = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Course deleted");
    fetchData();
  };

  const handleAddUnit = async () => {
    if (!newUnit.name || !newUnit.code || !newUnit.course_id) { toast.error("Fill all required fields"); return; }
    const { error } = await supabase.from("units").insert({ name: newUnit.name, code: newUnit.code, course_id: newUnit.course_id, semester: parseInt(newUnit.semester), year: parseInt(newUnit.year), lecturer: newUnit.lecturer || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Unit added");
    setNewUnit({ name: "", code: "", course_id: "", semester: "1", year: "1", lecturer: "" });
    setAddUnitOpen(false);
    fetchData();
  };

  const handleBulkAddUnits = async () => {
    if (!bulkUnitsCourseId || !bulkUnitsText.trim()) {
      toast.error("Select a course and enter unit lines");
      return;
    }
    const lines = bulkUnitsText.trim().split("\n").filter(l => l.trim());
    const unitsToInsert: { name: string; code: string; course_id: string; semester: number; year: number }[] = [];

    for (const line of lines) {
      // Format: CODE - Unit Name  OR  CODE, Unit Name  OR  CODE Unit Name
      const match = line.match(/^([A-Za-z]+\s*\d+)\s*[-,]?\s*(.+)$/);
      if (match) {
        unitsToInsert.push({
          code: match[1].trim(),
          name: match[2].trim(),
          course_id: bulkUnitsCourseId,
          year: parseInt(bulkUnitsYear),
          semester: parseInt(bulkUnitsSemester),
        });
      } else {
        toast.error(`Could not parse line: "${line.slice(0, 40)}"`);
      }
    }

    if (unitsToInsert.length === 0) { toast.error("No valid units found"); return; }

    const { error } = await supabase.from("units").insert(unitsToInsert);
    if (error) { toast.error(error.message); return; }
    toast.success(`${unitsToInsert.length} units added!`);
    setBulkUnitsText("");
    setAddBulkUnitsOpen(false);
    fetchData();
  };

  const handleDeleteUnit = async (id: string) => {
    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Unit deleted");
    fetchData();
  };

  const handleFileUpload = async (files: FileList) => {
    if (!uploadUnitId) { toast.error("Select a unit first"); return; }
    const unit = units.find(u => u.id === uploadUnitId);
    for (const file of Array.from(files)) {
      const path = `${uploadUnitId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("materials").upload(path, file);
      if (uploadError) { toast.error(`Upload failed: ${uploadError.message}`); continue; }
      const title = file.name.replace(/\.[^/.]+$/, "");
      const { data: materialData, error: insertError } = await supabase.from("materials").insert({
        title, file_name: file.name, file_type: file.type || file.name.split(".").pop() || "unknown",
        file_size: file.size, storage_path: path, unit_id: uploadUnitId, uploaded_by: user!.id,
      }).select().single();
      if (insertError || !materialData) { toast.error(`Save failed: ${insertError?.message}`); continue; }
      toast.success(`Uploaded: ${file.name}`);
      try {
        toast.info(`Processing embeddings for: ${file.name}...`);
        const { data: sessionData } = await supabase.auth.getSession();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session?.access_token}` },
          body: JSON.stringify({ materialId: materialData.id, storagePath: path, fileType: file.type, title, unitCode: unit?.code || "N/A" }),
        });
        if (resp.ok) {
          const result = await resp.json();
          toast.success(`Embedded ${result.chunksProcessed} chunks for: ${file.name}`);
        } else {
          const err = await resp.json().catch(() => ({}));
          toast.warning(`Uploaded but embedding failed: ${err.error || "Unknown error"}`);
        }
      } catch (e) { console.error("Embedding process error:", e); }
    }
    fetchData();
  };

  const handleDeleteMaterial = async (id: string, storagePath: string | null) => {
    if (storagePath) await supabase.storage.from("materials").remove([storagePath]);
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Document deleted");
    fetchData();
  };

  const handleSaveSetting = async (key: string, value: any) => {
    setSettingsSaving(true);
    const { error } = await supabase.from("system_settings" as any).upsert({ key, value, updated_at: new Date().toISOString() } as any);
    if (error) { toast.error(error.message); }
    else {
      setSystemSettings(prev => ({ ...prev, [key]: value }));
      toast.success(`Setting "${key}" saved`);
    }
    setSettingsSaving(false);
  };

  const exportPaymentsCSV = () => {
    const filtered = paymentFilter === "all" ? payments : payments.filter(p => p.status === paymentFilter);
    const csv = [
      "Date,Email,Amount,Currency,Status,Reference",
      ...filtered.map((p: any) => `${new Date(p.created_at).toLocaleDateString()},${p.email || ""},${p.amount},${p.currency},${p.status},${p.paystack_reference || ""}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "payments.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredUsers = profiles.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredDocs = materials.filter(d => d.title.toLowerCase().includes(docSearch.toLowerCase()) || d.file_name.toLowerCase().includes(docSearch.toLowerCase()));
  const filteredPayments = paymentFilter === "all" ? payments : payments.filter(p => p.status === paymentFilter);
  const getUnitName = (unitId: string) => units.find(u => u.id === unitId)?.code || unitId;

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: profiles.length, icon: UserCheck },
                { label: "Paid Users", value: paidUsersCount, icon: BookMarked },
                { label: "Revenue (KES)", value: `${totalRevenue.toLocaleString()}`, icon: DollarSign },
                { label: "Tokens Today", value: tokenUsageToday.toLocaleString(), icon: Clock },
              ].map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-xl border border-border p-5 shadow-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{m.label}</p>
                      <p className="text-2xl font-display font-bold text-foreground mt-1">{m.value}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted text-primary"><m.icon className="w-5 h-5" /></div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  {[
                    ["Total Units", units.length], ["Documents", materials.length],
                    ["Admins", userRoles.filter(r => r.role === "admin").length],
                    ["Lecturers", userRoles.filter(r => r.role === "lecturer").length],
                    ["This Month Revenue", `KES ${monthRevenue.toLocaleString()}`],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-semibold text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">Daily Revenue (30 days)</h3>
                {dailyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">No revenue data yet</p>}
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
                  <p className="text-sm text-muted-foreground mt-0.5">{profiles.length} total users</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Name</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden md:table-cell">Email</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Role</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden lg:table-cell">Program</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden md:table-cell">Joined</th>
                      <th className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const userRole = getRoleForUser(u.user_id);
                      return (
                        <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{u.name.split(" ").map(n => n[0]).join("").toUpperCase()}</div>
                              <span className="text-sm font-medium text-foreground">{u.name || "—"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${userRole === "admin" ? "bg-primary/10 text-primary" : userRole === "lecturer" ? "bg-accent/30 text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{userRole}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{u.program || "—"}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                            <button onClick={() => setEditTokenDialog({ userId: u.user_id, email: u.email })} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Edit Tokens"><Zap className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditRoleDialog({ userId: u.user_id, currentRole: userRole })} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Edit Role"><Edit className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No users found</td></tr>}
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
                <p className="text-sm text-muted-foreground">{courses.length} courses, {units.length} units</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAddBulkUnitsOpen(true)}><Plus className="w-4 h-4 mr-1" /> Bulk Add Units</Button>
                <Button size="sm" variant="outline" onClick={() => setAddUnitOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Unit</Button>
                <Button size="sm" className="bg-gradient-maroon hover:opacity-90" onClick={() => setAddCourseOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Course</Button>
              </div>
            </div>
            {courses.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h4 className="font-display font-semibold text-foreground mb-1">No courses yet</h4>
                <Button onClick={() => setAddCourseOpen(true)} className="bg-gradient-maroon hover:opacity-90 mt-3"><Plus className="w-4 h-4 mr-1" /> Add Course</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((c) => {
                  const courseUnits = units.filter(u => u.course_id === c.id);
                  return (
                    <div key={c.id} className="bg-card rounded-xl border border-border p-5 shadow-card group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">{c.code}</span>
                          <button onClick={() => handleDeleteCourse(c.id)} className="p-1 opacity-0 group-hover:opacity-100 hover:text-destructive text-muted-foreground transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <h4 className="font-display font-semibold text-foreground">{c.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{c.faculty}</p>
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                        <div><p className="text-lg font-display font-bold text-foreground">{courseUnits.length}</p><p className="text-xs text-muted-foreground">Units</p></div>
                      </div>
                      {courseUnits.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {courseUnits.map(u => (
                            <div key={u.id} className="flex items-center justify-between text-xs py-1">
                              <span className="text-muted-foreground"><span className="font-mono">{u.code}</span> — {u.name}</span>
                              <button onClick={() => handleDeleteUnit(u.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "documents":
        return (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border-2 border-dashed border-border p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"><Upload className="w-7 h-7 text-primary" /></div>
              <h3 className="font-display font-semibold text-foreground mb-1">Upload Documents</h3>
              <p className="text-sm text-muted-foreground mb-4">Select a unit, then upload files for RAG indexing</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Select value={uploadUnitId} onValueChange={setUploadUnitId}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Select unit..." /></SelectTrigger>
                  <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.code} — {u.name}</SelectItem>)}</SelectContent>
                </Select>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.pptx,.txt" className="hidden" onChange={e => { if (e.target.files) handleFileUpload(e.target.files); e.target.value = ""; }} />
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!uploadUnitId}>Browse Files</Button>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div><h3 className="font-display font-semibold text-foreground">Document Library</h3><p className="text-sm text-muted-foreground mt-0.5">{materials.length} documents</p></div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search documents..." value={docSearch} onChange={(e) => setDocSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Document</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden md:table-cell">Unit</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden md:table-cell">Size</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden lg:table-cell">Downloads</th>
                      <th className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((d) => (
                      <tr key={d.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center text-xs font-bold">{d.file_type.split("/").pop()?.toUpperCase().slice(0, 4) || "FILE"}</div>
                            <div><p className="text-sm font-medium text-foreground">{d.title}</p><p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell"><span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">{getUnitName(d.unit_id)}</span></td>
                        <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{formatFileSize(d.file_size)}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{d.downloads}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteMaterial(d.id, d.storage_path)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {filteredDocs.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No documents uploaded yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "payments":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Revenue", value: `KES ${totalRevenue.toLocaleString()}` },
                { label: "This Month", value: `KES ${monthRevenue.toLocaleString()}` },
                { label: "Paid Users", value: paidUsersCount },
                { label: "Free Users", value: freeUsersCount },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-card rounded-xl border border-border p-4 shadow-card">
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-display font-bold text-foreground mt-1">{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h3 className="font-display font-semibold text-foreground mb-4">Daily Revenue (30 days)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div><h3 className="font-display font-semibold text-foreground">Transactions</h3><p className="text-sm text-muted-foreground mt-0.5">{filteredPayments.length} transactions</p></div>
                <div className="flex gap-2">
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={exportPaymentsCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Date</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Email</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Amount</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3">Status</th>
                      <th className="text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground px-6 py-3 hidden lg:table-cell">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.slice(0, 50).map((p: any) => (
                      <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-3 text-sm text-foreground">{p.email || "—"}</td>
                        <td className="px-6 py-3 text-sm font-medium text-foreground">{p.currency} {p.amount}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${p.status === "success" ? "bg-green-500/10 text-green-600" : p.status === "pending" ? "bg-yellow-500/10 text-yellow-600" : "bg-destructive/10 text-destructive"}`}>{p.status}</span>
                        </td>
                        <td className="px-6 py-3 text-xs text-muted-foreground font-mono hidden lg:table-cell">{p.paystack_reference || "—"}</td>
                      </tr>
                    ))}
                    {filteredPayments.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No payments</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "ai-config":
        return (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> Token Limits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Free Daily Limit</Label>
                  <Input
                    type="number"
                    value={String(systemSettings.token_limit_free ?? 50000)}
                    onChange={e => setSystemSettings(prev => ({ ...prev, token_limit_free: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={settingsSaving}
                    onClick={() => handleSaveSetting("token_limit_free", Number(systemSettings.token_limit_free ?? 50000))}
                  ><Save className="w-3 h-3 mr-1" /> Save</Button>
                </div>
                <div className="space-y-2">
                  <Label>Paid Daily Limit</Label>
                  <Input
                    type="number"
                    value={String(systemSettings.token_limit_paid ?? 2000000)}
                    onChange={e => setSystemSettings(prev => ({ ...prev, token_limit_paid: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={settingsSaving}
                    onClick={() => handleSaveSetting("token_limit_paid", Number(systemSettings.token_limit_paid ?? 2000000))}
                  ><Save className="w-3 h-3 mr-1" /> Save</Button>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Model Config</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>General Chat Model</Label>
                  <Input
                    value={String(systemSettings.default_model_general ?? "gpt-4.1-nano").replace(/"/g, "")}
                    onChange={e => setSystemSettings(prev => ({ ...prev, default_model_general: e.target.value }))}
                    placeholder="gpt-4.1-nano"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={settingsSaving}
                    onClick={() => handleSaveSetting("default_model_general", String(systemSettings.default_model_general ?? "gpt-4.1-nano").replace(/"/g, "").trim())}
                  ><Save className="w-3 h-3 mr-1" /> Save</Button>
                </div>
                <div className="space-y-2">
                  <Label>Unit Chat Model</Label>
                  <Input
                    value={String(systemSettings.default_model_unit ?? "gpt-4.1-nano").replace(/"/g, "")}
                    onChange={e => setSystemSettings(prev => ({ ...prev, default_model_unit: e.target.value }))}
                    placeholder="gpt-4.1-nano"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={settingsSaving}
                    onClick={() => handleSaveSetting("default_model_unit", String(systemSettings.default_model_unit ?? "gpt-4.1-nano").replace(/"/g, "").trim())}
                  ><Save className="w-3 h-3 mr-1" /> Save</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max RAG Chunks</Label>
                  <Input
                    type="number"
                    value={String(systemSettings.max_rag_chunks ?? 8)}
                    onChange={e => setSystemSettings(prev => ({ ...prev, max_rag_chunks: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={settingsSaving}
                    onClick={() => handleSaveSetting("max_rag_chunks", Number(systemSettings.max_rag_chunks ?? 8))}
                  ><Save className="w-3 h-3 mr-1" /> Save</Button>
                </div>
                <div className="space-y-2">
                  <Label>Rate Limit (req/min)</Label>
                  <Input
                    type="number"
                    value={String(systemSettings.rate_limit_per_minute ?? 20)}
                    onChange={e => setSystemSettings(prev => ({ ...prev, rate_limit_per_minute: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={settingsSaving}
                    onClick={() => handleSaveSetting("rate_limit_per_minute", Number(systemSettings.rate_limit_per_minute ?? 20))}
                  ><Save className="w-3 h-3 mr-1" /> Save</Button>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
              <h3 className="font-display font-semibold text-foreground">Feature Toggles</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { key: "enable_image_generation", label: "Image Generation" },
                  { key: "enable_moderation", label: "Content Moderation" },
                  { key: "enable_tts", label: "Text-to-Speech" },
                  { key: "enable_whisper", label: "Whisper (STT)" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-foreground">{label}</span>
                    <button
                      onClick={() => {
                        const newVal = systemSettings[key] === true || systemSettings[key] === "true" ? false : true;
                        setSystemSettings(prev => ({ ...prev, [key]: newVal }));
                        handleSaveSetting(key, newVal);
                      }}
                      className={`w-10 h-6 rounded-full relative transition-colors ${systemSettings[key] === true || systemSettings[key] === "true" ? "bg-primary" : "bg-muted-foreground/30"}`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${systemSettings[key] === true || systemSettings[key] === "true" ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: profiles.length },
                { label: "Paid Users", value: paidUsersCount },
                { label: "Free Users", value: freeUsersCount },
                { label: "Revenue (KES)", value: `KES ${totalRevenue.toLocaleString()}` },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-card rounded-xl border border-border p-4 shadow-card">
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-display font-bold text-foreground mt-1">{kpi.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">Role Distribution</h3>
                <div className="grid grid-cols-3 gap-4">
                  {["admin", "lecturer", "student"].map(r => (
                    <div key={r} className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-2xl font-display font-bold text-foreground">{userRoles.filter(ur => ur.role === r).length}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-1">{r}s</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">Token Usage Today</h3>
                <p className="text-3xl font-display font-bold text-foreground">{tokenUsageToday.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">tokens consumed today across all users</p>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h3 className="font-display font-semibold text-foreground mb-4">System Stats</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Courses", value: courses.length },
                  { label: "Total Units", value: units.length },
                  { label: "Total Documents", value: materials.length },
                  { label: "Chat Sessions", value: totalChats },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-3 bg-muted/50 rounded-xl">
                    <p className="text-xl font-display font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
              <div className="flex items-center gap-3 mb-2"><Globe className="w-5 h-5 text-primary" /><h3 className="font-display font-semibold text-foreground">System Information</h3></div>
              <div className="space-y-3">
                {[
                  ["Platform", "Sekani — Soma na Sekani"],
                  ["AI Chat Model", String(systemSettings.default_model_general || "gpt-4.1-nano").replace(/"/g, "")],
                  ["Free Daily Limit", `${Number(systemSettings.token_limit_free || 50000).toLocaleString()} tokens`],
                  ["Paid Daily Limit", `${Number(systemSettings.token_limit_paid || 200000).toLocaleString()} tokens`],
                  ["Global Daily Limit", "500,000 tokens"],
                  ["RAG Model", "text-embedding-3-large (768d)"],
                   ["Individual Price", "KES 129"],
                   ["Group Price (5 users)", "KES 499"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <aside className={`hidden md:flex flex-col bg-sidebar flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarOpen ? "w-[260px]" : "w-[56px]"}`}>
        <div className={`p-4 ${!sidebarOpen ? "px-1.5 py-3" : ""}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <img src={sekaniLogo} alt="Sekani" className="w-9 h-9" />
              <div><span className="font-display font-bold text-sidebar-foreground text-lg">Sekani</span><p className="text-xs text-sidebar-foreground/50">Admin Panel</p></div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <img src={sekaniLogo} alt="Sekani" className="w-9 h-9" />
            </div>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} className={`w-full flex items-center ${sidebarOpen ? "gap-3 px-3" : "justify-center"} py-2.5 rounded-lg text-sm font-medium transition-colors ${activeSection === item.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"}`} title={item.label}>
              <item.icon className="w-4 h-4" />{sidebarOpen && item.label}
            </button>
          ))}
        </nav>
        <div className="p-3">
          <button onClick={() => navigate("/chat")} className={`w-full flex items-center ${sidebarOpen ? "gap-3 px-3" : "justify-center"} py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground`} title="Back to Chat">
            <ArrowLeft className="w-4 h-4" />{sidebarOpen && "Back to Chat"}
          </button>
        </div>
        <div className={`p-4 ${!sidebarOpen ? "px-1.5 py-3" : ""}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-accent-foreground">A</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.name || user?.email}</p><p className="text-xs text-sidebar-foreground/50">Administrator</p></div>
              <button onClick={async () => { await logout(); navigate("/"); }} className="text-sidebar-foreground/40 hover:text-sidebar-foreground"><LogOut className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-accent-foreground" title={profile?.name || "Admin"}>A</div>
            </div>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-sidebar flex flex-col z-50">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <img src={sekaniLogo} alt="Sekani" className="w-9 h-9" />
                <div><span className="font-display font-bold text-sidebar-foreground text-lg">Sekani</span><p className="text-xs text-sidebar-foreground/50">Admin Panel</p></div>
              </div>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <button key={item.id} onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeSection === item.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"}`}>
                  <item.icon className="w-4 h-4" />{item.label}
                </button>
              ))}
            </nav>
            <div className="p-3">
              <button onClick={() => navigate("/chat")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground">
                <ArrowLeft className="w-4 h-4" />Back to Chat
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-accent-foreground">A</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.name || user?.email}</p><p className="text-xs text-sidebar-foreground/50">Administrator</p></div>
                <button onClick={async () => { await logout(); navigate("/"); }} className="text-sidebar-foreground/40 hover:text-sidebar-foreground"><LogOut className="w-4 h-4" /></button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-lg">{sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            <h1 className="font-display font-semibold text-foreground text-lg">{NAV_ITEMS.find(n => n.id === activeSection)?.label}</h1>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchData} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add Course</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Course Name *</Label><Input value={newCourse.name} onChange={e => setNewCourse(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Computer Science" /></div>
            <div className="space-y-2"><Label>Code *</Label><Input value={newCourse.code} onChange={e => setNewCourse(p => ({ ...p, code: e.target.value }))} placeholder="e.g. CS" /></div>
            <div className="space-y-2"><Label>Faculty *</Label><Input value={newCourse.faculty} onChange={e => setNewCourse(p => ({ ...p, faculty: e.target.value }))} placeholder="e.g. Science & Technology" /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={newCourse.description} onChange={e => setNewCourse(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" /></div>
            <Button onClick={handleAddCourse} className="w-full bg-gradient-maroon hover:opacity-90">Add Course</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addUnitOpen} onOpenChange={setAddUnitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add Unit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Unit Name *</Label><Input value={newUnit.name} onChange={e => setNewUnit(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Data Structures" /></div>
            <div className="space-y-2"><Label>Unit Code *</Label><Input value={newUnit.code} onChange={e => setNewUnit(p => ({ ...p, code: e.target.value }))} placeholder="e.g. CS201" /></div>
            <div className="space-y-2">
              <Label>Course *</Label>
              <Select value={newUnit.course_id} onValueChange={v => setNewUnit(p => ({ ...p, course_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Year</Label><Select value={newUnit.year} onValueChange={v => setNewUnit(p => ({ ...p, year: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["1","2","3","4","5"].map(y => <SelectItem key={y} value={y}>Year {y}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Semester</Label><Select value={newUnit.semester} onValueChange={v => setNewUnit(p => ({ ...p, semester: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["1","2","3"].map(s => <SelectItem key={s} value={s}>Sem {s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Lecturer</Label><Input value={newUnit.lecturer} onChange={e => setNewUnit(p => ({ ...p, lecturer: e.target.value }))} placeholder="e.g. Dr. Omondi" /></div>
            <Button onClick={handleAddUnit} className="w-full bg-gradient-maroon hover:opacity-90">Add Unit</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRoleDialog} onOpenChange={() => setEditRoleDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Change User Role</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select defaultValue={editRoleDialog?.currentRole} onValueChange={(v) => { if (editRoleDialog) handleUpdateRole(editRoleDialog.userId, v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="lecturer">Lecturer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTokenDialog} onOpenChange={() => { setEditTokenDialog(null); setTokenAdjustAmount(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Adjust User Tokens</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{editTokenDialog?.email}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setTokenAdjustType("add")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tokenAdjustType === "add" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >+ Add Tokens</button>
              <button
                onClick={() => setTokenAdjustType("subtract")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tokenAdjustType === "subtract" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}
              >− Deduct Tokens</button>
            </div>
            <Input
              type="number"
              placeholder="Amount (e.g. 10000)"
              value={tokenAdjustAmount}
              onChange={(e) => setTokenAdjustAmount(e.target.value)}
            />
            <Button
              onClick={() => { if (editTokenDialog) handleAdjustTokens(editTokenDialog.userId); }}
              className="w-full"
              disabled={!tokenAdjustAmount}
            >
              {tokenAdjustType === "add" ? "Add" : "Deduct"} Tokens
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <Dialog open={addBulkUnitsOpen} onOpenChange={setAddBulkUnitsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Bulk Add Units</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Course *</Label>
              <Select value={bulkUnitsCourseId} onValueChange={v => setBulkUnitsCourseId(v)}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={bulkUnitsYear} onValueChange={v => setBulkUnitsYear(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["1","2","3","4","5"].map(y => <SelectItem key={y} value={y}>Year {y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={bulkUnitsSemester} onValueChange={v => setBulkUnitsSemester(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["1","2","3"].map(s => <SelectItem key={s} value={s}>Sem {s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Units (one per line: CODE - Unit Name)</Label>
              <Textarea
                value={bulkUnitsText}
                onChange={e => setBulkUnitsText(e.target.value)}
                placeholder={"CMT 100 - Introduction to Computing\nCMT 101 - Programming Fundamentals\nCMT 102 - Discrete Mathematics"}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Format: <code>CODE - Unit Name</code>, one unit per line</p>
            </div>
            <Button onClick={handleBulkAddUnits} className="w-full bg-gradient-maroon hover:opacity-90">
              Add {bulkUnitsText.trim().split("\n").filter(l => l.trim()).length} Units
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
