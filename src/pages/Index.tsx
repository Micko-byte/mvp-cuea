// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import logoSns from "@/assets/sns-logo.png";
import snsCharacter from "@/assets/sns-character.png";
import studentsStairs from "@/assets/students-stairs.jpg";
import TalkToUsModal from "@/components/TalkToUsModal";

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
    text: "Your Communication Skills exam is scheduled for:\n\nDate: Thursday 16th April 2026\nTime: 10:00 AM - 12:00 PM\nVenue: Block A, Room D\n\nAll the best in your preparation!",
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
    text: "Here are your notes on Communication Skills and the practice paper. All the best in your exam revision!",
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
  { quote: "Maze this thing ni kitu mob! Hadi nikipata notes last minute before exam Sekani ananisort proper. Best tool imetokea campus wallahi.", name: "Kevin O.", prog: "Bachelor of Commerce, Year 2" },
  { quote: "As someone who works part-time, having a 24/7 academic assistant has been life-changing for keeping up with coursework.", name: "Grace W.", prog: "BA Communications, Year 4" },
];

const NAV_LINKS = ["Features", "Chapters", "Demo", "About"];

/* ── Typing speech bubble hook ── */
function useTypingEffect(text: string, speed = 60, startDelay = 1500) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);
  useEffect(() => {
    if (!started) return;
    if (displayed.length < text.length) {
      const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed);
      return () => clearTimeout(t);
    }
  }, [started, displayed, text, speed]);
  return displayed;
}

