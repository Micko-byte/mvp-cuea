import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, MessageSquare, BarChart3, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: MessageSquare, title: "AI-Powered Chat", desc: "Get instant answers about your courses, assignments, and schedules" },
  { icon: BookOpen, title: "Course Materials", desc: "Access lecture notes, past papers, and study resources" },
  { icon: BarChart3, title: "Smart Analytics", desc: "Track your academic progress and study patterns" },
  { icon: Sparkles, title: "Personalized", desc: "Tailored to your specific program, courses, and units" },
];

const Index = () => {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate(role === "admin" ? "/admin" : "/chat");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 inset-x-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-maroon flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground text-xl">CUEA AI</span>
          </div>
          <Button onClick={handleGetStarted} className="bg-gradient-maroon hover:opacity-90">
            {isAuthenticated ? "Go to Dashboard" : "Get Started"} <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" /> AI-Powered University Assistant
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground leading-tight mb-6">
              Your Academic<br /><span className="text-gradient-maroon">Success Partner</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Get instant help with assignments, access course materials, check your schedule, and prepare for exams — all powered by AI trained on your university's curriculum.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleGetStarted} size="lg" className="bg-gradient-maroon hover:opacity-90 px-8 h-12 text-base">
                Start Chatting <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base border-primary/20 text-primary hover:bg-primary/5">Learn More</Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-foreground mb-3">Everything You Need</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Designed specifically for CUEA students to excel in their academic journey.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="bg-card rounded-2xl border border-border p-6 shadow-card hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /><span className="font-display font-semibold text-foreground">CUEA AI</span></div>
          <p className="text-sm text-muted-foreground">© 2026 Catholic University of Eastern Africa</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
