// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import logoSns from "@/assets/logo-sns.png";
import snsCharacter from "@/assets/sns-character.png";

/* ── Inline SVG Icon helper ── */
const Icon = ({ d, size = 20, stroke = "currentColor", strokeWidth = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const ICONS = {
  chat: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  book: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
  lightning: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  globe: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"],
  arrow: "M5 12h14M12 5l7 7-7 7",
  menu: ["M3 12h18", "M3 6h18", "M3 18h18"],
  x: ["M18 6L6 18", "M6 6l12 12"],
  check: "M20 6L9 17l-5-5",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  users: ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M23 21v-2a4 4 0 0 0-3-3.87", "M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M16 3.13a4 4 0 0 1 0 7.75"],
  brain: ["M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.66z", "M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.66z"],
  chart: ["M18 20V10", "M12 20V4", "M6 20v-6"],
  file: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8", "M10 9H8"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
};

/* ── Chat Demo Data ── */
const CHAT_SEQUENCE = [
  {
    role: "user",
    text: "When is my Communication Skills exam according to the school exam timetable?",
    delay: 800,
  },
  {
    role: "ai",
    text: "Your Communication Skills exam is scheduled for:\n\n📅 **Date:** Thursday 16th April 2026\n🕐 **Time:** 10:00 AM - 12:00 PM\n📍 **Venue:** Block A, Room D\n\nAll the best in your preparation! 💪",
    delay: 2000,
    showDots: true,
    dotsDelay: 1200,
  },
  {
    role: "user",
    text: "Could you get me notes on Unit 5 Communication Skills and generate a practice paper for me from past papers that are there?",
    delay: 2500,
  },
  {
    role: "ai",
    text: "Here are your notes on Communication Skills and the practice paper. All the best in your exam revision! 📚✨",
    delay: 2000,
    showDots: true,
    dotsDelay: 1000,
    attachments: [
      { name: "Unit_5_Communication_Skills_Notes.pdf", size: "2.4 MB" },
      { name: "Practice_Paper_CommSkills_2026.pdf", size: "1.1 MB" },
    ],
  },
];

/* ── Features ── */
const FEATURES = [
  { icon: "chat", title: "Instant AI Chat", tag: "Core", desc: "Ask anything about your courses, deadlines, or assignments. Get human-quality answers 24/7." },
  { icon: "book", title: "Course Material Hub", tag: "Content", desc: "All your lecture notes, past papers, and study resources in one searchable, intelligent library." },
  { icon: "chart", title: "Progress Analytics", tag: "Insights", desc: "Track your academic trajectory. Identify weak areas and prepare smarter for assessments." },
  { icon: "brain", title: "Curriculum-Trained AI", tag: "Intelligence", desc: "Trained on your university's specific syllabi, units, and academic calendar — si generic chatbot." },
  { icon: "lightning", title: "Exam Preparation", tag: "Academic", desc: "Generate practice questions, get topic summaries, and step-by-step explanations for your exams." },
  { icon: "shield", title: "Private & Secure", tag: "Trust", desc: "Your academic data stays yours. GDPR-aligned and built with student privacy first. Hakuna stress." },
];

/* ── Chapters ── */
const CHAPTERS = [
  { name: "CUEA Chapter", status: "active", university: "Catholic University of Eastern Africa", students: "500+", link: "/login" },
  { name: "Strathmore Chapter", status: "coming", university: "Strathmore University", students: "—" },
  { name: "KU Chapter", status: "coming", university: "Kenyatta University", students: "—" },
];

/* ── Testimonials ── */
const TESTIMONIALS = [
  { quote: "I used to spend hours searching for past papers and notes. Soma na Sekani finds everything in seconds na hata explains concepts I missed in class.", name: "Aisha M.", prog: "BSc Computer Science, Year 3" },
  { quote: "The exam prep feature is genuinely impressive. It generates questions that mirror the actual exam style for my specific units.", name: "Kevin O.", prog: "Bachelor of Commerce, Year 2" },
  { quote: "As someone who works part-time, having a 24/7 academic assistant has been life-changing for keeping up with coursework.", name: "Grace W.", prog: "BA Communications, Year 4" },
];

const NAV_LINKS = ["Features", "Chapters", "Demo", "About"];

/* ═══════ MAIN COMPONENT ═══════ */
export default function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <>
      <style>{`
        :root {
          --teal: #4DBFB3;
          --teal-dark: #2A9D8F;
          --teal-deep: #1A7A6F;
          --yellow: #E8B931;
          --yellow-lt: #F5D565;
          --yellow-dk: #C9A020;
          --cream: #FFF9F0;
          --white: #FFFFFF;
          --ink: #1A2332;
          --ink-lt: #3D4F63;
          --muted: #6B7B8D;
          --border-sns: rgba(77,191,179,0.15);
          --card: #FFFFFF;
        }
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(77,191,179,0.2); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--teal); border-radius: 4px; }
        @media(max-width:900px){.desktop-nav{display:none!important}.mobile-menu-btn{display:flex!important}}
        @media(max-width:900px){#hero-grid{grid-template-columns:1fr!important;text-align:center}#hero-btns{justify-content:center!important}}
        @media(max-width:900px){#feat-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(max-width:580px){#feat-grid{grid-template-columns:1fr!important}}
        @media(max-width:860px){#chapters-grid{grid-template-columns:1fr!important}}
        @media(max-width:860px){#testimonials-grid{grid-template-columns:1fr!important}}
      `}</style>

      {/* ── NAVBAR ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid var(--border-sns)" : "none",
          transition: "all 0.4s", padding: "0 1.5rem",
        }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => scrollTo("hero")}>
            <img src={logoSns} alt="Soma na Sekani" style={{ height: 40 }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: "var(--ink)" }}>
              Soma na <span style={{ color: "var(--teal-dark)" }}>Sekani</span>
            </span>
          </div>

          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {NAV_LINKS.map((link) => (
              <button key={link} onClick={() => scrollTo(link.toLowerCase().replace(/\s+/g, "-"))}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--ink-lt)", fontFamily: "'DM Sans', sans-serif", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.target.style.color = "var(--teal-dark)"}
                onMouseLeave={(e) => e.target.style.color = "var(--ink-lt)"}>
                {link}
              </button>
            ))}
            <a href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
              background: "var(--teal)", color: "white", fontWeight: 600, fontSize: 14,
              padding: "10px 22px", borderRadius: 30, transition: "all 0.2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--teal-dark)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--teal)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              Get Started
            </a>
          </div>

          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "none", color: "var(--ink)" }}>
            <Icon d={menuOpen ? ICONS.x : ICONS.menu} size={22} />
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ background: "rgba(255,255,255,0.98)", backdropFilter: "blur(16px)", borderTop: "1px solid var(--border-sns)", padding: "12px 1.5rem 20px", overflow: "hidden" }}>
              {NAV_LINKS.map((link) => (
                <button key={link} onClick={() => scrollTo(link.toLowerCase().replace(/\s+/g, "-"))}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 0", fontSize: 17, fontWeight: 500, color: "var(--ink-lt)", borderBottom: "1px solid var(--border-sns)", fontFamily: "'DM Sans', sans-serif" }}>
                  {link}
                </button>
              ))}
              <a href="/login" style={{ display: "block", textAlign: "center", background: "var(--teal)", color: "white", fontWeight: 600, fontSize: 15, padding: "12px", borderRadius: 12, marginTop: 12, textDecoration: "none" }}>
                Get Started
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ═══════ HERO ═══════ */}
      <section id="hero" style={{
        position: "relative", minHeight: "100vh", display: "flex", alignItems: "center",
        overflow: "hidden", padding: "7rem 1.5rem 4rem",
        background: "linear-gradient(160deg, #E8F8F5 0%, #D1F0EB 30%, #F0FAF8 60%, #FFF9F0 100%)",
      }}>
        {/* Wave SVG background decoration */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <svg viewBox="0 0 1440 400" style={{ position: "absolute", bottom: -2, width: "100%", height: "auto", opacity: 0.12 }}>
            <path d="M0,160L48,170.7C96,181,192,203,288,192C384,181,480,139,576,128C672,117,768,139,864,165.3C960,192,1056,224,1152,213.3C1248,203,1344,149,1392,122.7L1440,96L1440,400L0,400Z" fill="var(--teal)" />
          </svg>
          <svg viewBox="0 0 1440 400" style={{ position: "absolute", bottom: -2, width: "100%", height: "auto", opacity: 0.07 }}>
            <path d="M0,256L60,245.3C120,235,240,213,360,208C480,203,600,213,720,229.3C840,245,960,267,1080,261.3C1200,256,1320,224,1380,208L1440,192L1440,400L0,400Z" fill="var(--teal-dark)" />
          </svg>
        </div>

        {/* Floating circles */}
        <motion.div animate={{ y: [0, -20, 0], x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          style={{ position: "absolute", top: "15%", right: "10%", width: 180, height: 180, borderRadius: "50%", background: "rgba(77,191,179,0.08)", pointerEvents: "none" }} />
        <motion.div animate={{ y: [0, 15, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
          style={{ position: "absolute", bottom: "20%", left: "5%", width: 120, height: 120, borderRadius: "50%", background: "rgba(232,185,49,0.1)", pointerEvents: "none" }} />

        <div id="hero-grid" style={{
          maxWidth: 1180, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center",
        }}>
          {/* Left - Text */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(77,191,179,0.12)", border: "1px solid rgba(77,191,179,0.25)", borderRadius: 100, padding: "6px 16px", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--teal-dark)", letterSpacing: "0.04em" }}>🎓 AI-Powered Campus Companion</span>
            </motion.div>

            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 700,
              lineHeight: 1.1, color: "var(--ink)", marginBottom: "1.5rem", letterSpacing: "-0.02em",
            }}>
              Soma na{" "}
              <span style={{
                color: "var(--teal-dark)",
                background: "linear-gradient(135deg, var(--teal-dark), var(--teal))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Sekani!</span>
            </h1>

            <p style={{ fontSize: 19, lineHeight: 1.7, color: "var(--muted)", maxWidth: 480, marginBottom: "2.5rem" }}>
              <strong style={{ color: "var(--ink)" }}>Your campus AI assistant.</strong>{" "}
              Smart, personalized academic support for every university student across Kenya. Study smarter, ace your exams. 🚀
            </p>

            <div id="hero-btns" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <a href="/login" style={{
                display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
                background: "linear-gradient(135deg, var(--teal), var(--teal-dark))", color: "white",
                fontWeight: 700, fontSize: 16, padding: "15px 32px", borderRadius: 30,
                boxShadow: "0 8px 32px rgba(77,191,179,0.3)", transition: "all 0.3s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(77,191,179,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(77,191,179,0.3)"; }}>
                Get Started Free <Icon d={ICONS.arrow} size={16} stroke="white" />
              </a>
              <button onClick={() => scrollTo("demo")} style={{
                display: "inline-flex", alignItems: "center", gap: 8, background: "white",
                border: "2px solid var(--border-sns)", color: "var(--ink)", fontWeight: 600, fontSize: 16,
                padding: "14px 28px", borderRadius: 30, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.3s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-sns)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                See It In Action ▶
              </button>
            </div>
          </motion.div>

          {/* Right - Character */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
            style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
            <motion.img src={snsCharacter} alt="Sekani - your campus AI buddy" 
              animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              style={{ width: "clamp(280px, 90%, 420px)", height: "auto", filter: "drop-shadow(0 20px 40px rgba(77,191,179,0.2))" }} />
            
            {/* Floating badge */}
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              style={{ position: "absolute", top: "10%", right: "5%", background: "white", borderRadius: 16, padding: "10px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border-sns)" }}>
              <Icon d={ICONS.lightning} size={16} stroke="var(--yellow)" strokeWidth={2} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>AI-Powered</span>
            </motion.div>

            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
              style={{ position: "absolute", bottom: "15%", left: "0%", background: "white", borderRadius: 16, padding: "10px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border-sns)" }}>
              <Icon d={ICONS.shield} size={16} stroke="var(--teal)" strokeWidth={2} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Curriculum-Aware</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ STATS BAND ═══════ */}
      <StatsSection />

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" style={{ padding: "6rem 1.5rem", background: "var(--cream)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionLabel text="What Sekani Can Do" />
          <motion.h2 {...fadeUp(0.1)} style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700,
            color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "1rem",
          }}>
            Everything a student needs,<br />
            <span style={{ color: "var(--teal-dark)", fontStyle: "italic" }}>finally in one place.</span>
          </motion.h2>
          <motion.p {...fadeUp(0.15)} style={{ fontSize: 16, lineHeight: 1.8, color: "var(--muted)", marginBottom: "3rem", maxWidth: 560 }}>
            Soma na Sekani isn't a generic tool repurposed for academia. It's purpose-built for uni students — trained on real curricula, designed for real academic workflows. Bora zaidi? It's free to start.
          </motion.p>
          <div id="feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {FEATURES.map((f, i) => <FeatureCard key={f.title} feature={f} delay={i * 0.08} />)}
          </div>
        </div>
      </section>

      {/* ═══════ LIVE CHAT DEMO ═══════ */}
      <section id="demo" style={{
        padding: "6rem 1.5rem",
        background: "linear-gradient(180deg, var(--cream) 0%, #E8F8F5 50%, var(--cream) 100%)",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <SectionLabel text="See It In Action" />
          <motion.h2 {...fadeUp(0.1)} style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 700,
            color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "1rem",
          }}>
            Soma na Sekani <span style={{ color: "var(--teal-dark)", fontStyle: "italic" }}>in action.</span>
          </motion.h2>
          <motion.p {...fadeUp(0.15)} style={{ fontSize: 16, color: "var(--muted)", marginBottom: "2.5rem", maxWidth: 560 }}>
            Watch how students interact with Sekani to get instant academic help. No cap, it's this easy. 🎯
          </motion.p>
          <ChatDemo />
        </div>
      </section>

      {/* ═══════ CHAPTERS ═══════ */}
      <section id="chapters" style={{ padding: "6rem 1.5rem", background: "var(--ink)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionLabel text="Chapters" light />
          <motion.h2 {...fadeUp(0.1)} style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700,
            color: "white", letterSpacing: "-0.02em", marginBottom: "1rem",
          }}>
            Join your campus <span style={{ color: "var(--yellow)", fontStyle: "italic" }}>chapter.</span>
          </motion.h2>
          <motion.p {...fadeUp(0.15)} style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", marginBottom: "3rem", maxWidth: 520 }}>
            We're rolling out across universities in Kenya. Find your chapter and get started — ama be the first to bring Sekani to your campus!
          </motion.p>
          <div id="chapters-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {CHAPTERS.map((ch, i) => <ChapterCard key={ch.name} chapter={ch} delay={i * 0.1} />)}
          </div>
        </div>
      </section>

      {/* ═══════ ABOUT ═══════ */}
      <section id="about" style={{ padding: "6rem 1.5rem", background: "var(--cream)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(77,191,179,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <SectionLabel text="About The Mission" center />
          <motion.h2 {...fadeUp(0.1)} style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700,
            color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "1.5rem",
          }}>
            Built to scale across <span style={{ color: "var(--teal-dark)", fontStyle: "italic" }}>every campus in Kenya.</span>
          </motion.h2>
          <motion.p {...fadeUp(0.18)} style={{ fontSize: 17, lineHeight: 1.85, color: "var(--muted)", marginBottom: "2rem", maxWidth: 640, margin: "0 auto 2rem" }}>
            Soma na Sekani gives every university student access to AI-powered academic support. We are onboarding partner institutions and offering early access to administrators. Our mission? To make quality academic AI accessible to every student, regardless of their institution.
          </motion.p>
          <motion.p {...fadeUp(0.22)} style={{ fontSize: 15, color: "var(--muted)", marginBottom: "2.5rem", maxWidth: 520, margin: "0 auto 2.5rem" }}>
            Built by students, for students. Powered by{" "}
            <a href="https://notifyai.org/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-dark)", textDecoration: "none", fontWeight: 600 }}>Notify AI</a>.
          </motion.p>
          <motion.div {...fadeUp(0.28)} style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
              background: "linear-gradient(135deg, var(--yellow), var(--yellow-dk))", color: "var(--ink)",
              fontWeight: 700, fontSize: 16, padding: "15px 32px", borderRadius: 30,
              boxShadow: "0 8px 24px rgba(232,185,49,0.3)", transition: "all 0.3s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
              Get Free Access <Icon d={ICONS.arrow} size={16} stroke="var(--ink)" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section style={{ padding: "6rem 1.5rem", background: "linear-gradient(180deg, #E8F8F5 0%, var(--cream) 100%)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionLabel text="Student Stories" />
          <motion.h2 {...fadeUp(0.1)} style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 700,
            color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "3rem",
          }}>
            Heard from students <span style={{ color: "var(--teal-dark)", fontStyle: "italic" }}>who use it daily.</span>
          </motion.h2>
          <div id="testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} {...fadeUp(0.1 + i * 0.1)} style={{
                background: "white", borderRadius: 20, padding: "2rem", border: "1px solid var(--border-sns)",
                boxShadow: "0 4px 24px rgba(77,191,179,0.06)", transition: "all 0.3s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(77,191,179,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(77,191,179,0.06)"; }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                  {[...Array(5)].map((_, si) => <Icon key={si} d={ICONS.star} size={14} stroke="var(--yellow)" fill="var(--yellow)" strokeWidth={0} />)}
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--ink-lt)", marginBottom: 20, fontStyle: "italic" }}>"{t.quote}"</p>
                <div style={{ borderTop: "1px solid var(--border-sns)", paddingTop: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{t.prog}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{ background: "var(--ink)", padding: "3rem 1.5rem", borderTop: "1px solid rgba(77,191,179,0.1)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={logoSns} alt="Soma na Sekani" style={{ height: 36 }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: "white" }}>
              Soma na <span style={{ color: "var(--teal)" }}>Sekani</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center" }}>
            {["Features", "Chapters", "Demo", "About"].map((l) => (
              <button key={l} onClick={() => scrollTo(l.toLowerCase().replace(/\s+/g, "-"))}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.target.style.color = "white"}
                onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.4)"}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.05)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Powered by{" "}
              <a href="https://notifyai.org/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal)", textDecoration: "none", fontWeight: 600 }}>Notify AI</a>
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", maxWidth: 520 }}>
              This is an independent student initiative. Soma na Sekani is not officially affiliated with or endorsed by any university.
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>
              © {new Date().getFullYear()} Soma na Sekani. Built by students, for students.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ════════════════ SUB-COMPONENTS ════════════════ */

function SectionLabel({ text, light, center }: { text: string; light?: boolean; center?: boolean }) {
  return (
    <motion.div {...fadeUp(0)} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem", justifyContent: center ? "center" : "flex-start" }}>
      <div style={{ width: 24, height: 2, background: light ? "var(--yellow)" : "var(--teal)", borderRadius: 2 }} />
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: light ? "var(--yellow)" : "var(--teal-dark)", textTransform: "uppercase" }}>{text}</span>
    </motion.div>
  );
}

function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const STATS = [
    { value: "500+", label: "Active Students" },
    { value: "98%", label: "Satisfaction Rate" },
    { value: "50+", label: "Programmes Covered" },
    { value: "< 2s", label: "Response Time" },
  ];
  return (
    <div ref={ref} style={{ background: "white", borderTop: "1px solid var(--border-sns)", borderBottom: "1px solid var(--border-sns)", padding: "2.5rem 1.5rem" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2rem" }}>
        <style>{`@media(max-width:640px){#stats-g{grid-template-columns:repeat(2,1fr)!important}}`}</style>
        <div id="stats-g" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2rem", gridColumn: "1/-1" }}>
          {STATS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1, duration: 0.5 }} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2.8rem", fontWeight: 700, color: "var(--teal-dark)", lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ feature: f, delay }: { feature: any; delay: number }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div {...fadeUp(delay)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "white" : "rgba(255,255,255,0.7)", border: `1.5px solid ${hov ? "rgba(77,191,179,0.3)" : "var(--border-sns)"}`,
        borderRadius: 20, padding: "2rem", transition: "all 0.3s", transform: hov ? "translateY(-6px)" : "none",
        boxShadow: hov ? "0 16px 48px rgba(77,191,179,0.12)" : "none", cursor: "default",
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, background: hov ? "rgba(77,191,179,0.12)" : "rgba(77,191,179,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s",
        }}>
          <Icon d={ICONS[f.icon]} size={22} stroke="var(--teal-dark)" />
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--teal-dark)", letterSpacing: "0.08em", background: "rgba(77,191,179,0.08)", padding: "4px 10px", borderRadius: 100, border: "1px solid rgba(77,191,179,0.15)", textTransform: "uppercase" }}>{f.tag}</span>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>{f.title}</h3>
      <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7 }}>{f.desc}</p>
    </motion.div>
  );
}