/* ═══════ MAIN COMPONENT ═══════ */
export default function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [talkModalOpen, setTalkModalOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 20);
      if (currentY > lastScrollY.current && currentY > 80) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,100..900;1,100..900&display=swap');
        :root {
          --teal: #4DBFB3;
          --teal-dark: #2A9D8F;
          --teal-deep: #1A7A6F;
          --yellow: #FFC700;
          --yellow-lt: #FFD740;
          --yellow-dk: #E0AF00;
          --yellow-warm: #F5A623;
          --cream: #FFF9F0;
          --cream-yellow: #FFFDE8;
          --white: #FFFFFF;
          --ink: #1C2838;
          --ink-lt: #3D4F63;
          --muted: #374151;
          --border-sns: rgba(77,191,179,0.15);
          --card: #FFFFFF;
        }
        * { font-family: 'Noto Serif', serif !important; }
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(255,199,0,0.25); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--teal); border-radius: 4px; }
        @media(max-width:900px){.desktop-nav{display:none!important}.mobile-menu-btn{display:flex!important}}
        @media(max-width:900px){#hero-grid{grid-template-columns:1fr!important;text-align:center}#hero-btns{justify-content:center!important;flex-direction:column;align-items:center}#hero-character{justify-content:center!important}}
        @media(max-width:900px){#feat-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(max-width:580px){#feat-grid{grid-template-columns:1fr!important}}
        @media(max-width:860px){#chapters-grid{grid-template-columns:1fr!important}}
        html, body { color-scheme: light !important; }
        html.dark, body.dark, .dark { background-color: #FFFFFF !important; color: #1C2838 !important; }
        @media(max-width:860px){#testimonials-grid{grid-template-columns:1fr!important}}
        @media(max-width:960px){#demo-layout{grid-template-columns:1fr!important}#demo-student{display:none!important}}
        @media(max-width:900px){.speech-bubble-wrap{top:auto!important;bottom:0%!important;right:50%!important;transform:translateX(50%)!important}}
      `}</style>

      {/* ── NAVBAR ── */}
      <motion.nav
        animate={{ y: navVisible ? 0 : -80, opacity: navVisible ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid var(--border-sns)" : "none",
          padding: "0 1.5rem",
        }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => scrollTo("hero")}>
            <img src={logoSns} alt="Soma na Sekani" style={{ height: 90 }} />
          </div>

          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {NAV_LINKS.map((link) => (
              <button key={link} onClick={() => scrollTo(link.toLowerCase().replace(/\s+/g, "-"))}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--ink-lt)", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.target.style.color = "var(--teal-dark)"}
                onMouseLeave={(e) => e.target.style.color = "var(--ink-lt)"}>
                {link}
              </button>
            ))}
            <a href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
              background: "var(--yellow)", color: "var(--ink)", fontWeight: 700, fontSize: 14,
              padding: "10px 22px", borderRadius: 30, transition: "all 0.2s",
              boxShadow: "0 4px 16px rgba(255,199,0,0.3)",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--yellow-dk)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--yellow)"; e.currentTarget.style.transform = "translateY(0)"; }}>
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
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "14px 0", fontSize: 17, fontWeight: 500, color: "var(--ink-lt)", borderBottom: "1px solid var(--border-sns)" }}>
                  {link}
                </button>
              ))}
              <a href="/login" style={{ display: "block", textAlign: "center", background: "var(--yellow)", color: "var(--ink)", fontWeight: 700, fontSize: 15, padding: "12px", borderRadius: 12, marginTop: 12, textDecoration: "none" }}>
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
        background: "linear-gradient(160deg, #E8F8F5 0%, #D1F0EB 25%, #FFFDE8 55%, #FFF9F0 100%)",
      }}>
        {/* Wave decorations */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <svg viewBox="0 0 1440 400" style={{ position: "absolute", bottom: -2, width: "100%", height: "auto", opacity: 0.1 }}>
            <path d="M0,160L48,170.7C96,181,192,203,288,192C384,181,480,139,576,128C672,117,768,139,864,165.3C960,192,1056,224,1152,213.3C1248,203,1344,149,1392,122.7L1440,96L1440,400L0,400Z" fill="var(--teal)" />
          </svg>
        </div>

        {/* Floating accents */}
        <motion.div animate={{ y: [0, -20, 0], x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          style={{ position: "absolute", top: "12%", right: "8%", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,199,0,0.1)", pointerEvents: "none" }} />
        <motion.div animate={{ y: [0, 15, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
          style={{ position: "absolute", bottom: "18%", left: "5%", width: 140, height: 140, borderRadius: "50%", background: "rgba(77,191,179,0.08)", pointerEvents: "none" }} />

        <div id="hero-grid" style={{
          maxWidth: 1180, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center",
        }}>
          {/* Left - Text */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
            <h1 style={{
              fontSize: "clamp(2.5rem, 5vw, 4.2rem)", fontWeight: 700,
              lineHeight: 1.1, color: "#1C2838", marginBottom: "1.5rem", letterSpacing: "-0.02em",
            }}>
              <span style={{ color: "var(--yellow)" }}>S</span>oma{" "}
              <span style={{ color: "var(--yellow)" }}>n</span>a{" "}
              <span style={{ color: "var(--yellow)" }}>S</span>ekani<span style={{ color: "var(--yellow)" }}>!</span>
            </h1>

            <p style={{ fontSize: 19, lineHeight: 1.7, color: "var(--muted)", maxWidth: 480, marginBottom: "2.5rem" }}>
              <strong style={{ color: "var(--ink)" }}>Your campus AI assistant.</strong>{" "}
              Smart, personalized academic support for every university student across Kenya. Study smarter, ace your exams.
            </p>

            <div id="hero-btns" style={{ display: "flex", gap: 14, flexWrap: "wrap", position: "relative", zIndex: 5 }}>
              <a href="/login" style={{
                display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
                background: "linear-gradient(135deg, var(--yellow), var(--yellow-dk))", color: "var(--ink)",
                fontWeight: 700, fontSize: 16, padding: "15px 32px", borderRadius: 30,
                boxShadow: "0 8px 32px rgba(255,199,0,0.35)", transition: "all 0.3s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,199,0,0.45)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,199,0,0.35)"; }}>
                Get Started <Icon d={ICONS.arrow} size={16} stroke="var(--ink)" />
              </a>
              <button onClick={() => scrollTo("demo")} style={{
                display: "inline-flex", alignItems: "center", gap: 8, background: "white",
                border: "2px solid var(--teal)", color: "var(--teal-dark)", fontWeight: 600, fontSize: 16,
                padding: "14px 28px", borderRadius: 30, cursor: "pointer",
                transition: "all 0.3s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--teal)"; e.currentTarget.style.color = "white"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "var(--teal-dark)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                See It In Action
              </button>
            </div>
          </motion.div>

          {/* Right - Character with speech bubble */}
          <motion.div
            id="hero-character"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
            style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
            <motion.img src={snsCharacter} alt="Sekani - your campus AI buddy"
              animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              style={{ width: "clamp(340px, 100%, 520px)", height: "auto", filter: "drop-shadow(0 24px 48px rgba(77,191,179,0.25))" }} />

            {/* Speech bubble with typing animation - top right, wavy */}
            <SpeechBubble />
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
            fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700,
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
      <section id="demo" style={{ position: "relative", overflow: "hidden" }}>
        {/* Half-sphere transition top */}
        <div style={{
          width: "100%", height: 120, background: "var(--cream)",
          position: "relative", zIndex: 2,
        }}>
          <div style={{
            position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "140%", height: 120, borderRadius: "0 0 50% 50%",
            background: "var(--cream)",
          }} />
        </div>

        <div style={{
          padding: "2rem 1.5rem 6rem",
          background: "linear-gradient(180deg, var(--ink) 0%, #1E2D3D 100%)",
          position: "relative",
        }}>
          {/* Decorative dots */}
          <div style={{ position: "absolute", top: 40, right: 60, width: 80, height: 80, opacity: 0.06, backgroundImage: "radial-gradient(circle, var(--yellow) 2px, transparent 2px)", backgroundSize: "16px 16px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 60, left: 40, width: 100, height: 100, opacity: 0.04, backgroundImage: "radial-gradient(circle, var(--teal) 2px, transparent 2px)", backgroundSize: "18px 18px", pointerEvents: "none" }} />

          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <SectionLabel text="See It In Action" light />
            <motion.h2 {...fadeUp(0.1)} style={{
              fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 700,
              color: "white", letterSpacing: "-0.02em", marginBottom: "1rem",
            }}>
              Sekani <span style={{ color: "var(--yellow)", fontStyle: "italic" }}>in action.</span>
            </motion.h2>
            <motion.p {...fadeUp(0.15)} style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", marginBottom: "2.5rem", maxWidth: 560 }}>
              Watch how students interact with Sekani to get instant academic help. It's this easy.
            </motion.p>

            <div id="demo-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", alignItems: "center" }}>
              <ChatDemo />
              {/* Student image - larger to match demo */}
              <motion.div id="demo-student" {...fadeUp(0.3)} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <img src={studentsStairs} alt="Students using Soma na Sekani" style={{
                  width: 480, height: 520, objectFit: "cover",
                  filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.3))",
                  borderRadius: 16, flexShrink: 0,
                }} />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CHAPTERS ═══════ */}
      <section id="chapters" style={{ padding: "6rem 1.5rem", background: "linear-gradient(180deg, #FFFDE8 0%, var(--cream) 100%)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionLabel text="Chapters" />
          <motion.h2 {...fadeUp(0.1)} style={{
            fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700,
            color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "1rem",
          }}>
            Join your campus <span style={{ color: "var(--teal-dark)", fontStyle: "italic" }}>chapter.</span>
          </motion.h2>
          <motion.p {...fadeUp(0.15)} style={{ fontSize: 16, color: "var(--muted)", marginBottom: "3rem", maxWidth: 520 }}>
            We're rolling out across universities in Kenya. Find your chapter and get started — ama be the first to bring Sekani to your campus!
          </motion.p>
          <div id="chapters-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <ChapterCard chapter={CHAPTERS[0]} delay={0} />
            <motion.div {...fadeUp(0.1)} style={{
              background: "linear-gradient(135deg, #1C2838 0%, #243447 100%)",
              border: "1.5px solid rgba(255,199,0,0.25)",
              borderRadius: 20, padding: "2.5rem 2rem", display: "flex", flexDirection: "column",
              justifyContent: "center", alignItems: "flex-start", gap: 16, transition: "all 0.3s",
            }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,199,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d={ICONS.users} size={26} stroke="var(--yellow)" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "white", lineHeight: 1.3 }}>
                We're Onboarding New Universities
              </h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
                Want to bring Sekani to your campus? We're partnering with universities across Kenya. Let's talk.
              </p>
              <button onClick={() => setTalkModalOpen(true)} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "var(--yellow)", color: "var(--ink)",
                fontWeight: 600, fontSize: 14, padding: "10px 24px",
                borderRadius: 30, transition: "all 0.3s", border: "none", cursor: "pointer",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.background = "var(--yellow-dk)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "var(--yellow)"; }}>
                Talk To Us <Icon d={ICONS.arrow} size={14} stroke="var(--ink)" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ ABOUT ═══════ */}
      <section id="about" style={{ padding: "6rem 1.5rem", background: "var(--ink)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "30%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,199,0,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "20%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(77,191,179,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative" }}>
          <SectionLabel text="About The Mission" light />
          <motion.h2 {...fadeUp(0.1)} style={{
            fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700,
            color: "white", letterSpacing: "-0.02em", marginBottom: "1.5rem",
          }}>
            Built to scale across <span style={{ color: "var(--yellow)", fontStyle: "italic" }}>every campus in Kenya.</span>
          </motion.h2>
          <motion.p {...fadeUp(0.18)} style={{ fontSize: 17, lineHeight: 1.85, color: "rgba(255,255,255,0.75)", marginBottom: "2rem", maxWidth: 640 }}>
            Soma na Sekani gives every university student access to AI-powered academic support. We are onboarding partner institutions and offering early access to administrators. Our mission? To make quality academic AI accessible to every student, regardless of their institution.
          </motion.p>
          <motion.p {...fadeUp(0.22)} style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: "2.5rem", maxWidth: 520 }}>
            Powered by{" "}
            <a href="https://notifyai.org/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--yellow)", textDecoration: "none", fontWeight: 600 }}>Notify AI</a>.
          </motion.p>
          <motion.div {...fadeUp(0.28)} style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("chapters")} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, var(--yellow), var(--yellow-dk))", color: "var(--ink)",
              fontWeight: 700, fontSize: 16, padding: "15px 32px", borderRadius: 30,
              boxShadow: "0 8px 24px rgba(255,199,0,0.25)", transition: "all 0.3s",
              border: "none", cursor: "pointer",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
              Get Started <Icon d={ICONS.arrow} size={16} stroke="var(--ink)" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section style={{ padding: "6rem 1.5rem", background: "linear-gradient(180deg, var(--cream) 0%, #E8F8F5 50%, var(--cream) 100%)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionLabel text="Student Stories" />
          <motion.h2 {...fadeUp(0.1)} style={{
            fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 700,
            color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "3rem",
          }}>
            Heard from students <span style={{ color: "var(--teal-dark)", fontStyle: "italic" }}>who use it daily.</span>
          </motion.h2>
          <div id="testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} {...fadeUp(0.1 + i * 0.1)} style={{
                background: "white", borderRadius: 20, padding: "2rem",
                border: `1px solid ${i === 1 ? "rgba(255,199,0,0.3)" : "var(--border-sns)"}`,
                boxShadow: i === 1 ? "0 4px 24px rgba(255,199,0,0.08)" : "0 4px 24px rgba(77,191,179,0.06)",
                transition: "all 0.3s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(77,191,179,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = i === 1 ? "0 4px 24px rgba(255,199,0,0.08)" : "0 4px 24px rgba(77,191,179,0.06)"; }}>
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
      <footer style={{ background: "var(--ink)", padding: "3rem 1.5rem", borderTop: "1px solid rgba(255,199,0,0.1)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={logoSns} alt="Soma na Sekani" style={{ height: 85 }} />
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center" }}>
            {["Features", "Chapters", "Demo", "About"].map((l) => (
              <button key={l} onClick={() => scrollTo(l.toLowerCase().replace(/\s+/g, "-"))}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.4)", transition: "color 0.2s" }}
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
              <a href="https://notifyai.org/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--yellow)", textDecoration: "none", fontWeight: 600 }}>Notify AI</a>
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>
              &copy; {new Date().getFullYear()} Soma na Sekani.
            </p>
          </div>
        </div>
      </footer>

      <TalkToUsModal open={talkModalOpen} onOpenChange={setTalkModalOpen} />
    </>
  );
}

/* ════════════════ SUB-COMPONENTS ════════════════ */

function SpeechBubble() {
  const text = "Kugraduate ni must! Let's make it happen";
  const displayed = useTypingEffect(text, 55, 1800);
  return (
    <motion.div
      className="speech-bubble-wrap"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.5, duration: 0.4, type: "spring" }}
      style={{
        position: "absolute", top: "-5%", right: "-10%",
        maxWidth: 260, zIndex: 10,
      }}>
      {/* Wavy SVG speech bubble */}
      <svg viewBox="0 0 280 120" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="none">
        <path d="M20,10 Q30,2 50,8 Q80,0 110,6 Q140,2 170,8 Q200,0 230,6 Q250,2 265,10 Q278,18 272,35 Q278,55 272,72 Q278,88 268,98 Q258,108 240,105 Q220,112 200,106 Q170,112 140,106 Q110,112 80,106 Q60,112 45,106 L35,115 L38,98 Q18,105 12,95 Q2,85 6,70 Q2,50 6,35 Q2,18 20,10 Z"
          fill="#1C2838" stroke="rgba(42,157,143,0.3)" strokeWidth="1" />
      </svg>
      <div style={{
        position: "relative", padding: "18px 22px 20px",
        color: "#2A9D8F",
        fontSize: 14, fontWeight: 600, lineHeight: 1.45,
      }}>
        {displayed}
        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
          style={{ display: "inline-block", marginLeft: 2, fontWeight: 700 }}>|</motion.span>
      </div>
    </motion.div>
  );
}

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
    { value: "500+", label: "Active Students", color: "var(--teal-dark)" },
    { value: "98%", label: "Satisfaction Rate", color: "var(--yellow-dk)" },
    { value: "50+", label: "Programmes Covered", color: "var(--teal-dark)" },
    { value: "< 2s", label: "Response Time", color: "var(--yellow-dk)" },
  ];
  return (
    <div ref={ref} style={{
      background: "linear-gradient(135deg, var(--ink) 0%, #1E2D3D 100%)",
      padding: "3rem 1.5rem",
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <style>{`@media(max-width:640px){#stats-g{grid-template-columns:repeat(2,1fr)!important}}`}</style>
        <div id="stats-g" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2rem" }}>
          {STATS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1, duration: 0.5 }} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.8rem", fontWeight: 700, color: s.color, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{s.label}</div>
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
        background: hov ? "#1C2838" : "rgba(255,255,255,0.7)",
        border: `1.5px solid ${hov ? "rgba(255,199,0,0.35)" : "var(--border-sns)"}`,
        borderRadius: 20, padding: "2rem", transition: "all 0.3s", transform: hov ? "translateY(-6px)" : "none",
        boxShadow: hov ? "0 16px 48px rgba(28,40,56,0.25)" : "none", cursor: "default",
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, background: hov ? "rgba(255,199,0,0.15)" : "rgba(77,191,179,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s",
        }}>
          <Icon d={ICONS[f.icon]} size={22} stroke={hov ? "var(--yellow)" : "var(--teal-dark)"} />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
          color: hov ? "var(--yellow)" : "var(--teal-dark)",
          background: hov ? "rgba(255,199,0,0.12)" : "rgba(77,191,179,0.08)",
          padding: "4px 10px", borderRadius: 100,
          border: `1px solid ${hov ? "rgba(255,199,0,0.25)" : "rgba(77,191,179,0.15)"}`,
          textTransform: "uppercase", transition: "all 0.3s",
        }}>{f.tag}</span>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: hov ? "white" : "var(--ink)", marginBottom: 8, transition: "color 0.3s" }}>{f.title}</h3>
      <p style={{ fontSize: 13.5, color: hov ? "rgba(255,255,255,0.6)" : "var(--muted)", lineHeight: 1.7, transition: "color 0.3s" }}>{f.desc}</p>
    </motion.div>
  );
}

