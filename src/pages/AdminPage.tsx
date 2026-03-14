import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, BookOpen, FileText, BarChart3, Activity,
  Bell, Settings, LogOut, GraduationCap, Menu, X, TrendingUp,
  UserCheck, BookMarked, Clock, Upload, Search,
  Download, Trash2, Plus, Shield, Database, Globe, Save,
  Edit, MessageSquare, Loader2, RefreshCw, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "courses", label: "Courses & Units", icon: BookOpen },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  admission_number: string | null;
  program: string | null;
  year: string | null;
  semester: string | null;
  course: string | null;
  course_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  faculty: string;
  description: string | null;
  is_active: boolean;
}

interface Unit {
  id: string;
  name: string;
  code: string;
  course_id: string;
  semester: number;
  year: number;
  lecturer: string | null;
  is_active: boolean;
}

interface Material {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string | null;
  unit_id: string;
  uploaded_by: string;
  downloads: number;
  created_at: string;
}

const AdminPage = () => {
  const { user, profile, role, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  // Data state
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

  // Search
  const [userSearch, setUserSearch] = useState("");
  const [docSearch, setDocSearch] = useState("");

  // Dialogs
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [editRoleDialog, setEditRoleDialog] = useState<{ userId: string; currentRole: string } | null>(null);

  // Form state
  const [newCourse, setNewCourse] = useState({ name: "", code: "", faculty: "", description: "" });
  const [newUnit, setNewUnit] = useState({ name: "", code: "", course_id: "", semester: "1", year: "1", lecturer: "" });
  const [uploadUnitId, setUploadUnitId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [profilesRes, rolesRes, coursesRes, unitsRes, materialsRes, chatsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("courses").select("*").order("name"),
      supabase.from("units").select("*").order("name"),
      supabase.from("materials").select("*").order("created_at", { ascending: false }),
      supabase.from("chats").select("id", { count: "exact", head: true }),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (rolesRes.data) setUserRoles(rolesRes.data as UserRole[]);
    if (coursesRes.data) setCourses(coursesRes.data as Course[]);
    if (unitsRes.data) setUnits(unitsRes.data as Unit[]);
    if (materialsRes.data) setMaterials(materialsRes.data as Material[]);
    setTotalChats(chatsRes.count || 0);

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


  const getRoleForUser = (userId: string) => {
    return userRoles.find(r => r.user_id === userId)?.role || "student";
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole as "admin" | "student" | "lecturer" }).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Role updated");
    setEditRoleDialog(null);
    fetchData();
  };

  const handleAddCourse = async () => {
    if (!newCourse.name || !newCourse.code || !newCourse.faculty) { toast.error("Fill all required fields"); return; }
    const { error } = await supabase.from("courses").insert({
      name: newCourse.name,
      code: newCourse.code,
      faculty: newCourse.faculty,
      description: newCourse.description || null,
    });
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
    const { error } = await supabase.from("units").insert({
      name: newUnit.name,
      code: newUnit.code,
      course_id: newUnit.course_id,
      semester: parseInt(newUnit.semester),
      year: parseInt(newUnit.year),
      lecturer: newUnit.lecturer || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Unit added");
    setNewUnit({ name: "", code: "", course_id: "", semester: "1", year: "1", lecturer: "" });
    setAddUnitOpen(false);
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
        title,
        file_name: file.name,
        file_type: file.type || file.name.split(".").pop() || "unknown",
        file_size: file.size,
        storage_path: path,
        unit_id: uploadUnitId,
        uploaded_by: user!.id,
      }).select().single();
      if (insertError || !materialData) { toast.error(`Save failed: ${insertError?.message}`); continue; }
      toast.success(`Uploaded: ${file.name}`);

      // Server-side text extraction and embedding
      try {
        toast.info(`Processing embeddings for: ${file.name}...`);
        const { data: sessionData } = await supabase.auth.getSession();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            materialId: materialData.id,
            storagePath: path,
            fileType: file.type,
            title,
            unitCode: unit?.code || "N/A",
          }),
        });
        if (resp.ok) {
          const result = await resp.json();
          toast.success(`Embedded ${result.chunksProcessed} chunks (${Math.round(result.textLength / 1000)}k chars) for: ${file.name}`);
        } else {
          const err = await resp.json().catch(() => ({}));
          console.error("Embedding error:", err);
          toast.warning(`Uploaded but embedding failed: ${err.error || "Unknown error"}`);
        }
      } catch (e) {
        console.error("Embedding process error:", e);
      }
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredUsers = profiles.filter(
    u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredDocs = materials.filter(
    d => d.title.toLowerCase().includes(docSearch.toLowerCase()) || d.file_name.toLowerCase().includes(docSearch.toLowerCase())
  );

  const getUnitName = (unitId: string) => units.find(u => u.id === unitId)?.code || unitId;

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: profiles.length, icon: UserCheck, color: "text-primary" },
                { label: "Total Courses", value: courses.length, icon: BookMarked, color: "text-primary" },
                { label: "Chat Sessions", value: totalChats, icon: MessageSquare, color: "text-primary" },
                { label: "Tokens Today", value: tokenUsageToday.toLocaleString(), icon: Clock, color: "text-primary" },
              ].map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-xl border border-border p-5 shadow-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{m.label}</p>
                      <p className="text-2xl font-display font-bold text-foreground mt-1">{m.value}</p>
                    </div>
                    <div className={`p-2 rounded-lg bg-muted ${m.color}`}><m.icon className="w-5 h-5" /></div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border"><span className="text-sm text-muted-foreground">Total Units</span><span className="text-sm font-semibold text-foreground">{units.length}</span></div>
                  <div className="flex justify-between py-2 border-b border-border"><span className="text-sm text-muted-foreground">Documents Uploaded</span><span className="text-sm font-semibold text-foreground">{materials.length}</span></div>
                  <div className="flex justify-between py-2 border-b border-border"><span className="text-sm text-muted-foreground">Admin Users</span><span className="text-sm font-semibold text-foreground">{userRoles.filter(r => r.role === "admin").length}</span></div>
                  <div className="flex justify-between py-2"><span className="text-sm text-muted-foreground">Lecturers</span><span className="text-sm font-semibold text-foreground">{userRoles.filter(r => r.role === "lecturer").length}</span></div>
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="font-display font-semibold text-foreground mb-4">Recent Users</h3>
                {profiles.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{p.name.charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{getRoleForUser(p.user_id)}</span>
                  </div>
                ))}
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
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {u.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-foreground">{u.name || "—"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                              userRole === "admin" ? "bg-primary/10 text-primary" :
                              userRole === "lecturer" ? "bg-accent/30 text-accent-foreground" :
                              "bg-muted text-muted-foreground"
                            }`}>{userRole}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{u.program || "—"}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => setEditRoleDialog({ userId: u.user_id, currentRole: userRole })} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No users found</td></tr>
                    )}
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
                <Button size="sm" variant="outline" onClick={() => setAddUnitOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Unit</Button>
                <Button size="sm" className="bg-gradient-maroon hover:opacity-90" onClick={() => setAddCourseOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Course</Button>
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h4 className="font-display font-semibold text-foreground mb-1">No courses yet</h4>
                <p className="text-sm text-muted-foreground mb-4">Add your first course to get started</p>
                <Button onClick={() => setAddCourseOpen(true)} className="bg-gradient-maroon hover:opacity-90"><Plus className="w-4 h-4 mr-1" /> Add Course</Button>
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
                      {c.description && <p className="text-xs text-muted-foreground mt-2">{c.description}</p>}
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                        <div>
                          <p className="text-lg font-display font-bold text-foreground">{courseUnits.length}</p>
                          <p className="text-xs text-muted-foreground">Units</p>
                        </div>
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
                  <SelectContent>
                    {units.map(u => <SelectItem key={u.id} value={u.id}>{u.code} — {u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.pptx,.txt" className="hidden" onChange={e => { if (e.target.files) handleFileUpload(e.target.files); e.target.value = ""; }} />
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!uploadUnitId}>Browse Files</Button>
              </div>
              <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, PPTX, TXT — Max 20MB</p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-semibold text-foreground">Document Library</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{materials.length} documents</p>
                </div>
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
                            <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center text-xs font-bold">
                              {d.file_type.split("/").pop()?.toUpperCase().slice(0, 4) || "FILE"}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{d.title}</p>
                              <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
                            </div>
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
                    {filteredDocs.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No documents uploaded yet</td></tr>
                    )}
                  </tbody>
                </table>
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
                { label: "Total Courses", value: courses.length },
                { label: "Total Units", value: units.length },
                { label: "Total Documents", value: materials.length },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-card rounded-xl border border-border p-4 shadow-card">
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-display font-bold text-foreground mt-1">{kpi.value}</p>
                </div>
              ))}
            </div>
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
        );

      case "settings":
        return (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground">System Information</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border"><span className="text-sm text-muted-foreground">Platform</span><span className="text-sm font-medium text-foreground">CUEA AI — Lovable Cloud</span></div>
                <div className="flex justify-between py-2 border-b border-border"><span className="text-sm text-muted-foreground">AI Model</span><span className="text-sm font-medium text-foreground">google/gemini-3-flash-preview</span></div>
                <div className="flex justify-between py-2 border-b border-border"><span className="text-sm text-muted-foreground">Daily User Token Limit</span><span className="text-sm font-medium text-foreground">5,000</span></div>
                <div className="flex justify-between py-2 border-b border-border"><span className="text-sm text-muted-foreground">Global Daily Token Limit</span><span className="text-sm font-medium text-foreground">50,000</span></div>
                <div className="flex justify-between py-2"><span className="text-sm text-muted-foreground">RAG Embedding Model</span><span className="text-sm font-medium text-foreground">gemini-embedding-001</span></div>
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
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-sidebar flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarOpen ? "w-[260px]" : "w-[56px]"}`}>
        <div className={`p-4 ${!sidebarOpen ? "px-1.5 py-3" : ""}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center"><GraduationCap className="w-5 h-5 text-sidebar-primary" /></div>
              <div>
                <span className="font-display font-bold text-sidebar-foreground text-lg">CUEA AI</span>
                <p className="text-xs text-sidebar-foreground/50">Admin Panel</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center"><GraduationCap className="w-5 h-5 text-sidebar-primary" /></div>
            </div>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.name || user?.email}</p>
                <p className="text-xs text-sidebar-foreground/50">Administrator</p>
              </div>
              <button onClick={async () => { await logout(); navigate("/"); }} className="text-sidebar-foreground/40 hover:text-sidebar-foreground"><LogOut className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-accent-foreground" title={profile?.name || "Admin"}>A</div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {!sidebarOpen && (
        <div className="md:hidden" />
      )}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-sidebar flex flex-col z-50">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center"><GraduationCap className="w-5 h-5 text-sidebar-primary" /></div>
                <div>
                  <span className="font-display font-bold text-sidebar-foreground text-lg">CUEA AI</span>
                  <p className="text-xs text-sidebar-foreground/50">Admin Panel</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-3 space-y-1">
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.name || user?.email}</p>
                  <p className="text-xs text-sidebar-foreground/50">Administrator</p>
                </div>
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

      {/* Add Course Dialog */}
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

      {/* Add Unit Dialog */}
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

      {/* Edit Role Dialog */}
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
    </div>
  );
};

export default AdminPage;