function ChapterCard({ chapter: ch, delay }: { chapter: any; delay: number }) {
  const [hov, setHov] = useState(false);
  const isActive = ch.status === "active";
  return (
    <motion.div {...fadeUp(delay)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: isActive ? "linear-gradient(135deg, rgba(77,191,179,0.1), rgba(77,191,179,0.05))" : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${isActive ? "rgba(77,191,179,0.3)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 20, padding: "2.5rem 2rem", transition: "all 0.3s", position: "relative", overflow: "hidden",
        transform: hov ? "translateY(-4px)" : "none",
        boxShadow: hov && isActive ? "0 16px 48px rgba(77,191,179,0.15)" : "none",
      }}>
      {isActive && (
        <div style={{ position: "absolute", top: 16, right: 16, background: "var(--teal)", color: "white", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100 }}>
          LIVE
        </div>
      )}
      <div style={{ width: 56, height: 56, borderRadius: 16, background: isActive ? "rgba(77,191,179,0.15)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Icon d={ICONS.globe} size={26} stroke={isActive ? "var(--teal)" : "rgba(255,255,255,0.3)"} />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 6 }}>{ch.name}</h3>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>{ch.university}</p>
      {isActive && <p style={{ fontSize: 13, color: "var(--teal)", fontWeight: 600, marginBottom: 20 }}>👥 {ch.students} students active</p>}

      {isActive ? (
        <a href={ch.link}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
            background: hov ? "var(--teal)" : "transparent", color: hov ? "white" : "var(--teal)",
            border: "1.5px solid var(--teal)", fontWeight: 600, fontSize: 14, padding: "10px 24px",
            borderRadius: 30, transition: "all 0.3s",
          }}>
          Join Chapter <Icon d={ICONS.arrow} size={14} stroke={hov ? "white" : "var(--teal)"} />
        </a>
      ) : (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 14, padding: "10px 24px", borderRadius: 30, border: "1.5px solid rgba(255,255,255,0.08)" }}>
          Coming Soon 🔜
        </div>
      )}
    </motion.div>
  );
}