function ChapterCard({ chapter: ch, delay }: { chapter: any; delay: number }) {
  const [hov, setHov] = useState(false);
  const isActive = ch.status === "active";
  return (
    <motion.div {...fadeUp(delay)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov
          ? "#1C2838"
          : isActive
            ? "linear-gradient(135deg, rgba(77,191,179,0.08), rgba(255,199,0,0.05))"
            : "rgba(0,0,0,0.02)",
        border: `1.5px solid ${hov ? "rgba(255,199,0,0.35)" : isActive ? "rgba(77,191,179,0.25)" : "var(--border-sns)"}`,
        borderRadius: 20, padding: "2.5rem 2rem", transition: "all 0.3s", position: "relative", overflow: "hidden",
        transform: hov ? "translateY(-4px)" : "none",
        boxShadow: hov ? "0 16px 48px rgba(28,40,56,0.25)" : "none",
      }}>
      {isActive && (
        <div style={{ position: "absolute", top: 16, right: 16, background: "var(--yellow)", color: "var(--ink)", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100 }}>
          LIVE
        </div>
      )}
      <div style={{ width: 56, height: 56, borderRadius: 16, background: hov ? "rgba(255,199,0,0.15)" : isActive ? "rgba(255,199,0,0.12)" : "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, transition: "background 0.3s" }}>
        <Icon d={ICONS.globe} size={26} stroke={hov ? "var(--yellow)" : isActive ? "var(--teal-dark)" : "var(--muted)"} />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: hov ? "white" : "var(--ink)", marginBottom: 6, transition: "color 0.3s" }}>{ch.name}</h3>
      <p style={{ fontSize: 14, color: hov ? "rgba(255,255,255,0.6)" : "var(--muted)", marginBottom: 20, transition: "color 0.3s" }}>{ch.university}</p>
      {isActive && <p style={{ fontSize: 13, color: hov ? "var(--yellow)" : "var(--teal-dark)", fontWeight: 600, marginBottom: 20, transition: "color 0.3s" }}>{ch.students} students active</p>}

      {isActive ? (
        <a href={ch.link}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
            background: "var(--yellow)", color: "var(--ink)",
            border: "1.5px solid var(--yellow)", fontWeight: 600, fontSize: 14, padding: "10px 24px",
            borderRadius: 30, transition: "all 0.3s",
          }}>
          Join Chapter <Icon d={ICONS.arrow} size={14} stroke="var(--ink)" />
        </a>
      ) : (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: hov ? "rgba(255,255,255,0.5)" : "var(--muted)", fontWeight: 600, fontSize: 14, padding: "10px 24px", borderRadius: 30, border: `1.5px solid ${hov ? "rgba(255,255,255,0.2)" : "var(--border-sns)"}`, transition: "all 0.3s" }}>
          Coming Soon
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
      background: "rgba(255,255,255,0.05)", borderRadius: 24, overflow: "hidden",
      boxShadow: "0 24px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.08)",
      backdropFilter: "blur(12px)",
    }}>
      {/* Chat header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(135deg, rgba(77,191,179,0.15), rgba(255,199,0,0.08))",
      }}>
        <img src={snsCharacter} alt="Sekani" style={{ width: 38, height: 38, borderRadius: 12, objectFit: "cover" }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>SEKANI</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Online</span>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div ref={chatRef} style={{ padding: "20px", minHeight: 300, maxHeight: 440, overflowY: "auto" }}>
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35 }}
              style={{ marginBottom: 14, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div>
                <div style={{
                  maxWidth: 360, padding: "11px 16px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg, var(--yellow), var(--yellow-dk))" : "rgba(255,255,255,0.1)",
                  color: msg.role === "user" ? "var(--ink)" : "rgba(255,255,255,0.9)",
                  fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line",
                  fontWeight: msg.role === "user" ? 500 : 400,
                }}>
                  {msg.text.split("**").map((part: string, pi: number) => pi % 2 === 1 ? <strong key={pi}>{part}</strong> : part)}
                </div>
                {msg.attachments && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {msg.attachments.map((att: any, ai: number) => (
                      <motion.div key={ai} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + ai * 0.15 }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 14, padding: "10px 14px", cursor: "pointer", transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "var(--yellow)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,199,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon d={ICONS.file} size={16} stroke="var(--yellow)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{att.size}</div>
                        </div>
                        <Icon d={ICONS.download} size={15} stroke="var(--yellow)" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showDots && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", marginBottom: 14 }}>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "16px 16px 16px 4px", padding: "11px 16px", display: "inline-flex", gap: 5 }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <motion.span key={i} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--yellow)", display: "inline-block", opacity: 0.7 }} />
              ))}
            </div>
          </motion.div>
        )}

        {messages.length === 0 && !started && (
          <div style={{ textAlign: "center", padding: "3rem 2rem", color: "rgba(255,255,255,0.3)" }}>
            <p style={{ fontSize: 14 }}>Watch the demo conversation unfold...</p>
          </div>
        )}
      </div>

      {/* Input (decorative) */}
      <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 30, padding: "10px 18px" }}>
          <span style={{ flex: 1, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Ask Sekani anything...</span>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, var(--yellow), var(--yellow-dk))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={ICONS.arrow} size={15} stroke="var(--ink)" />
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
