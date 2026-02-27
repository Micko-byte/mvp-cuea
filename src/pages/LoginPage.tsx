import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Lock, Mail, User, BookOpen, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROGRAMS = ["Certificate", "Diploma", "Bachelor's", "Master's", "Doctoral"];
const COURSES: Record<string, string[]> = {
  "Certificate": ["Information Technology", "Business Administration"],
  "Diploma": ["Computer Science", "Education", "Theology"],
  "Bachelor's": ["Computer Science", "Law", "Education", "Commerce", "Theology", "Arts"],
  "Master's": ["Computer Science", "Business Administration", "Education", "Theology"],
  "Doctoral": ["Philosophy", "Education", "Theology"],
};

const LoginPage = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  
  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Signup state
  const [signupStep, setSignupStep] = useState(0);
  const [name, setName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [program, setProgram] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = login(email, password);
    if (success) {
      const savedUser = localStorage.getItem("cuea_user");
      const user = savedUser ? JSON.parse(savedUser) : null;
      navigate(user?.role === "admin" ? "/admin" : "/chat");
    } else {
      setError("Invalid credentials. Try admin@cuea.edu / admin123 or john@students.cuea.edu / student123");
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (signupStep < 1) {
      setSignupStep(1);
      return;
    }
    signup({
      name, email: signupEmail, password: signupPassword,
      admissionNumber, program, course, courseName: course, year, semester,
    });
    navigate("/chat");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-primary-foreground">CUEA AI</h1>
          <p className="text-primary-foreground/60 mt-1 font-body">Your University Assistant</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-display font-semibold text-foreground">Welcome Back</h2>
                  <p className="text-muted-foreground text-sm mt-1">Sign in to continue</p>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border-l-4 border-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@cuea.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-maroon hover:opacity-90 transition-opacity">
                  Sign In <ArrowRight className="ml-2 w-4 h-4" />
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => { setIsLogin(false); setError(""); }} className="text-primary font-semibold hover:underline">
                    Sign Up
                  </button>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSignup}
                className="space-y-5"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-display font-semibold text-foreground">Create Account</h2>
                  <p className="text-muted-foreground text-sm mt-1">Step {signupStep + 1} of 2</p>
                  {/* Progress bar */}
                  <div className="flex gap-2 mt-3">
                    <div className={`h-1 flex-1 rounded-full ${signupStep >= 0 ? "bg-primary" : "bg-muted"}`} />
                    <div className={`h-1 flex-1 rounded-full ${signupStep >= 1 ? "bg-primary" : "bg-muted"}`} />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {signupStep === 0 ? (
                    <motion.div key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
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
                          <Input type="password" placeholder="••••••••" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pl-10" required />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Program</Label>
                        <Select value={program} onValueChange={(v) => { setProgram(v); setCourse(""); }}>
                          <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                          <SelectContent>{PROGRAMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {program && (
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Course</Label>
                          <Select value={course} onValueChange={setCourse}>
                            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                            <SelectContent>{COURSES[program]?.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Year</Label>
                          <Select value={year} onValueChange={setYear}>
                            <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                            <SelectContent>{["1","2","3","4","5"].map((y) => <SelectItem key={y} value={y}>Year {y}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Semester</Label>
                          <Select value={semester} onValueChange={setSemester}>
                            <SelectTrigger><SelectValue placeholder="Sem" /></SelectTrigger>
                            <SelectContent>{["1","2","3"].map((s) => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  {signupStep > 0 && (
                    <Button type="button" variant="outline" onClick={() => setSignupStep(0)} className="flex-1">
                      <ArrowLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                  )}
                  <Button type="submit" className="flex-1 bg-gradient-maroon hover:opacity-90">
                    {signupStep === 0 ? "Next" : "Create Account"} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" onClick={() => { setIsLogin(true); setSignupStep(0); setError(""); }} className="text-primary font-semibold hover:underline">
                    Sign In
                  </button>
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
