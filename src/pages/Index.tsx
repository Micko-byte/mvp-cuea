import { useState, useEffect, useRef } from "react";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";

/* ── Google Fonts ── */
const FontLoader = () => {
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);
  return null;
};

/* ── Icons (inline SVG components) ── */
const Icon = ({ d, size = 20, stroke = "currentColor", strokeWidth = 1.8, fill = "none", viewBox = "0 0 24 24" }) =>
<svg
  width={size}
  height={size}
  viewBox={viewBox}
  fill={fill}
  stroke={stroke}
  strokeWidth={strokeWidth}
  strokeLinecap="round"
  strokeLinejoin="round">
  
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>;


const ICONS = {
  graduation: "M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5",
  chat: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  chart: ["M18 20V10", "M12 20V4", "M6 20v-6"],
  book: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
  lightning: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  globe: [
  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  "M2 12h20",
  "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"],

  arrow: "M5 12h14M12 5l7 7-7 7",
  menu: ["M3 12h18", "M3 6h18", "M3 18h18"],
  x: ["M18 6L6 18", "M6 6l12 12"],
  check: "M20 6L9 17l-5-5",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  users: [
  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2",
  "M23 21v-2a4 4 0 0 0-3-3.87",
  "M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  "M16 3.13a4 4 0 0 1 0 7.75"],

  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  brain: [
  "M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.66z",
  "M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.66z"]

};

/* ── Nav links ── */
const NAV_LINKS = ["Features", "How It Works", "For Universities", "About"];

/* ── Features data ── */
const FEATURES = [
{
  icon: "chat",
  title: "Instant AI Chat",
  tag: "Core",
  desc: "Ask anything about your courses, deadlines, assignments, or lecture content. Get human-quality answers in seconds, 24/7."
},
{
  icon: "book",
  title: "Course Material Hub",
  tag: "Content",
  desc: "All your lecture notes, past papers, reading lists, and study resources in one searchable, intelligent library."
},
{
  icon: "chart",
  title: "Progress Analytics",
  tag: "Insights",
  desc: "Visualise your academic trajectory. Identify weak areas, track improvement, and prepare smarter for assessments."
},
{
  icon: "brain",
  title: "Curriculum-Trained AI",
  tag: "Intelligence",
  desc: "Unlike generic AI tools, CUEA AI is trained on your university's specific syllabi, units, and academic calendar."
},
{
  icon: "lightning",
  title: "Exam Preparation",
  tag: "Academic",
  desc: "Generate practice questions, get topic summaries, and receive step-by-step explanations tailored to your exact exam format."
},
{
  icon: "shield",
  title: "Private & Secure",
  tag: "Trust",
  desc: "Your academic data stays yours. We never share or sell your information. GDPR-aligned and built with student privacy first."
}];


/* ── Steps ── */
const STEPS = [
{
  num: "01",
  title: "Sign up with your university email",
  desc: "Instant access, no waiting. Your institution is recognised automatically."
},
{
  num: "02",
  title: "Select your programme & units",
  desc: "The AI calibrates to your exact courses, year of study, and upcoming deadlines."
},
{
  num: "03",
  title: "Ask, learn & excel",
  desc: "Chat naturally, get cited answers, generate notes, and track your growth."
}];


/* ── Stats ── */
const STATS = [
{ value: "10K+", label: "Active Students" },
{ value: "98%", label: "Satisfaction Rate" },
{ value: "50+", label: "Programmes Supported" },
{ value: "< 2s", label: "Average Response Time" }];


/* ── University features ── */
const UNI_FEATURES = [
{
  icon: "globe",
  title: "Multi-Campus Deployment",
  desc: "Roll out across departments or the entire institution with centralised admin controls and per-faculty customisation."
},
{
  icon: "users",
  title: "Staff & Student Portals",
  desc: "Separate interfaces for lecturers to upload materials and students to consume them — all within one seamless ecosystem."
},
{
  icon: "chart",
  title: "Institutional Analytics",
  desc: "Understand engagement trends, at-risk students, and course performance data to drive evidence-based academic decisions."
},
{
  icon: "shield",
  title: "LMS Integration",
  desc: "Plug into Moodle, Blackboard, or custom portals via our open API. No disruptive migration required."
}];


/* ── Testimonials ── */
const TESTIMONIALS = [
{
  quote:
  "I used to spend hours searching for past papers and notes. CUEA AI finds everything in seconds and even explains concepts I missed in class.",
  name: "Aisha M.",
  prog: "BSc Computer Science, Year 3"
},
{
  quote:
  "The exam prep feature is genuinely impressive. It generates questions that mirror the actual exam style for my specific units.",
  name: "Kevin O.",
  prog: "Bachelor of Commerce, Year 2"
},
{
  quote:
  "As someone who works part-time, having a 24/7 academic assistant has been life-changing for keeping up with coursework.",
  name: "Grace W.",
  prog: "BA Communications, Year 4"
}];


/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <>
      <FontLoader />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --maroon:     #7B1929;
          --maroon-lt:  #9E2235;
          --maroon-dk:  #560F1A;
          --gold:       #C9A84C;
          --gold-lt:    #E4C678;
          --cream:      #FAF8F4;
          --ink:        #1A1210;
          --ink-lt:     #3D2E2C;
          --muted:      #7A6A66;
          --border:     rgba(123,25,41,0.12);
          --card:       #FFFFFF;
          --card-tint:  rgba(250,248,244,0.7);
        }
        html { scroll-behavior: smooth; }
        body { background: var(--cream); color: var(--ink); font-family: 'DM Sans', sans-serif; }
        .display { font-family: 'Cormorant Garamond', serif; }
        .mono   { font-family: 'DM Mono', monospace; }
        .grad-maroon { background: linear-gradient(135deg, var(--maroon-dk), var(--maroon-lt)); }
        .grad-gold   { background: linear-gradient(135deg, #C9A84C, #E4C678); }
        .text-maroon { color: var(--maroon); }
        .text-gold   { color: var(--gold); }
        .text-muted  { color: var(--muted); }
        .border-subtle { border: 1px solid var(--border); }
        .card-shadow   { box-shadow: 0 4px 24px rgba(26,18,16,0.06); }
        .glow-maroon   { box-shadow: 0 0 40px rgba(123,25,41,0.15); }
        ::selection { background: rgba(123,25,41,0.15); }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-thumb { background: var(--maroon); border-radius: 4px; }
        .noise::before {
          content: '';
          position: absolute; inset: 0; border-radius: inherit;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none; opacity: 0.4;
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrolled ? "rgba(250,248,244,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          transition: "background 0.4s, backdrop-filter 0.4s",
          padding: "0 1.5rem"
        }}>
        
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            height: 68,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          
          {/* Logo */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            onClick={() => scrollTo("hero")}>
            
            <div
              className="grad-maroon"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
              
              <Icon d={ICONS.graduation} size={18} stroke="white" strokeWidth={1.6} />
            </div>
            <span
              className="display"
              style={{ fontWeight: 700, fontSize: 22, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              
              Soma na <span style={{ color: "var(--maroon)" }}>Sekani</span>
            </span>
          </div>

          {/* Desktop nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 36 }} className="desktop-nav">
            <style>{`@media(max-width:768px){.desktop-nav{display:none!important}}`}</style>
            {NAV_LINKS.map((link) =>
            <button
              key={link}
              onClick={() => scrollTo(link.toLowerCase().replace(/\s+/g, "-"))}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--ink-lt)",
                fontFamily: "'DM Sans', sans-serif",
                transition: "color 0.2s",
                padding: "4px 0",
                position: "relative"
              }}
              onMouseEnter={(e) => e.target.style.color = "var(--maroon)"}
              onMouseLeave={(e) => e.target.style.color = "var(--ink-lt)"}>
              
                {link}
              </button>
            )}
          </div>

          {/* CTA + Hamburger */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "none", color: "var(--ink)" }}>
              
              <Icon d={menuOpen ? ICONS.x : ICONS.menu} size={22} />
            </button>
          </div>
          <style>{`@media(max-width:768px){.mobile-menu-btn{display:flex!important}}`}</style>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen &&
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: "rgba(250,248,244,0.98)",
              backdropFilter: "blur(16px)",
              borderTop: "1px solid var(--border)",
              padding: "12px 1.5rem 20px",
              overflow: "hidden"
            }}>
            
              {NAV_LINKS.map((link) =>
            <button
              key={link}
              onClick={() => scrollTo(link.toLowerCase().replace(/\s+/g, "-"))}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "14px 0",
                fontSize: 17,
                fontWeight: 500,
                color: "var(--ink-lt)",
                borderBottom: "1px solid var(--border)",
                fontFamily: "'DM Sans', sans-serif"
              }}>
              
                  {link}
                </button>
            )}
            </motion.div>
          }
        </AnimatePresence>
      </motion.nav>

      {/* ══════════════════════════════
           HERO
        ══════════════════════════════ */}
      <section
        id="hero"
        ref={heroRef}
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          padding: "6rem 1.5rem 4rem"
        }}>
        
        {/* Background decorations */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 60% 70% at 70% 40%, rgba(123,25,41,0.07) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />
        
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "-5%",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />
        
        <div
          style={{
            position: "absolute",
            bottom: "5%",
            left: "-8%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(123,25,41,0.05) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />
        

        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            alignItems: "center"
          }}>
          
          <style>{`@media(max-width:900px){#hero-grid{grid-template-columns:1fr!important;text-align:center}#hero-btns{justify-content:center!important}#hero-visual{display:none!important}}`}</style>
          <div
            id="hero-grid"
            style={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4rem",
              alignItems: "center",
              width: "100%"
            }}>
            
            {/* Left — text */}
            <motion.div style={{ y: heroY, opacity: heroOpacity }}>
              























              

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ marginBottom: "1rem" }}>
                <span
                  className="display"
                  style={{
                    fontSize: "clamp(2.5rem, 4.5vw, 4rem)",
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: "var(--ink)",
                    letterSpacing: "-0.02em"
                  }}>
                  Soma na Sekani
                </span>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{ fontSize: 14, color: "var(--muted)", marginBottom: "1.5rem", letterSpacing: "0.05em", textTransform: "uppercase" as const, fontWeight: 600 }}>
                Introducing CUEA AI
              </motion.p>

              <motion.h1
                className="display"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: "var(--ink)",
                  marginBottom: "1.5rem",
                  letterSpacing: "-0.02em"
                }}>
                
                The AI built
                <br />
                for your
                <br />
                <span style={{ color: "var(--maroon)", fontStyle: "italic" }}>academic journey.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
                style={{ fontSize: 17, lineHeight: 1.75, color: "var(--muted)", maxWidth: 460, marginBottom: "2.5rem" }}>
                
                CUEA AI is a curriculum-aware assistant trained on your university's exact programmes, units, and
                academic calendar — not a generic chatbot.
              </motion.p>

              <motion.div
                id="hero-btns"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.44 }}
                style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                
                <a
                  href="/login"
                  className="grad-maroon glow-maroon"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    textDecoration: "none",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 15,
                    padding: "13px 28px",
                    borderRadius: 30,
                    transition: "opacity 0.2s, transform 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}>
                  
                  Start for Free with CUEA <Icon d={ICONS.arrow} size={16} stroke="white" />
                </a>
                <button
                  onClick={() => scrollTo("how-it-works")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "white",
                    border: "1.5px solid var(--border)",
                    color: "var(--ink)",
                    fontWeight: 600,
                    fontSize: 15,
                    padding: "13px 28px",
                    borderRadius: 30,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "border-color 0.2s, transform 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--maroon)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}>
                  
                  See How It Works
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "2.5rem" }}>
                
                <div style={{ display: "flex" }}>
                  {["#E57373", "#F06292", "#BA68C8"].map((c, i) =>
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c,
                      border: "2px solid white",
                      marginLeft: i > 0 ? -8 : 0
                    }} />

                  )}
                </div>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  <strong style={{ color: "var(--ink)" }}>10,000+</strong> students already using CUEA AI
                </span>
              </motion.div>
            </motion.div>

            {/* Right — Visual card */}
            <motion.div
              id="hero-visual"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              style={{ position: "relative" }}>
              
              <div
                style={{
                  background: "white",
                  borderRadius: 24,
                  padding: 28,
                  boxShadow: "0 24px 80px rgba(26,18,16,0.12), 0 4px 20px rgba(123,25,41,0.08)",
                  border: "1px solid rgba(123,25,41,0.06)"
                }}>
                
                {/* Chat header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 24,
                    paddingBottom: 18,
                    borderBottom: "1px solid var(--border)"
                  }}>
                  
                  <div
                    className="grad-maroon"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                    
                    <Icon d={ICONS.graduation} size={16} stroke="white" strokeWidth={1.6} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>CUEA AI Assistant</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#22C55E",
                          display: "inline-block"
                        }} />
                      
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Online · Responds instantly</span>
                    </div>
                  </div>
                </div>

                {/* Chat messages */}
                {[
                { role: "user", text: "Can you summarise Chapter 4 of my Business Law notes for the upcoming CAT?" },
                {
                  role: "ai",
                  text: "Of course! Chapter 4 covers Contract Law essentials. Here's a concise breakdown for your CAT…",
                  typing: false
                }].
                map((msg, i) =>
                <div
                  key={i}
                  style={{
                    marginBottom: 14,
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
                  }}>
                  
                    <div
                    style={{
                      maxWidth: "82%",
                      padding: "10px 14px",
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: msg.role === "user" ? "var(--maroon)" : "var(--cream)",
                      color: msg.role === "user" ? "white" : "var(--ink)",
                      fontSize: 13,
                      lineHeight: 1.55,
                      fontWeight: 400
                    }}>
                    
                      {msg.text}
                    </div>
                  </div>
                )}

                {/* Typing indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
                  <div
                    style={{
                      background: "var(--cream)",
                      borderRadius: "16px 16px 16px 4px",
                      padding: "10px 16px",
                      display: "inline-flex",
                      gap: 4
                    }}>
                    
                    {[0, 0.2, 0.4].map((d, i) =>
                    <motion.span
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "var(--maroon)",
                        display: "inline-block",
                        opacity: 0.6
                      }} />

                    )}
                  </div>
                </div>

                {/* Suggested prompts */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["Past exam papers", "Upcoming deadlines", "Study schedule"].map((p) =>
                  <span
                    key={p}
                    style={{
                      fontSize: 11,
                      padding: "5px 10px",
                      borderRadius: 100,
                      border: "1px solid var(--border)",
                      color: "var(--maroon)",
                      background: "rgba(123,25,41,0.04)",
                      cursor: "pointer"
                    }}>
                    
                      {p}
                    </span>
                  )}
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  top: -18,
                  right: -18,
                  background: "white",
                  borderRadius: 14,
                  padding: "10px 16px",
                  boxShadow: "0 8px 32px rgba(26,18,16,0.1)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                
                <Icon d={ICONS.lightning} size={15} stroke="var(--gold)" strokeWidth={2} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>AI-Powered</span>
              </motion.div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
                style={{
                  position: "absolute",
                  bottom: -14,
                  left: -14,
                  background: "white",
                  borderRadius: 14,
                  padding: "10px 16px",
                  boxShadow: "0 8px 32px rgba(26,18,16,0.1)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                
                <Icon d={ICONS.shield} size={15} stroke="var(--maroon)" strokeWidth={2} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>Curriculum-Aware</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS BAND ── */}
      <StatsSection />

      {/* ══════════════════════════════
           FEATURES
        ══════════════════════════════ */}
      <section id="features" style={{ padding: "7rem 1.5rem", background: "var(--cream)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionLabel text="Platform Features" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: "4rem",
              alignItems: "start",
              marginBottom: "4rem"
            }}>
            
            <style>{`@media(max-width:800px){#feat-head{grid-template-columns:1fr!important}}`}</style>
            <div
              id="feat-head"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "4rem",
                width: "100%",
                gridColumn: "1 / -1"
              }}>
              
              <motion.h2
                className="display"
                {...fadeUp(0.1)}
                style={{
                  fontSize: "clamp(2.2rem, 4vw, 3.5rem)",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: "var(--ink)",
                  letterSpacing: "-0.02em"
                }}>
                
                Everything a student needs,
                <br />
                <span style={{ color: "var(--maroon)", fontStyle: "italic" }}>finally in one place.</span>
              </motion.h2>
              <motion.p
                {...fadeUp(0.2)}
                style={{ fontSize: 16, lineHeight: 1.8, color: "var(--muted)", paddingTop: "0.5rem" }}>
                
                CUEA AI isn't a generic tool repurposed for academia. It's purpose-built from the ground up for
                university students in Kenya — trained on real curricula, designed for real academic workflows.
              </motion.p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            <style>{`@media(max-width:900px){#feat-grid{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:580px){#feat-grid{grid-template-columns:1fr!important}}`}</style>
            <div
              id="feat-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 24,
                width: "100%",
                gridColumn: "1 / -1"
              }}>
              
              {FEATURES.map((f, i) =>
              <FeatureCard key={f.title} feature={f} delay={i * 0.08} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
           HOW IT WORKS
        ══════════════════════════════ */}
      <section id="how-it-works" style={{ padding: "7rem 1.5rem", background: "var(--ink)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionLabel text="How It Works" light />
          <motion.h2
            className="display"
            {...fadeUp(0.1)}
            style={{
              fontSize: "clamp(2.2rem, 4vw, 3.5rem)",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.02em",
              marginBottom: "1rem"
            }}>
            
            Up and running in under
            <br />
            <span style={{ color: "var(--gold)", fontStyle: "italic" }}>three minutes.</span>
          </motion.h2>
          <motion.p
            {...fadeUp(0.15)}
            style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", marginBottom: "4rem", maxWidth: 480 }}>
            
            No complex setup, no IT department required. Just your university email and you're in.
          </motion.p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem" }}>
            <style>{`@media(max-width:760px){#steps-grid{grid-template-columns:1fr!important}}`}</style>
            <div
              id="steps-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem", gridColumn: "1 / -1" }}>
              
              {STEPS.map((s, i) =>
              <motion.div
                key={s.num}
                {...fadeUp(0.15 + i * 0.1)}
                style={{
                  padding: "2.5rem 2rem",
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  position: "relative",
                  overflow: "hidden"
                }}>
                
                  <div
                  className="display"
                  style={{
                    fontSize: "5rem",
                    fontWeight: 700,
                    color: "rgba(201,168,76,0.12)",
                    lineHeight: 1,
                    position: "absolute",
                    top: 12,
                    right: 20,
                    pointerEvents: "none"
                  }}>
                  
                    {s.num}
                  </div>
                  <div
                  className="mono"
                  style={{ fontSize: 12, color: "var(--gold)", letterSpacing: "0.1em", marginBottom: 16 }}>
                  
                    STEP {s.num}
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 600, color: "white", marginBottom: 12, lineHeight: 1.35 }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{s.desc}</p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
           TESTIMONIALS
        ══════════════════════════════ */}
      <section style={{ padding: "7rem 1.5rem", background: "var(--cream)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionLabel text="Student Stories" />
          <motion.h2
            className="display"
            {...fadeUp(0.1)}
            style={{
              fontSize: "clamp(2rem, 3.5vw, 3rem)",
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
              marginBottom: "3rem"
            }}>
            
            Heard from the students
            <br />
            <span style={{ color: "var(--maroon)", fontStyle: "italic" }}>who use it every day.</span>
          </motion.h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            <style>{`@media(max-width:860px){#testimonials{grid-template-columns:1fr!important}}`}</style>
            <div
              id="testimonials"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", gridColumn: "1 / -1" }}>
              
              {TESTIMONIALS.map((t, i) =>
              <motion.div
                key={i}
                {...fadeUp(0.1 + i * 0.1)}
                style={{
                  background: "white",
                  borderRadius: 20,
                  padding: "2rem",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 24px rgba(26,18,16,0.05)"
                }}>
                
                  <div style={{ display: "flex", gap: 3, marginBottom: 20 }}>
                    {[...Array(5)].map((_, si) =>
                  <Icon key={si} d={ICONS.star} size={14} stroke="var(--gold)" fill="var(--gold)" strokeWidth={0} />
                  )}
                  </div>
                  <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.75,
                    color: "var(--ink-lt)",
                    marginBottom: 24,
                    fontStyle: "italic"
                  }}>
                  
                    "{t.quote}"
                  </p>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{t.prog}</div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
           FOR UNIVERSITIES
        ══════════════════════════════ */}
      <section id="for-universities" style={{ padding: "7rem 1.5rem", background: "#F5F1EC" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionLabel text="For Institutions" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "5rem",
              alignItems: "center",
              marginBottom: "4rem"
            }}>
            
            <style>{`@media(max-width:860px){#uni-intro{grid-template-columns:1fr!important}}`}</style>
            <div
              id="uni-intro"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "5rem",
                alignItems: "center",
                gridColumn: "1 / -1"
              }}>
              
              <div>
                <motion.h2
                  className="display"
                  {...fadeUp(0.05)}
                  style={{
                    fontSize: "clamp(2.2rem, 4vw, 3.4rem)",
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: "var(--ink)",
                    letterSpacing: "-0.02em",
                    marginBottom: "1.5rem"
                  }}>
                  
                  Built to scale across
                  <br />
                  <span style={{ color: "var(--maroon)", fontStyle: "italic" }}>every campus in Kenya.</span>
                </motion.h2>
                <motion.p
                  {...fadeUp(0.12)}
                  style={{ fontSize: 16, lineHeight: 1.8, color: "var(--muted)", marginBottom: "2rem" }}>
                  
                  We started at CUEA with a clear mission: give every Kenyan university student access to AI-powered
                  academic support. We're now onboarding partner institutions and offering early access to university
                  administrators.
                </motion.p>
                <motion.a
                  href="mailto:hello@cueaai.space"
                  {...fadeUp(0.2)}
                  className="grad-maroon"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    textDecoration: "none",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 14,
                    padding: "12px 24px",
                    borderRadius: 12,
                    transition: "opacity 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
                  
                  Partner With Us <Icon d={ICONS.arrow} size={15} stroke="white" />
                </motion.a>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {UNI_FEATURES.map((f, i) =>
                <motion.div
                  key={f.title}
                  {...fadeUp(0.08 + i * 0.08)}
                  style={{
                    background: "white",
                    borderRadius: 16,
                    padding: "1.5rem",
                    border: "1px solid var(--border)"
                  }}>
                  
                    <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(123,25,41,0.07)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12
                    }}>
                    
                      <Icon d={ICONS[f.icon]} size={17} stroke="var(--maroon)" />
                    </div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>{f.title}</h4>
                    <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.65 }}>{f.desc}</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
           ABOUT / CTA
        ══════════════════════════════ */}
      <section
        id="about"
        style={{ padding: "7rem 1.5rem", background: "var(--ink)", position: "relative", overflow: "hidden" }}>
        
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(123,25,41,0.18) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />
        
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <motion.div
            {...fadeUp(0.05)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(201,168,76,0.1)",
              border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: 100,
              padding: "6px 14px",
              marginBottom: "2rem"
            }}>
            
            <span className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.08em" }}>
              BUILT BY STUDENTS · FOR STUDENTS
            </span>
          </motion.div>
          <motion.h2
            className="display"
            {...fadeUp(0.1)}
            style={{
              fontSize: "clamp(2.4rem, 5vw, 4rem)",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: "1.5rem"
            }}>
            
            Start your smarter
            <br />
            <span style={{ color: "var(--gold)", fontStyle: "italic" }}>academic journey today.</span>
          </motion.h2>
          <motion.p
            {...fadeUp(0.18)}
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.8,
              marginBottom: "2.5rem",
              maxWidth: 520,
              margin: "0 auto 2.5rem"
            }}>
            
            CUEA AI is a student-built platform powered by{" "}
            <a
              href="https://notifyai.org/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--gold)", textDecoration: "none" }}>
              
              Notify AI
            </a>
            . It's independent, not officially affiliated with CUEA, and built with the sole mission of helping students
            thrive.
          </motion.p>
          <motion.div
            {...fadeUp(0.24)}
            style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            
            <a
              href="/login"
              className="grad-gold"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
                color: "var(--ink)",
                fontWeight: 700,
                fontSize: 15,
                padding: "14px 32px",
                borderRadius: 12,
                transition: "opacity 0.2s, transform 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
              }}>
              
              Get Free Access <Icon d={ICONS.arrow} size={16} stroke="var(--ink)" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#0E0A09", padding: "3rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            textAlign: "center"
          }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              className="grad-maroon"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
              
              <Icon d={ICONS.graduation} size={14} stroke="white" strokeWidth={1.6} />
            </div>
            <span
              className="display"
              style={{ fontWeight: 700, fontSize: 18, color: "white", letterSpacing: "-0.01em" }}>
              
              CUEA <span style={{ color: "var(--maroon)" }}>AI</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center" }}>
            {["Features", "How It Works", "For Universities", "About", "Contact"].map((l) =>
            <button
              key={l}
              onClick={() =>
              l === "Contact" ?
              window.location.href = "mailto:hello@cueaai.space" :
              scrollTo(l.toLowerCase().replace(/\s+/g, "-"))
              }
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'DM Sans', sans-serif",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => e.target.style.color = "white"}
              onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.4)"}>
              
                {l}
              </button>
            )}
          </div>
          <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.05)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Powered by{" "}
              <a
                href="https://notifyai.org/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
                
                Notify AI
              </a>
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", maxWidth: 520 }}>
              This is an independent student project not officially affiliated with or endorsed by the Catholic
              University of Eastern Africa.
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>
              © {new Date().getFullYear()} CUEA AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>);

}

