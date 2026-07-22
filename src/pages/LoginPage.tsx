import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, User, ArrowRight, ArrowLeft, Loader2, BookOpen, CheckSquare, Upload, FileText, AlertCircle, X, Search, Brain, Eye, EyeOff } from "lucide-react";
import sekaniLogo from "@/assets/sekani.png";
import loginHeroImage from "@/assets/SEKANILOGINBG.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface DbCourse {
  id: string;
  name: string;
  code: string;
  faculty: string;
  is_active: boolean;
}

interface DbUnit {
  id: string;
  name: string;
  code: string;
  course_id: string;
  semester: number;
  year: number;
  lecturer: string | null;
  is_active: boolean;
}

function getYearFromCode(code: string): number {
  const parts = code.trim().split(/\s+/);
  if (parts.length >= 2) {
    const num = parts[parts.length - 1];
    if (num && num[0] >= "1" && num[0] <= "9") return parseInt(num[0]);
  }
  return 0;
}

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
];

// Shared navy button styling — swap here if the brand navy changes
const NAVY_BUTTON = "bg-[#0B1E3F] hover:bg-[#132A54] text-white";

const LoginPage = () => {
  const { login, signup, isAuthenticated, role, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Signup state
  const [signupStep, setSignupStep] = useState(0);
  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [unitSearch, setUnitSearch] = useState("");

  // Doc upload state (step 3) - per unit
  const [activeUploadUnitId, setActiveUploadUnitId] = useState<string | null>(null);
  const [uploadFilesByUnit, setUploadFilesByUnit] = useState<Record<string, File[]>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DB data
  const [dbCourses, setDbCourses] = useState<DbCourse[]>([]);
  const [dbUnits, setDbUnits] = useState<DbUnit[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (isAuthenticated && !authLoading && isLogin) {
      navigate(role === "admin" ? "/admin" : "/chat", { replace: true });
    }
  }, [isAuthenticated, authLoading, role, navigate, isLogin]);

  // Fetch courses and units
  useEffect(() => {
    if (!isLogin || signupStep >= 1) {
      setLoadingData(true);
      Promise.all([
        supabase.from("courses").select("*").eq("is_active", true).order("name"),
        supabase.from("units").select("*").eq("is_active", true).order("code"),
      ]).then(([coursesRes, unitsRes]) => {
        if (coursesRes.data) setDbCourses(coursesRes.data);
        if (unitsRes.data) setDbUnits(unitsRes.data);
        setLoadingData(false);
      });
    }
  }, [isLogin, signupStep]);

  // Filter units by selected course, year, and search
  const filteredUnits = dbUnits.filter(u => {
    if (u.course_id !== selectedCourseId) return false;
    if (year) {
      const unitYear = getYearFromCode(u.code);
      if (unitYear !== parseInt(year)) return false;
    }
    if (unitSearch.trim()) {
      const q = unitSearch.toLowerCase();
      return u.code.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
    }
    return true;
  });

  // All units for current course (for search across all years)
  const allCourseUnits = dbUnits.filter(u => {
    if (u.course_id !== selectedCourseId) return false;
    if (unitSearch.trim()) {
      const q = unitSearch.toLowerCase();
      return u.code.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
    }
    return true;
  });

  // Show all course units when searching, filtered units otherwise
  const displayUnits = unitSearch.trim() ? allCourseUnits : filteredUnits;

  const selectedCourse = dbCourses.find(c => c.id === selectedCourseId);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  const canProceedStep0 = name && signupEmail && signupPassword.length >= 6 && confirmPassword && termsAccepted;
  const canProceedStep1 = selectedCourseId && year && semester;

  const handleStep0Verify = async () => {
    if (!canProceedStep0) {
      setError("Fill all fields, accept terms, and use a password with min 6 characters");
      return;
    }
    if (signupPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    const emailLower = signupEmail.toLowerCase();
    if (emailLower.includes(".edu")) {
      setError("Please input your normal email. Institutional .edu emails are not allowed.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await signup(signupEmail, signupPassword, {
      name, program: "", course: "", course_name: "", year: "", semester: "",
    });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    toast.success("Account created! Continue setting up your profile.");
    setSignupStep(1);
  };

  const handleOtpVerify = async () => {
    if (otpCode.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    setError("");
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: signupEmail,
      token: otpCode,
      type: "signup",
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    toast.success("Email verified! Continue setting up your profile.");
    setSignupStep(1);
  };

  const handleStep1Next = async () => {
    if (!canProceedStep1) { setError("Select course, year, and semester"); return; }
    setError("");
    if (user) {
      await supabase.from("profiles").update({
        program: selectedCourse?.faculty || "",
        course: selectedCourse?.code || "",
        course_name: selectedCourse?.name || "",
        year, semester,
      }).eq("user_id", user.id);
    }
    setSignupStep(2);
  };

  const handleStep2Next = async () => {
    if (selectedUnitIds.length === 0) { setError("Select at least one unit"); return; }
    setError("");
    if (user) {
      const rows = selectedUnitIds.map(unit_id => ({ user_id: user.id, unit_id }));
      await supabase.from("student_units").upsert(rows, { onConflict: "user_id,unit_id", ignoreDuplicates: true });
    }
    // Set first unit as active upload target
    setActiveUploadUnitId(selectedUnitIds[0]);
    setSignupStep(3);
  };

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeUploadUnitId) return;
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (!ACCEPTED_FILE_TYPES.includes(f.type) && !f.name.match(/\.(pdf|doc|docx|pptx|txt|csv|md)$/i)) {
        toast.error(`${f.name}: Only academic documents (PDF, DOCX, PPTX, TXT) are accepted`);
        return false;
      }
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`${f.name}: File too large (max 20MB)`);
        return false;
      }
      return true;
    });
    setUploadFilesByUnit(prev => ({
      ...prev,
      [activeUploadUnitId]: [...(prev[activeUploadUnitId] || []), ...validFiles],
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (unitId: string, idx: number) => {
    setUploadFilesByUnit(prev => ({
      ...prev,
      [unitId]: (prev[unitId] || []).filter((_, i) => i !== idx),
    }));
  };

  const computeFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const totalFilesCount = Object.values(uploadFilesByUnit).reduce((sum, files) => sum + files.length, 0);

  const handleUploadAndFinish = async () => {
    if (!user) return;

    if (totalFilesCount === 0) {
      navigate("/chat", { replace: true });
      return;
    }

    setUploading(true);
    const progress: Record<string, string> = {};

    for (const [unitId, files] of Object.entries(uploadFilesByUnit)) {
      const unit = dbUnits.find(u => u.id === unitId);
      const unitCode = unit?.code || "";

      for (const file of files) {
        const key = `${unitCode}:${file.name}`;
        progress[key] = "Checking for duplicates...";
        setUploadProgress({ ...progress });

        try {
          const hash = await computeFileHash(file);
          const { data: existing } = await supabase
            .from("document_hashes")
            .select("id")
            .eq("content_hash", hash)
            .maybeSingle();

          if (existing) {
            progress[key] = "⚠️ Duplicate - skipped";
            setUploadProgress({ ...progress });
            continue;
          }

          progress[key] = "Uploading...";
          setUploadProgress({ ...progress });

          const storagePath = `uploads/${user.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("materials")
            .upload(storagePath, file);

          if (uploadError) {
            progress[key] = `❌ Upload failed: ${uploadError.message}`;
            setUploadProgress({ ...progress });
            continue;
          }

          const { data: material, error: matError } = await supabase
            .from("materials")
            .insert({
              title: file.name.replace(/\.[^.]+$/, ""),
              file_name: file.name,
              file_type: file.type || "application/octet-stream",
              file_size: file.size,
              unit_id: unitId,
              uploaded_by: user.id,
              storage_path: storagePath,
              embedding_status: "processing",
            })
            .select("id")
            .single();

          if (matError) {
            progress[key] = `❌ Error: ${matError.message}`;
            setUploadProgress({ ...progress });
            continue;
          }

          await supabase.from("document_hashes").insert({
            content_hash: hash,
            file_name: file.name,
            unit_id: unitId,
            uploaded_by: user.id,
            material_id: material?.id,
          });

          progress[key] = "🧠 Training AI...";
          setUploadProgress({ ...progress });

          const { error: embedError } = await supabase.functions.invoke("process-document", {
            body: {
              materialId: material?.id,
              title: file.name,
              unitCode,
              storagePath,
              fileType: file.type,
            },
          });

          if (embedError) {
            progress[key] = `❌ Training failed: ${embedError.message}`;
            setUploadProgress({ ...progress });

            await supabase
              .from("materials")
              .update({ embedding_status: "failed" })
              .eq("id", material?.id);

            continue;
          }

          progress[key] = "✅ Uploaded & trained";
          setUploadProgress({ ...progress });
        } catch (err) {
          progress[key] = `❌ Error: ${err instanceof Error ? err.message : "Unknown"}`;
          setUploadProgress({ ...progress });
        }
      }
    }

    setUploading(false);
    toast.success("Setup complete! Welcome to Sekani.");
    setTimeout(() => navigate("/chat", { replace: true }), 1500);
  };

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds(prev =>
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

  const totalSteps = 4;
  const currentStepDisplay = signupStep >= 0 ? Math.floor(signupStep) + 1 : 1;

  const selectedUnitsData = dbUnits.filter(u => selectedUnitIds.includes(u.id));

  return (
    <div
      className="min-h-screen w-full flex bg-white"
      style={{ fontFamily: "'Lexend', sans-serif" }}
    >
      {/* LEFT: form panel */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-10 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
{/* Brand row */}
<div className="flex items-center justify-center mb-3">
  <div className="w-80 h-32 flex items-center justify-center">
    <img
      src={sekaniLogo}
      alt="Sekani"
      className="w-full h-full object-contain"
    />
  </div>
</div>
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleLogin} className="space-y-5">
                <div className="mb-8 text-center">
                  <h1 className="text-3xl font-semibold text-foreground">Welcome back</h1>
                  <p className="text-muted-foreground mt-1">Sign in to continue to Sekani</p>
                </div>
                {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border-l-4 border-destructive">{error}</div>}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className={`w-full rounded-full ${NAVY_BUTTON}`} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-4" /> : null}
                  Sign In
                </Button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) { setError("Enter your email first"); return; }
                    setLoading(true);
                    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    setLoading(false);
                    if (err) setError(err.message);
                    else toast.success("Password reset link sent! Check your email.");
                  }}
                  className="w-full text-center text-sm text-[#0B1E3F] hover:underline font-medium"
                >
                  Forgot password?
                </button>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => { setIsLogin(false); setError(""); }} className="text-[#0B1E3F] font-semibold hover:underline">Sign Up</button>
                </p>
              </motion.form>
            ) : (
              <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="mb-8">
                  <h1 className="text-3xl font-semibold text-foreground">Create account</h1>
                  <p className="text-muted-foreground mt-1">Step {currentStepDisplay} of {totalSteps}</p>
                  <div className="flex gap-2 mt-4">
                    {[1, 2, 3, 4, 5].map(s => (
                      <div key={s} className={`h-1 flex-1 rounded-full ${currentStepDisplay >= s ? "bg-[#0B1E3F]" : "bg-muted"}`} />
                    ))}
                  </div>
                </div>
                {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border-l-4 border-destructive">{error}</div>}

                <AnimatePresence mode="wait">
                  {/* STEP 0: Name, Email, Password, T&C */}
                  {signupStep === 0 && (
                    <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="John Mwangi" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" placeholder="you@gmail.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="pl-10" required />
                        </div>
                        <p className="text-xs text-muted-foreground">Use your personal email (not .edu)</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type={showSignupPassword ? "text" : "password"} placeholder="Min 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pl-10 pr-10" required minLength={6} />
                          <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 pr-10" required minLength={6} />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {confirmPassword && signupPassword !== confirmPassword && (
                          <p className="text-xs text-destructive">Passwords do not match</p>
                        )}
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="flex items-start gap-3">
                          <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked === true)} className="mt-0.5" />
                          <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                            I agree to the{" "}
                            <Link to="/terms" target="_blank" className="text-[#0B1E3F] font-semibold hover:underline">Terms & Conditions</Link>{" "}
                            and{" "}
                            <Link to="/terms" target="_blank" className="text-[#0B1E3F] font-semibold hover:underline">Privacy Policy</Link>
                          </label>
                        </div>
                      </div>
                      <Button type="button" onClick={handleStep0Verify} className={`w-full rounded-full ${NAVY_BUTTON}`} disabled={loading || !canProceedStep0}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Create Account
                      </Button>
                    </motion.div>
                  )}

                  {signupStep === 1 && (
                    <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Course</Label>
                        {loadingData ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading courses...
                          </div>
                        ) : dbCourses.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No courses available yet. Contact admin.</p>
                        ) : (
                          <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); setSelectedUnitIds([]); }}>
                            <SelectTrigger><SelectValue placeholder="Select your course" /></SelectTrigger>
                            <SelectContent>
                              {dbCourses.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {selectedCourse && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                          <span className="font-semibold text-foreground">{selectedCourse.name}</span>
                          <br />Faculty: {selectedCourse.faculty}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Year</Label>
                          <Select value={year} onValueChange={(v) => { setYear(v); setSelectedUnitIds([]); }}>
                            <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                            <SelectContent>{["1","2","3","4","5"].map(y => <SelectItem key={y} value={y}>Year {y}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Semester</Label>
                          <Select value={semester} onValueChange={(v) => { setSemester(v); setSelectedUnitIds([]); }}>
                            <SelectTrigger><SelectValue placeholder="Sem" /></SelectTrigger>
                            <SelectContent>{["1","2","3"].map(s => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button type="button" className={`flex-1 rounded-full ${NAVY_BUTTON}`} disabled={!canProceedStep1} onClick={handleStep1Next}>
                          Next 
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Select Units with search */}
                  {signupStep === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4" />
                        <span>Select your units for <span className="font-semibold text-foreground">{selectedCourse?.code} — Year {year}</span></span>
                      </div>

                      {/* Search input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search units by name or code..."
                          value={unitSearch}
                          onChange={(e) => setUnitSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>

                      {unitSearch.trim() && (
                        <p className="text-xs text-muted-foreground">
                          Searching across all years • {allCourseUnits.length} result{allCourseUnits.length !== 1 ? "s" : ""}
                        </p>
                      )}

                      {displayUnits.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>{unitSearch.trim() ? "No units match your search." : "No units available for this course & year."}</p>
                          <p className="text-xs mt-1">Try searching by unit code or name above.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {displayUnits.map(unit => (
                            <label
                              key={unit.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedUnitIds.includes(unit.id)
                                  ? "border-[#0B1E3F] bg-[#0B1E3F]/5"
                                  : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <Checkbox
                                checked={selectedUnitIds.includes(unit.id)}
                                onCheckedChange={() => toggleUnit(unit.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{unit.code}</p>
                                <p className="text-xs text-muted-foreground truncate">{unit.name}</p>
                                {unitSearch.trim() && (
                                  <p className="text-xs text-muted-foreground/60">Year {unit.year} • Sem {unit.semester}</p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {selectedUnitIds.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-[#0B1E3F] font-medium">
                          <CheckSquare className="w-3.5 h-3.5" />
                          {selectedUnitIds.length} unit{selectedUnitIds.length !== 1 ? "s" : ""} selected
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => { setSignupStep(1); setUnitSearch(""); }} className="flex-1 rounded-full">
                         Back
                        </Button>
                        <Button type="button" className={`flex-1 rounded-full ${NAVY_BUTTON}`} onClick={handleStep2Next} disabled={selectedUnitIds.length === 0}>
                          Next
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: Train AI - Upload Documents per Unit */}
                  {signupStep === 3 && (
                    <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                        <Brain className="w-4 h-4 text-[#0B1E3F]" />
                        <span>Now let's train your AI by uploading notes</span>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> How it works
                        </p>
                        <p>• Upload notes for each of your units below</p>
                        <p>• Your AI will remember this context permanently</p>
                        <p>• Other students in the same unit also benefit from uploads</p>
                        <p>• Supported: PDF, DOCX, PPTX, TXT • Max 20MB each</p>
                        <p>• Uploading does <strong>not</strong> use your chat credits</p>
                      </div>

                      {/* Unit tabs */}
                      <div className="space-y-3">
                        {selectedUnitsData.map(unit => {
                          const unitFiles = uploadFilesByUnit[unit.id] || [];
                          const isActive = activeUploadUnitId === unit.id;

                          return (
                            <div key={unit.id} className={`rounded-lg border transition-colors ${isActive ? "border-[#0B1E3F] bg-[#0B1E3F]/5" : "border-border"}`}>
                              <button
                                type="button"
                                onClick={() => setActiveUploadUnitId(isActive ? null : unit.id)}
                                className="w-full flex items-center justify-between p-3 text-left rounded-full"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <BookOpen className="w-4 h-4 text-[#0B1E3F] shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">{unit.code}</p>
                                    <p className="text-xs text-muted-foreground truncate">{unit.name}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {unitFiles.length > 0 && (
                                    <span className="text-xs bg-[#0B1E3F]/10 text-[#0B1E3F] px-2 py-0.5 rounded-full font-medium">
                                      {unitFiles.length} file{unitFiles.length !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                  <Upload className={`w-4 h-4 transition-transform ${isActive ? "text-[#0B1E3F] rotate-180" : "text-muted-foreground"}`} />
                                </div>
                              </button>

                              {isActive && (
                                <div className="px-3 pb-3 space-y-2">
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.pptx,.txt,.csv,.md"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-dashed border-2 rounded-full"
                                    disabled={uploading}
                                  >
                                    <FileText className="mr-2 w-4 h-4" />
                                    Add Files for {unit.code}
                                  </Button>

                                  {unitFiles.length > 0 && (
                                    <div className="space-y-1">
                                      {unitFiles.map((file, idx) => {
                                        const progressKey = `${unit.code}:${file.name}`;
                                        return (
                                          <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                                            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                            <span className="flex-1 truncate text-foreground text-xs">{file.name}</span>
                                            {uploadProgress[progressKey] ? (
                                              <span className="text-xs text-muted-foreground shrink-0">{uploadProgress[progressKey]}</span>
                                            ) : (
                                              <button type="button" onClick={() => removeFile(unit.id, idx)} className="text-muted-foreground hover:text-destructive">
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setSignupStep(2)} className="flex-1 rounded-full" disabled={uploading}>
                           Back
                        </Button>
                        <Button
                          type="button"
                          className={`flex-1 ${NAVY_BUTTON}`}
                          onClick={handleUploadAndFinish}
                          disabled={uploading}
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          {totalFilesCount === 0 ? "Skip & Finish" : `Upload ${totalFilesCount} & Finish`} <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {signupStep === 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" onClick={() => { setIsLogin(true); setSignupStep(0); setError(""); }} className="text-[#0B1E3F] font-semibold hover:underline">Sign In</button>
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT: image panel */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden border-l border-border">
        <img
          src={loginHeroImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#0B1E3F]/20" />
      </div>
    </div>
  );
};

export default LoginPage;