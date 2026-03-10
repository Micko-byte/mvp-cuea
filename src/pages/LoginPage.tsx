import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Lock, Mail, User, ArrowRight, ArrowLeft, Loader2, BookOpen, CheckSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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

const LoginPage = () => {
  const { login, signup, isAuthenticated, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup state
  const [signupStep, setSignupStep] = useState(0);
  const [name, setName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  // DB data
  const [dbCourses, setDbCourses] = useState<DbCourse[]>([]);
  const [dbUnits, setDbUnits] = useState<DbUnit[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading && !showOtp && isLogin) {
      navigate(role === "admin" ? "/admin" : "/chat", { replace: true });
    }
  }, [isAuthenticated, authLoading, role, navigate, showOtp, isLogin]);

  // Fetch courses and units from DB when switching to signup
  useEffect(() => {
    if (!isLogin) {
      setLoadingData(true);
      Promise.all([
        supabase.from("courses").select("*").eq("is_active", true).order("name"),
        supabase.from("units").select("*").eq("is_active", true).order("name"),
      ]).then(([coursesRes, unitsRes]) => {
        if (coursesRes.data) setDbCourses(coursesRes.data);
        if (unitsRes.data) setDbUnits(unitsRes.data);
        setLoadingData(false);
      });
    }
  }, [isLogin]);

  // Filter units by selected course, year, semester
  const filteredUnits = dbUnits.filter(u =>
    u.course_id === selectedCourseId &&
    (year ? u.year === parseInt(year) : true) &&
    (semester ? u.semester === parseInt(semester) : true)
  );

  const selectedCourse = dbCourses.find(c => c.id === selectedCourseId);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  const canProceedStep0 = name && admissionNumber && signupEmail && signupPassword.length >= 6;
  const canProceedStep1 = selectedCourseId && year && semester;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupStep === 0) {
      if (!canProceedStep0) { setError("Fill all fields (password min 6 chars)"); return; }
      // Enforce @cuea.edu email format
      const emailDomain = signupEmail.split("@")[1]?.toLowerCase();
      if (!emailDomain || !emailDomain.endsWith("cuea.edu")) {
        setError("Please use your CUEA email (e.g. you@students.cuea.edu or you@cuea.edu)");
        return;
      }
      setSignupStep(1);
      setError("");
      return;
    }
    if (signupStep === 1) {
      if (!canProceedStep1) { setError("Select course, year, and semester"); return; }
      setSignupStep(2);
      setError("");
      return;
    }

    // Step 2: Create account
    setLoading(true);
    setError("");
    const result = await signup(signupEmail, signupPassword, {
      name,
      admission_number: admissionNumber,
      program: selectedCourse?.faculty || "",
      course: selectedCourse?.code || "",
      course_name: selectedCourse?.name || "",
      year,
      semester,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    // Store selected units for enrollment after verification
    if (selectedUnitIds.length > 0) {
      localStorage.setItem("pendingUnitEnrollments", JSON.stringify(selectedUnitIds));
    }

    // Show OTP verification screen
    setOtpEmail(signupEmail);
    setShowOtp(true);
    setOtpCode("");
    toast.success("Verification code sent to your email!");
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true);
    setError("");
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: otpEmail,
      token: otpCode,
      type: "signup",
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    toast.success("Email verified! You're now signed in.");
    setShowOtp(false);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: otpEmail,
    });
    setLoading(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    toast.success("New verification code sent!");
  };

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds(prev =>
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

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
          <p className="text-primary-foreground/40 text-xs mt-2">🚀 Launch: Computer Science Department</p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
          <AnimatePresence mode="wait">
            {showOtp ? (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-display font-semibold text-foreground">Verify Your Email</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Enter the 6-digit code sent to<br />
                    <span className="font-semibold text-foreground">{otpEmail}</span>
                  </p>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border-l-4 border-destructive">{error}</div>
                )}

                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  className="w-full bg-gradient-maroon hover:opacity-90"
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verify & Sign In <ArrowRight className="ml-2 w-4 h-4" />
                </Button>

                <div className="text-center space-y-2">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Resend code
                  </button>
                  <p className="text-sm text-muted-foreground">
                    <button type="button" onClick={() => { setShowOtp(false); setIsLogin(true); setError(""); }} className="text-primary font-semibold hover:underline">
                      Back to Sign In
                    </button>
                  </p>
                </div>
              </motion.div>
            ) : isLogin ? (
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
                    <Input type="email" placeholder="you@cuea.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
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
              <motion.form key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSignup} className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-display font-semibold text-foreground">Create Account</h2>
                  <p className="text-muted-foreground text-sm mt-1">Step {signupStep + 1} of 3</p>
                  <div className="flex gap-2 mt-3">
                    {[0, 1, 2].map(s => (
                      <div key={s} className={`h-1 flex-1 rounded-full ${signupStep >= s ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border-l-4 border-destructive">{error}</div>
                )}

                <AnimatePresence mode="wait">
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
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Admission Number</Label>
                        <Input placeholder="CUEA/2024/001" value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" placeholder="you@students.cuea.edu" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="pl-10" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="password" placeholder="Min 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pl-10" required minLength={6} />
                        </div>
                      </div>
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
                    </motion.div>
                  )}

                  {signupStep === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4" />
                        <span>Select your units for <span className="font-semibold text-foreground">Year {year}, Semester {semester}</span></span>
                      </div>

                      {filteredUnits.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No units available for this course, year & semester.</p>
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
                                {unit.lecturer && (
                                  <p className="text-xs text-muted-foreground mt-0.5">Lecturer: {unit.lecturer}</p>
                                )}
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
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  {signupStep > 0 && (
                    <Button type="button" variant="outline" onClick={() => setSignupStep(s => s - 1)} className="flex-1">
                      <ArrowLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                  )}
                  <Button type="submit" className="flex-1 bg-gradient-maroon hover:opacity-90" disabled={loading || (signupStep === 1 && !canProceedStep1)}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {signupStep < 2 ? "Next" : "Create Account"} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" onClick={() => { setIsLogin(true); setSignupStep(0); setError(""); }} className="text-primary font-semibold hover:underline">Sign In</button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