/* ════════════════ SUB-COMPONENTS ════════════════ */

function SectionLabel({ text, light }) {
  return (
    <motion.div {...fadeUp(0)} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
      <div
        style={{
          width: 24,
          height: 1.5,
          background: light ? "rgba(201,168,76,0.6)" : "var(--maroon)",
          borderRadius: 2
        }} />
      
      <span
        className="mono"
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.1em",
          color: light ? "rgba(255,255,255,0.4)" : "var(--maroon)",
          textTransform: "uppercase"
        }}>
        
        {text}
      </span>
    </motion.div>);

}

function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div
      ref={ref}
      style={{
        background: "white",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        padding: "2.5rem 1.5rem"
      }}>
      
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "2rem"
        }}>
        
        <style>{`@media(max-width:640px){#stats-grid{grid-template-columns:repeat(2,1fr)!important}}`}</style>
        <div
          id="stats-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2rem", gridColumn: "1 / -1" }}>
          
          {STATS.map((s, i) =>
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            style={{ textAlign: "center" }}>
            
              <div
              className="display"
              style={{
                fontSize: "2.8rem",
                fontWeight: 700,
                color: "var(--maroon)",
                lineHeight: 1,
                letterSpacing: "-0.03em",
                marginBottom: 6
              }}>
              
                {s.value}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>{s.label}</div>
            </motion.div>
          )}
        </div>
      </div>
    </div>);

}

function FeatureCard({ feature: f, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      {...fadeUp(delay)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "white" : "rgba(255,255,255,0.6)",
        border: `1px solid ${hov ? "rgba(123,25,41,0.15)" : "var(--border)"}`,
        borderRadius: 20,
        padding: "2rem",
        transition: "all 0.3s",
        transform: hov ? "translateY(-4px)" : "none",
        boxShadow: hov ? "0 16px 48px rgba(123,25,41,0.08)" : "none",
        cursor: "default"
      }}>
      
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: hov ? "rgba(123,25,41,0.08)" : "rgba(123,25,41,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.3s"
          }}>
          
          <Icon d={ICONS[f.icon]} size={20} stroke="var(--maroon)" />
        </div>
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--muted)",
            letterSpacing: "0.08em",
            background: "var(--cream)",
            padding: "4px 10px",
            borderRadius: 100,
            border: "1px solid var(--border)"
          }}>
          
          {f.tag}
        </span>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginBottom: 8, letterSpacing: "-0.01em" }}>
        {f.title}
      </h3>
      <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7 }}>{f.desc}</p>
    </motion.div>);

}

/* ── Helper: reusable fade-up animation ── */
function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }
  };
}