import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Lock, Mail, User, ArrowRight, ArrowLeft, Loader2, BookOpen, CheckSquare, ShieldCheck, Upload, FileText, AlertCircle, X, MailCheck } from "lucide-react";
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

const LoginPage = () => {
  const { login, signup, isAuthenticated, role, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [otpEmail, setOtpEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup state
  const [signupStep, setSignupStep] = useState(0);
  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  // Doc upload state (step 3)
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DB data
  const [dbCourses, setDbCourses] = useState<DbCourse[]>([]);
  const [dbUnits, setDbUnits] = useState<DbUnit[]>([]);
  const [loadingData, setLoadingData] = useState(false);

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

  // Filter units by selected course AND year (from code first digit)
  const filteredUnits = dbUnits.filter(u => {
    if (u.course_id !== selectedCourseId) return false;
    if (!year) return true;
    const unitYear = getYearFromCode(u.code);
    return unitYear === parseInt(year);
  });

  const selectedCourse = dbCourses.find(c => c.id === selectedCourseId);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  const canProceedStep0 = name && signupEmail && signupPassword.length >= 6 && termsAccepted;
  const canProceedStep1 = selectedCourseId && year && semester;

  // Step 0: Validate and create account (sends confirmation email)
  const handleStep0Verify = async () => {
    if (!canProceedStep0) {
      setError("Fill all fields, accept terms, and use a password with min 6 characters");
      return;
    }

    // Reject .edu emails
    const emailLower = signupEmail.toLowerCase();
    if (emailLower.includes(".edu")) {
      setError("Please input your normal email. Institutional .edu emails are not allowed.");
      return;
    }

    setLoading(true);
    setError("");

    // Create the account (sends confirmation email since auto-confirm is off)
    const result = await signup(signupEmail, signupPassword, {
      name,
      program: "",
      course: "",
      course_name: "",
      year: "",
      semester: "",
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setOtpEmail(signupEmail);
    setAwaitingConfirmation(true);
    toast.success("Confirmation email sent! Check your inbox and click the link.");
  };

  // Listen for auth state change (user clicked confirmation link)
  useEffect(() => {
    if (!awaitingConfirmation) return;
    
    const checkInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        clearInterval(checkInterval);
        setAwaitingConfirmation(false);
        setEmailVerified(true);
        setSignupStep(1);
        toast.success("Email verified! Continue setting up your account.");
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [awaitingConfirmation]);

  // Step 1 → Step 2: Save course info and proceed
  const handleStep1Next = async () => {
    if (!canProceedStep1) { setError("Select course, year, and semester"); return; }
    setError("");

    // Update profile with course info
    if (user) {
      await supabase.from("profiles").update({
        program: selectedCourse?.faculty || "",
        course: selectedCourse?.code || "",
        course_name: selectedCourse?.name || "",
        year,
        semester,
      }).eq("user_id", user.id);
    }

    setSignupStep(2);
  };

  // Step 2 → Step 3: Enroll units and proceed
  const handleStep2Next = async () => {
    if (selectedUnitIds.length === 0) {
      setError("Select at least one unit");
      return;
    }
    setError("");

    // Enroll units
    if (user) {
      const rows = selectedUnitIds.map(unit_id => ({ user_id: user.id, unit_id }));
      await supabase.from("student_units").upsert(rows, { onConflict: "user_id,unit_id", ignoreDuplicates: true });
    }

    setSignupStep(3);
  };

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setUploadFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const computeFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleUploadAndFinish = async () => {
    if (!user) return;

    if (uploadFiles.length === 0) {
      // Skip upload, go to chat
      navigate("/chat", { replace: true });
      return;
    }

    setUploading(true);
    const progress: Record<string, string> = {};

    for (const file of uploadFiles) {
      progress[file.name] = "Checking for duplicates...";
      setUploadProgress({ ...progress });

      try {
        // Compute hash
        const hash = await computeFileHash(file);

        // Check if hash exists
        const { data: existing } = await supabase
          .from("document_hashes")
          .select("id")
          .eq("content_hash", hash)
          .maybeSingle();

        if (existing) {
          progress[file.name] = "⚠️ Duplicate document - skipped";
          setUploadProgress({ ...progress });
          continue;
        }

        progress[file.name] = "Uploading...";
        setUploadProgress({ ...progress });

        // Upload to storage
        const storagePath = `uploads/${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("materials")
          .upload(storagePath, file);

        if (uploadError) {
          progress[file.name] = `❌ Upload failed: ${uploadError.message}`;
          setUploadProgress({ ...progress });
          continue;
        }

        // Determine which unit to associate with (first selected unit)
        const unitId = selectedUnitIds[0] || null;
        const unitCode = unitId ? dbUnits.find(u => u.id === unitId)?.code || "" : "";

        // Create material record
        const { data: material, error: matError } = await supabase
          .from("materials")
          .insert({
            title: file.name.replace(/\.[^.]+$/, ""),
            file_name: file.name,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
            unit_id: unitId || selectedUnitIds[0],
            uploaded_by: user.id,
            storage_path: storagePath,
            embedding_status: "processing",
          })
          .select("id")
          .single();

        if (matError) {
          progress[file.name] = `❌ Error: ${matError.message}`;
          setUploadProgress({ ...progress });
          continue;
        }

        // Insert hash record
        await supabase.from("document_hashes").insert({
          content_hash: hash,
          file_name: file.name,
          unit_id: unitId,
          uploaded_by: user.id,
          material_id: material?.id,
        });

        progress[file.name] = "Processing & embedding...";
        setUploadProgress({ ...progress });

        // Trigger embedding (don't await - let it process in background)
        supabase.functions.invoke("process-document", {
          body: {
            materialId: material?.id,
            title: file.name,
            unitCode,
            storagePath,
            fileType: file.type,
          },
        }).then(({ error: embedError }) => {
          if (embedError) {
            console.error("Embedding error:", embedError);
          }
        });

        progress[file.name] = "✅ Uploaded successfully";
        setUploadProgress({ ...progress });

      } catch (err) {
        progress[file.name] = `❌ Error: ${err instanceof Error ? err.message : "Unknown"}`;
        setUploadProgress({ ...progress });
      }
    }

    setUploading(false);
    toast.success("Setup complete! Welcome to Sekani AI.");

    setTimeout(() => {
      navigate("/chat", { replace: true });
    }, 1500);
  };

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds(prev =>
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

  // Total steps: 0 (details+verify), 1 (course), 2 (units), 3 (upload)
  const totalSteps = 4;
  const currentStepDisplay = emailVerified ? signupStep + 1 : 1;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-primary-foreground">CUEA AI</h1>
          <p className="text-primary-foreground/60 mt-1 font-body">Your University Assistant</p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
          <AnimatePresence mode="wait">
            {/* Awaiting Email Confirmation */}
            {awaitingConfirmation ? (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <MailCheck className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-display font-semibold text-foreground">Check Your Email</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    We sent a confirmation link to<br />
                    <span className="font-semibold text-foreground">{otpEmail}</span>
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                  <p>1. Open your email inbox</p>
                  <p>2. Click the confirmation link</p>
                  <p>3. Come back here — we'll detect it automatically</p>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Waiting for confirmation...</span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    setLoading(true);
                    const { error: resendError } = await supabase.auth.resend({ type: "signup", email: otpEmail });
                    setLoading(false);
                    if (resendError) toast.error(resendError.message);
                    else toast.success("Confirmation email resent!");
                  }}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                  Resend Email
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  <button type="button" onClick={() => { setAwaitingConfirmation(false); setIsLogin(true); setError(""); }} className="text-primary font-semibold hover:underline">
                    Back to Sign In
                  </button>
                </p>
              </motion.div>
            ) : isLogin ? (
              /* LOGIN FORM */
              <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleLogin} className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-display font-semibold text-foreground">Welcome Back</h2>
                  <p className="text-muted-foreground text-sm mt-1">Sign in to continue</p>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border-l-4 border-destructive">{error}</div>
                )}

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
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-maroon hover:opacity-90" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sign In <ArrowRight className="ml-2 w-4 h-4" />
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
                  className="w-full text-center text-sm text-primary hover:underline font-medium"
                >
                  Forgot password?
                </button>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => { setIsLogin(false); setError(""); }} className="text-primary font-semibold hover:underline">Sign Up</button>
                </p>
              </motion.form>
            ) : (
              /* SIGNUP FORM - 4 STEPS */
              <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-display font-semibold text-foreground">Create Account</h2>
                  <p className="text-muted-foreground text-sm mt-1">Step {currentStepDisplay} of {totalSteps}</p>
                  <div className="flex gap-2 mt-3">
                    {[0, 1, 2, 3].map(s => (
                      <div key={s} className={`h-1 flex-1 rounded-full ${signupStep >= s ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border-l-4 border-destructive">{error}</div>
                )}

                <AnimatePresence mode="wait">
                  {/* STEP 0: Name, Email, Password, T&C */}
                  {signupStep === 0 && !emailVerified && (
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
                          <Input type="password" placeholder="Min 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pl-10" required minLength={6} />
                        </div>
                      </div>

                      {/* Terms & Conditions */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="terms"
                            checked={termsAccepted}
                            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                            className="mt-0.5"
                          />
                          <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                            I agree to the{" "}
                            <Link to="/terms" target="_blank" className="text-primary font-semibold hover:underline">
                              Terms & Conditions
                            </Link>{" "}
                            and{" "}
                            <Link to="/terms" target="_blank" className="text-primary font-semibold hover:underline">
                              Privacy Policy
                            </Link>
                          </label>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleStep0Verify}
                        className="w-full bg-gradient-maroon hover:opacity-90"
                        disabled={loading || !canProceedStep0}
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Verify <ShieldCheck className="ml-2 w-4 h-4" />
                      </Button>
                    </motion.div>
                  )}

                  {/* STEP 1: Course, Year, Semester */}
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
                            <SelectTrigger>
                              <SelectValue placeholder="Select your course" />
                            </SelectTrigger>
                            <SelectContent>
                              {dbCourses.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.code} — {c.name}
                                </SelectItem>
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
                        <Button type="button" className="flex-1 bg-gradient-maroon hover:opacity-90" disabled={!canProceedStep1} onClick={handleStep1Next}>
                          Next <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Select Units (filtered by year from code) */}
                  {signupStep === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4" />
                        <span>Select your units for <span className="font-semibold text-foreground">Year {year}</span></span>
                      </div>

                      {filteredUnits.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No units available for this course & year.</p>
                          <p className="text-xs mt-1">You can enroll in units later or contact admin.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {filteredUnits.map(unit => (
                            <label
                              key={unit.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedUnitIds.includes(unit.id)
                                  ? "border-primary bg-primary/5"
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
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {selectedUnitIds.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-primary font-medium">
                          <CheckSquare className="w-3.5 h-3.5" />
                          {selectedUnitIds.length} unit{selectedUnitIds.length !== 1 ? "s" : ""} selected
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setSignupStep(1)} className="flex-1">
                          <ArrowLeft className="mr-2 w-4 h-4" /> Back
                        </Button>
                        <Button type="button" className="flex-1 bg-gradient-maroon hover:opacity-90" onClick={handleStep2Next} disabled={selectedUnitIds.length === 0}>
                          Next <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: Upload Documents */}
                  {signupStep === 3 && (
                    <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="w-4 h-4" />
                        <span>Upload your notes & past papers</span>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Guidelines
                        </p>
                        <p>• Only academic materials (notes, past papers)</p>
                        <p>• Supported: PDF, DOCX, PPTX, TXT</p>
                        <p>• Duplicate documents will be automatically detected</p>
                        <p>• Uploading does not use your chat credits</p>
                      </div>

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
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-dashed border-2"
                        disabled={uploading}
                      >
                        <FileText className="mr-2 w-4 h-4" />
                        Select Files
                      </Button>

                      {uploadFiles.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {uploadFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="flex-1 truncate text-foreground">{file.name}</span>
                              {uploadProgress[file.name] ? (
                                <span className="text-xs text-muted-foreground shrink-0">{uploadProgress[file.name]}</span>
                              ) : (
                                <button type="button" onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setSignupStep(2)} className="flex-1" disabled={uploading}>
                          <ArrowLeft className="mr-2 w-4 h-4" /> Back
                        </Button>
                        <Button
                          type="button"
                          className="flex-1 bg-gradient-maroon hover:opacity-90"
                          onClick={handleUploadAndFinish}
                          disabled={uploading}
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          {uploadFiles.length === 0 ? "Skip & Finish" : "Upload & Finish"} <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {signupStep === 0 && !emailVerified && (
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" onClick={() => { setIsLogin(true); setSignupStep(0); setError(""); }} className="text-primary font-semibold hover:underline">Sign In</button>
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