/* ═══════ LIVE CHAT DEMO COMPONENT ═══════ */
function ChatDemo() {
  const [messages, setMessages] = useState<any[]>([]);
  const [showDots, setShowDots] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [started, setStarted] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView && !started) {
      setStarted(true);
    }
  }, [isInView]);

  useEffect(() => {
    if (!started || currentStep >= CHAT_SEQUENCE.length) return;

    const msg = CHAT_SEQUENCE[currentStep];
    const timer = setTimeout(() => {
      if (msg.showDots) {
        setShowDots(true);
        setTimeout(() => {
          setShowDots(false);
          setMessages((prev) => [...prev, msg]);
          setCurrentStep((s) => s + 1);
        }, msg.dotsDelay || 1000);
      } else {
        setMessages((prev) => [...prev, msg]);
        setCurrentStep((s) => s + 1);
      }
    }, msg.delay);

    return () => clearTimeout(timer);
  }, [started, currentStep]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, showDots]);

  return (
    <motion.div ref={sectionRef} {...fadeUp(0.2)} style={{
      background: "white", borderRadius: 24, overflow: "hidden",
      boxShadow: "0 24px 80px rgba(77,191,179,0.12), 0 4px 20px rgba(0,0,0,0.06)",
      border: "1.5px solid var(--border-sns)",
    }}>
      {/* Chat header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "18px 24px",
        borderBottom: "1px solid var(--border-sns)", background: "linear-gradient(135deg, #E8F8F5, #F0FAF8)",
      }}>
        <img src={snsCharacter} alt="Sekani" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover" }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>Soma na Sekani</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Online · Responds instantly</span>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div ref={chatRef} style={{ padding: "24px", minHeight: 320, maxHeight: 480, overflowY: "auto" }}>
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35 }}
              style={{ marginBottom: 16, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div>
                <div style={{
                  maxWidth: 380, padding: "12px 18px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg, var(--teal), var(--teal-dark))" : "#F0FAF8",
                  color: msg.role === "user" ? "white" : "var(--ink)", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-line",
                }}>
                  {msg.text.split("**").map((part: string, pi: number) => pi % 2 === 1 ? <strong key={pi}>{part}</strong> : part)}
                </div>
                {msg.attachments && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {msg.attachments.map((att: any, ai: number) => (
                      <motion.div key={ai} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + ai * 0.15 }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, background: "white", border: "1.5px solid var(--border-sns)",
                          borderRadius: 14, padding: "10px 16px", cursor: "pointer", transition: "all 0.2s",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.transform = "translateX(4px)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-sns)"; e.currentTarget.style.transform = "translateX(0)"; }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(77,191,179,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon d={ICONS.file} size={18} stroke="var(--teal-dark)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{att.size}</div>
                        </div>
                        <Icon d={ICONS.download} size={16} stroke="var(--teal)" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing dots */}
        {showDots && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", marginBottom: 16 }}>
            <div style={{ background: "#F0FAF8", borderRadius: "18px 18px 18px 4px", padding: "12px 18px", display: "inline-flex", gap: 5 }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <motion.span key={i} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", display: "inline-block", opacity: 0.6 }} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !started && (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--muted)" }}>
            <p style={{ fontSize: 15 }}>Watch the demo conversation unfold...</p>
          </div>
        )}
      </div>

      {/* Input area (decorative) */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-sns)", background: "#FAFBFC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "white", border: "1.5px solid var(--border-sns)", borderRadius: 30, padding: "10px 20px" }}>
          <span style={{ flex: 1, fontSize: 14, color: "var(--muted)" }}>Ask Sekani anything...</span>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--teal), var(--teal-dark))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={ICONS.arrow} size={16} stroke="white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Helper: reusable fade-up animation ── */
function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
  };
}
