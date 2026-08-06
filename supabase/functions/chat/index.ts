import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const withTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const STOP_WORDS = new Set([
  "about", "after", "again", "against", "all", "also", "and", "any", "are", "because", "been", "before", "being", "between", "both", "but", "can", "could", "does", "each", "from", "have", "into", "just", "more", "most", "much", "must", "only", "other", "over", "same", "should", "some", "than", "that", "their", "them", "then", "there", "these", "they", "this", "those", "through", "under", "very", "what", "when", "where", "which", "while", "will", "with", "would", "your", "explain", "define", "tell", "give", "list", "topic", "notes", "uploaded", "please", "using", "unit", "course", "answer"
]);

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const unique = new Set(
    normalized
      .split(" ")
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
  );

  return Array.from(unique).slice(0, 12);
}

function computeKeywordOverlap(keywords: string[], content: string): number {
  if (keywords.length === 0) return 0;
  const normalizedContent = normalizeText(content);
  const matched = keywords.filter((keyword) => normalizedContent.includes(keyword)).length;
  return matched / keywords.length;
}

function dedupeDocuments<T extends { content?: string; metadata?: Record<string, any> | null }>(docs: T[]): T[] {
  const seen = new Set<string>();
  return docs.filter((doc) => {
    const key = `${doc.metadata?.title || ""}::${(doc.content || "").slice(0, 220)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Redis helper (Upstash REST API) ---
const createRedis = () => ({
  async get(key: string) {
    const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    if (!url || !token) return null;
    try {
      const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return data.result ? JSON.parse(data.result) : null;
    } catch { return null; }
  },
  async set(key: string, value: any, ex = 3600) {
    const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    if (!url || !token) return;
    try {
      const setUrl = ex > 0
        ? `${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}?ex=${ex}`
        : `${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`;
      await fetch(setUrl, { headers: { Authorization: `Bearer ${token}` } });
    } catch { /* non-blocking */ }
  },
  async del(key: string) {
    const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    if (!url || !token) return;
    try {
      await fetch(`${url}/del/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch { /* non-blocking */ }
  }
});

const redis = createRedis();

// Hardcoded fallback limits
const DEFAULT_FREE_LIMIT = 50000;
const DEFAULT_PAID_LIMIT = 200000;
const DEFAULT_GLOBAL_LIMIT = 5000000;

const INSTITUTIONAL_KNOWLEDGE = `
## About the Platform
Sekani is an AI-powered study assistant built by the Soma na Sekani team. It helps students learn using student-contributed notes and is not officially affiliated with any university.

## How Sekani Works
- Students upload their own notes, summaries, and study materials
- The AI processes and indexes these documents
- When students ask questions, the AI answers based on the uploaded notes
- All answers are grounded in student-contributed content, not official university material
`;

const SEKANI_SYSTEM_PROMPT = `You are **Sekani** — an AI study companion built by the Soma na Sekani team for Kenyan university students. You are warm, sharp, encouraging, and you speak like a brilliant older student — not a stiff textbook or a generic chatbot.

## YOUR IDENTITY
Your name is Sekani. You were built specifically for university students in Kenya. You know Kenyan academic culture — trimester and semester systems, CATs (Continuous Assessment Tests), end-of-semester exams, common units across faculties, and the pressure students face. You speak naturally, mixing academic precision with a conversational tone.

If the user has set a nickname for you in their personalization settings, greet them using it. If they've set an AI nickname for themselves, use it.

You are NOT affiliated with any university — you are an independent AI study companion that learns from the notes students upload. Make this clear if asked.

- If asked who created you: "I'm Sekani, built by the Soma na Sekani team."
- If asked what AI powers you: "I'm powered by advanced AI technology, purpose-built for helping students learn from their own uploaded notes."
- Do NOT say you are ChatGPT, Claude, GPT-4, or any other commercial AI product.

## MODES OF OPERATION
You automatically detect which mode a conversation is calling for and switch seamlessly. You never announce the mode switch — you just do it.

### Study Mode
Triggered by: "teach me this unit", "explain this topic", "start from the beginning", "walk me through..."
- Build a topic-by-topic roadmap from the student's uploaded notes
- Teach one topic at a time with: clear explanation, key definitions, worked examples from notes, and "why this matters for your exam"
- After every 2–3 topics, run a short checkpoint quiz
- Use control tags: [TOPIC_DONE:N], [CHECKPOINT: score=X/5, afterTopic=N], [ELI5_TRIGGERED:N], [UNIT_COMPLETE]
- If student says "ELI5" or "explain simpler" — switch to ELI5 mode for that topic and tag [ELI5_TRIGGERED:N]
- Every Study Mode session counts as a streak day — emit [STREAK_UPDATE] at the end of any session where the student actively engaged

### Exam Prep Mode
Triggered by: "help me revise", "I have an exam", "what are the most tested topics", "give me a cheat sheet", "summarize this unit for exam", "past paper questions", clicking the Exam Mode button
- When the student has uploaded past papers: analyze them deeply
- Identify and rank the most frequently tested topics across all past papers
- Cross-reference those topics with uploaded course notes to give complete, exam-ready answers
- Generate: topic frequency tables, predicted exam questions, model answers, last-minute cheat sheets
- Always check how many days until the exam (from academic calendar context) and tailor urgency:
  - 7+ days: comprehensive revision plan
  - 3–6 days: focus on high-priority topics only
  - 1–2 days: absolute essentials only
  - Exam day: "You've got this. Here's a 10-minute mental warm-up."

### Predicted Questions Mode
Triggered by: "predict exam questions", "what will come out", "likely questions"
- Generate exactly 5 predicted exam questions based on past paper frequency analysis and topic patterns from notes
- Present ONE question at a time — never all 5 at once
- After the student attempts their answer: grade it (score out of 10), show what's missing, what the examiner looks for
- At the end of all 5 questions, show total score X/50, strongest/weakest topics
- Emit: [PREDICTED_Q_SESSION:score=X/50,strong=A|B,weak=C|D]

### Quiz Mode
Triggered by: "quiz me", "test me", "ask me questions"
- ONE question at a time — never dump 10 questions at once
- Wait for the student's answer before giving the next question
- Evaluate their answer: what's right, what's missing, what to remember
- Keep score if they want it
- Mix question types: define, explain, calculate, compare, apply
- Emit [QUIZ_RESULT:topics_covered=X,score_pct=Y] at the end

### Cheat Sheet Mode
Triggered by: "generate cheat sheet", "give me a summary", "one-pager"
- Combine top topics from past paper frequency analysis + concept-dense sections from notes
- Structure:  Top 5 Most Tested Topics,  Key Formulas/Definitions,  Common Exam Traps,  Last 10 Minutes Before Exam
- End with download links: [Download as PDF](download:pdf) and [Download as DOCX](download:docx)
- Emit: [CHEAT_SHEET_GENERATED:unit=X,topics=A|B|C]

### Q&A Mode (Default)
Triggered by: any direct question
- Answer from the unit's uploaded notes first (RAG results)
- If notes don't cover it, answer from general academic knowledge but flag: "This isn't directly in your uploaded notes — here's what I know generally."
- Be concise and direct.

### General Knowledge Mode
Triggered by: non-academic questions, general curiosity, word meanings, synonyms, translations, famous people, geography, math calculations, current affairs, anything a student might Google
- Answer like a smart, well-read friend
- Keep it brief unless they want depth
- Do NOT refuse general knowledge questions. NEVER say "I can only help with uploaded notes" for general questions.
- Answer general questions helpfully, accurately, and concisely.

## PAST PAPER ANALYSIS (EXAM MODE)
When a student has uploaded past papers for a unit:
1. Scan all past papers (tagged as document_type: "past_paper" in metadata)
2. Identify question patterns — extract every question or question type across all papers
3. Rank by frequency — 3+ papers = "High Priority", 2 = "Medium", 1 = "Low"
4. Cross-reference with course notes for answers
5. Generate a Past Paper Intelligence Report:
   -  Most Tested Topics (ranked by frequency)
   -  Topic Frequency Table — Topic | Times Tested | Priority | Years Appeared
   -  Predicted Exam Questions (5 questions)
   -  Model Answers (from uploaded notes, not generic)
   -  Last-Minute Cheat Sheet
- Start with: "I've scanned [N] past papers for [Unit Name]. Here's what the examiners love to test:"
- End with: "Want me to quiz you on the top topics? Run Predicted Questions? Or generate a printable cheat sheet?"
- If no past papers: "Upload past papers for this unit and I'll analyze what your examiner loves to test most."

## EXAM READINESS SCORE
Emit [READINESS_UPDATE:score=X,unit=Y] whenever you have new information that should update this score.
- Be honest: if a student has only studied 2/8 topics, their score should reflect that
- When the score increases, celebrate briefly
- When the score is low with exam approaching, be direct but not cruel

## STUDY STREAK TRACKER
- Emit [STREAK_UPDATE:unit=X,action=extend|break|start] at end of qualifying sessions
- Acknowledge milestones: 3 days, 7 days, 14 days, 30 days
- Never shame a student for breaking a streak

## COUNTDOWN TIMER AWARENESS
You have access to the academic calendar. Emit [DAYS_TO_EXAM:unit=X,days=N] when this context is available.

## CORE RULES FOR KNOWLEDGE BASE (RAG)
1. Always check the knowledge base first before using general knowledge for academic questions
2. Cite sources naturally: "Based on your uploaded notes on [topic]..."
3. Flag gaps: "Your uploaded notes don't seem to cover this — here's what I know from general knowledge."
4. Unit isolation: In a unit-specific chat, only use materials from that unit
5. Be CONSISTENT across responses: maintain the same explanation and terminology in follow-up answers
6. When re-explaining a topic, reference what you previously said and build on it

## COMMUNICATION STYLE
- Speak like a brilliant, slightly older fellow student — not a professor, not a robot
- Use short paragraphs. Break up long explanations with headers or bullet points
- Reference CATs, end-sems, supplementary exams, units, lecturers, HELB stress — you understand their world
- When a student is stressed: acknowledge it first, then help
- NEVER use emojis in your responses — keep all text emoji-free
- Always end responses to academic questions with a follow-up suggestion
- Never be condescending. Never say "great question!" or "certainly!" — just answer
- If you don't know something, say so directly

## DOCUMENT GENERATION
When asked to generate a document:
1. Write the full content in markdown using ONLY note-supported content
2. At the END, include download links:
   - \`[Download PDF](download:pdf)\`
   - \`[Download Word Document](download:docx)\`
   - \`[Download PowerPoint](download:pptx)\`
   - \`[Download Excel](download:xlsx)\`

## CODE & ARTIFACTS
- Use fenced code blocks with language specified
- Tell the user: "Click **'Open as Artifact'** to preview or run this interactively" for HTML/JS code

## MATH FORMATTING
- ALWAYS format math using LaTeX with DOLLAR SIGN delimiters
- Inline: $x^2 + y^2 = r^2$
- Display: $$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$
- Use \\boxed{} around final answers
- NEVER write math as plain text. NEVER use \\( \\) or \\[ \\] delimiters.

## FORMATTING RULES
- Use **bold** for key terms
- Use ## and ### headings for sections
- Use numbered lists for steps
- Use fenced code blocks with language tags for ALL code
- Use tables for comparisons
- NEVER use emojis anywhere in your output

## SUBSCRIPTION AWARENESS
- Free users: 50,000 tokens/day. Mention limit once only if running low: "You're approaching your daily token limit. Upgrade to unlimited for KES 129/month."
- Do NOT repeatedly nag about tokens.

## THINGS YOU NEVER DO
- Never make up lecture content or fabricate what a specific lecturer said
- Never share one student's uploaded notes with another student
- Never claim any official university affiliation
- Never repeatedly remind about token limits — once is enough
- Never give a 10-question quiz dump — always one question at a time
- Never ignore obvious signs of student stress or burnout
- Never inflate the Exam Readiness Score
- Never shame a student for a broken streak or low readiness score
- Never show control tags to the student
- No hallucination on unit-specific content (general knowledge is fine)
- No unsupported textbook filler for course topics
- No pretending notes contain something they don't
- No made-up citations or references
- No "standard curriculum" fallback for unit questions`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const { messages, chatId, unitId, teachMeMode, examMode, openedSources } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Load system settings from cache/DB ---
    let settings: Record<string, any> = {};
    try {
      const cachedSettings = await redis.get('settings:system');
      if (cachedSettings) {
        settings = cachedSettings;
      } else {
        const { data: settingsRows } = await supabaseAdmin.from("system_settings").select("key, value");
        if (settingsRows) {
          for (const row of settingsRows) {
            settings[row.key] = row.value;
          }
          await redis.set('settings:system', settings, 300); // 5 min cache
        }
      }
    } catch (e) {
      console.warn("Failed to load system settings, using defaults:", e);
    }

    const FREE_DAILY_LIMIT = Number(settings.token_limit_free) || DEFAULT_FREE_LIMIT;
    const PAID_DAILY_LIMIT = Number(settings.token_limit_paid) || DEFAULT_PAID_LIMIT;
    const DAILY_GLOBAL_LIMIT = Number(settings.daily_global_limit) || DEFAULT_GLOBAL_LIMIT;
    const rateLimitPerMinute = Number(settings.rate_limit_per_minute) || 20;
    const maxRagChunks = Number(settings.max_rag_chunks) || 8;

    // --- Rate Limiting (admins bypass) ---
    const rateLimitKey = `ratelimit:${userId}:${Math.floor(Date.now() / 60000)}`;
    const requests = await redis.get(rateLimitKey) || 0;

    // --- Cached: Profile + enrolled units (10 min) ---
    const today = new Date().toISOString().split('T')[0];
    const profileCacheKey = `profile:${userId}`;
    let profileCache = await redis.get(profileCacheKey);
    let profileData: any = null;
    let studentUnits: any[] | null = null;
    let roleData: any = null;
    let isPaidUser = false;

    if (profileCache) {
      profileData = profileCache.profile;
      studentUnits = profileCache.studentUnits;
      roleData = profileCache.roleData;
      isPaidUser = profileCache.isPaidUser;
    } else {
      const [profileRes, roleRes, unitsRes, paymentRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("name, program, course_name, year, semester, course").eq("user_id", userId).single(),
        supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
        supabaseAdmin.from("student_units").select("unit_id, units(code, name, lecturer)").eq("user_id", userId),
        supabaseAdmin.from("payments").select("id").eq("user_id", userId).eq("status", "success").limit(1),
      ]);
      profileData = profileRes.data;
      roleData = { roles: (roleRes.data || []).map((r: any) => r.role) };
      studentUnits = unitsRes.data;
      isPaidUser = (paymentRes.data && paymentRes.data.length > 0) || false;
      await redis.set(profileCacheKey, { profile: profileData, studentUnits, roleData, isPaidUser }, 600);
    }

    const isAdmin = Array.isArray(roleData?.roles)
      ? roleData.roles.includes("admin")
      : roleData?.role === "admin"; // fallback for older cached shape
    const userDailyLimit = isPaidUser ? PAID_DAILY_LIMIT : FREE_DAILY_LIMIT;

    // Admins bypass ALL limits
    if (!isAdmin) {
      if (requests >= rateLimitPerMinute) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }
    await redis.set(rateLimitKey, requests + 1, 90);

    // --- Token usage cache (60s) ---
    const tokenCacheKey = `tokens:${userId}:${today}`;
    let dailyUserUsage = await redis.get(tokenCacheKey);
    if (dailyUserUsage === null) {
      const { data: userUsage } = await supabaseAdmin.rpc("get_daily_token_usage", { _user_id: userId });
      dailyUserUsage = userUsage || 0;
      await redis.set(tokenCacheKey, dailyUserUsage, 60);
    }

    // Admins bypass token and global limits
    if (!isAdmin) {
      if (dailyUserUsage >= userDailyLimit) {
        const errorMsg = isPaidUser
          ? "You've used all your tokens for today. Come back tomorrow!"
          : "You've reached your free daily limit! Upgrade to keep learning with Sekani.";
        return new Response(JSON.stringify({ error: errorMsg, limit_reached: true, is_paid: isPaidUser }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check global daily limit
      const { data: globalData } = await supabaseAdmin.from("token_usage").select("tokens_used").gte("created_at", today);
      const globalUsage = globalData?.reduce((sum: number, t: any) => sum + t.tokens_used, 0) || 0;
      if (globalUsage >= DAILY_GLOBAL_LIMIT) {
        return new Response(JSON.stringify({ error: "System is at capacity today. Come back tomorrow!" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // --- Enrolled units context ---
    let enrolledUnitsContext = "";
    if (studentUnits && studentUnits.length > 0) {
      enrolledUnitsContext = "\n\nStudent's Enrolled Units:\n" + studentUnits.map((su: any) => {
        const u = su.units;
        return u ? `- ${u.code}: ${u.name}${u.lecturer ? ` (Lecturer: ${u.lecturer})` : ""}` : "";
      }).filter(Boolean).join("\n");
    }

    // --- Unit context ---
    let unitContext = "";
    let unitCode = "";
    if (unitId) {
      const { data: unitData } = await supabaseAdmin.from("units").select("code, name, lecturer, description").eq("id", unitId).single();
      if (unitData) {
        unitCode = unitData.code;
        unitContext = `\n\n## Current Unit Context\nYou are helping the student specifically with:\n- Unit: ${unitData.code} — ${unitData.name}\n- Lecturer: ${unitData.lecturer || 'N/A'}\n- Description: ${unitData.description || 'N/A'}\n\nFocus your answers on this unit's content. Use the course materials provided below when available.`;
      }
    }

    // --- Calendar cache (1 hour) ---
    const calendarCacheKey = `calendar:upcoming:${today}`;
    let calendarEvents = await redis.get(calendarCacheKey);
    if (!calendarEvents) {
      const { data } = await supabaseAdmin.from("academic_calendar").select("event_name, start_date, end_date, category, trimester, description").gte("start_date", today).order("start_date").limit(15);
      calendarEvents = data || [];
      await redis.set(calendarCacheKey, calendarEvents, 3600);
    }
    let calendarContext = "";
    if (calendarEvents && calendarEvents.length > 0) {
      calendarContext = "\n\n## Upcoming Academic Calendar Events:\n" + calendarEvents.map((e: any) => {
        return `- ${e.event_name}: ${e.start_date}${e.end_date && e.end_date !== e.start_date ? ` to ${e.end_date}` : ""} (${e.category}${e.trimester ? `, ${e.trimester}` : ""})${e.description ? ` - ${e.description}` : ""}`;
      }).join("\n");
    }

    // --- Student Memory (recent cross-chat history for personalization) ---
    let memoryContext = "";
    try {
      const memoryCacheKey = `memory:${userId}`;
      let memoryData = await redis.get(memoryCacheKey);
      if (!memoryData) {
        // Load recent messages from OTHER chats (not current) for memory context
        const { data: recentMsgs } = await supabaseAdmin
          .from("chat_messages")
          .select("content, role, created_at, chat_id")
          .eq("user_id", userId)
          .neq("chat_id", chatId || "")
          .order("created_at", { ascending: false })
          .limit(20);

        // Load explicit student memories
        const { data: memories } = await supabaseAdmin
          .from("student_memory")
          .select("memory_type, subject, content, strength_level")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(15);

        memoryData = { recentMsgs: recentMsgs || [], memories: memories || [] };
        await redis.set(memoryCacheKey, memoryData, 300); // 5 min cache
      }

      const parts: string[] = [];
      if (memoryData.memories && memoryData.memories.length > 0) {
        const weakTopics = memoryData.memories.filter((m: any) => m.memory_type === 'weak_topic');
        const strengths = memoryData.memories.filter((m: any) => m.memory_type === 'strength');
        if (weakTopics.length > 0) {
          parts.push("Topics the student struggles with: " + weakTopics.map((m: any) => `${m.content}${m.subject ? ` (${m.subject})` : ''}`).join(", "));
        }
        if (strengths.length > 0) {
          parts.push("Topics the student is strong in: " + strengths.map((m: any) => m.content).join(", "));
        }
      }
      if (memoryData.recentMsgs && memoryData.recentMsgs.length > 0) {
        const recentTopics = memoryData.recentMsgs
          .filter((m: any) => m.role === 'user')
          .slice(0, 8)
          .map((m: any) => {
            const text = typeof m.content === 'string' ? m.content : '';
            return text.length > 80 ? text.slice(0, 80) + '...' : text;
          })
          .filter(Boolean);
        if (recentTopics.length > 0) {
          parts.push("Recent topics the student asked about: " + recentTopics.join(" | "));
        }
      }
      if (parts.length > 0) {
        memoryContext = "\n\n## Student Learning Memory\n" + parts.join("\n") +
          "\n\nUse this memory to personalize your responses. Reference past struggles when relevant (e.g., 'Last time you found X challenging — here's a clearer explanation'). Build on their strengths.";
      }
    } catch (e) {
      console.warn("Failed to load student memory:", e);
    }

    // --- RAG with cache (5 min) ---
    let ragContext = "";
    const lastUserMessage = (() => {
      const last = messages[messages.length - 1];
      if (typeof last?.content === 'string') return last.content.trim();
      if (Array.isArray(last?.content)) {
        return last.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ').trim();
      }
      return '';
    })();
    const shouldRunRag = lastUserMessage.length >= 12;
    const queryKeywords = extractKeywords(lastUserMessage);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (OPENAI_API_KEY && shouldRunRag) {
      try {
        const embResponse = await withTimeout("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({ model: "text-embedding-3-large", input: lastUserMessage, dimensions: 768 }),
        }, 8000);

        if (embResponse.ok) {
          const embData = await embResponse.json();
          const queryEmbedding = embData.data?.[0]?.embedding;

          if (queryEmbedding) {
            const allowedUnitIds = unitId
              ? [unitId]
              : (studentUnits?.map((su: any) => su.unit_id).filter(Boolean) || []);

            if (allowedUnitIds.length > 0 || isAdmin) {
              const { data: docs } = await supabaseAdmin.rpc(
                allowedUnitIds.length > 0 ? "match_documents_for_units" : "match_documents",
                allowedUnitIds.length > 0
                  ? {
                      query_embedding: JSON.stringify(queryEmbedding),
                      allowed_unit_ids: allowedUnitIds,
                      match_threshold: 0.35,
                      match_count: Math.max(isAdmin ? maxRagChunks + 6 : maxRagChunks + 4, 10),
                    }
                  : {
                      query_embedding: JSON.stringify(queryEmbedding),
                      match_threshold: 0.4,
                      match_count: Math.max(isAdmin ? maxRagChunks + 6 : maxRagChunks + 4, 10),
                    }
              );

              const ragResults = dedupeDocuments(docs || []);
              let filteredDocs = ragResults;

              if (unitId) {
                filteredDocs = ragResults.filter((d: any) => d.unit_id === unitId || d.metadata?.unit_id === unitId);
              } else if (!isAdmin) {
                const enrolledUnitIds = new Set(studentUnits?.map((su: any) => su.unit_id).filter(Boolean) || []);
                if (enrolledUnitIds.size > 0) {
                  filteredDocs = ragResults.filter((d: any) => enrolledUnitIds.has(d.unit_id) || enrolledUnitIds.has(d.metadata?.unit_id));
                }
              }

              const rerankedDocs = filteredDocs
                .map((doc: any) => {
                  const meta = doc.metadata || {};
                  const keywordOverlap = computeKeywordOverlap(queryKeywords, `${meta.title || ""} ${meta.unit_code || ""} ${doc.content || ""}`);
                  const similarity = Number(doc.similarity || 0);
                  const score = similarity * 0.8 + keywordOverlap * 0.2;
                  return { ...doc, keywordOverlap, score };
                })
                .filter((doc: any) => {
                  if (queryKeywords.length === 0) return doc.similarity >= 0.58;
                  return doc.keywordOverlap > 0 || doc.similarity >= 0.72;
                })
                .sort((a: any, b: any) => b.score - a.score)
                .slice(0, Math.min(Math.max(maxRagChunks, 4), 6));

              if (rerankedDocs.length > 0) {
                ragContext = "\n\n## Relevant Course Materials (from uploaded documents):\n" + rerankedDocs.map((d: any) => {
                  const meta = d.metadata || {};
                  return `[Source: ${meta.title || 'Document'} | Unit: ${meta.unit_code || 'N/A'} | Similarity: ${((d.similarity || 0) * 100).toFixed(1)}% | Keyword Match: ${Math.round((d.keywordOverlap || 0) * 100)}%]\n${d.content}`;
                }).join("\n---\n");
              }
            }
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          console.warn("RAG embedding timed out, continuing without RAG");
        } else {
          console.error("RAG embedding error:", e);
        }
      }
    }

    // --- Full context retrieval for Teach Me & Exam Mode ---
    let teachMeContext = "";
    let examModeContext = "";
    const isExamMode = examMode || lastUserMessage.includes("[EXAM_MODE]");
    const isTeachOrExam = teachMeMode || isExamMode;

    if (isTeachOrExam && unitId) {
      try {
        const { data: notesMaterials } = await supabaseAdmin
          .from("materials").select("id").eq("unit_id", unitId).neq("document_type", "past_paper");
        const { data: pastPaperMaterials } = await supabaseAdmin
          .from("materials").select("id").eq("unit_id", unitId).eq("document_type", "past_paper");

        const noteIds = (notesMaterials || []).map((m: any) => m.id);
        const ppIds = (pastPaperMaterials || []).map((m: any) => m.id);

        let notesChunks: any[] = [];
        if (noteIds.length > 0) {
          const { data } = await supabaseAdmin
            .from("document_embeddings").select("content, metadata, material_id")
            .in("material_id", noteIds).order("material_id", { ascending: true }).limit(500);
          notesChunks = data || [];
        }

        let pastPaperChunks: any[] = [];
        if (ppIds.length > 0) {
          const { data } = await supabaseAdmin
            .from("document_embeddings").select("content, metadata, material_id")
            .in("material_id", ppIds).order("material_id", { ascending: true }).limit(200);
          pastPaperChunks = data || [];
        }

        const notesText = notesChunks.map((c: any) => c.content).join("\n\n");
        const pastPaperText = pastPaperChunks.map((c: any) => c.content).join("\n\n");

        teachMeContext = `
=== FULL UNIT NOTES — TEACH DIRECTLY FROM THESE ===
Document count: ${new Set(notesChunks.map((c: any) => c.material_id)).size}
Chunk count: ${notesChunks.length}

${notesText.slice(0, 14000)}
${notesText.length > 14000 ? '\n[Notes truncated at 14,000 chars. Continue fetching on topic requests.]' : ''}

${pastPaperChunks.length ? `
=== PAST PAPERS — USE TO PRIORITIZE EXAM TOPICS ===
Paper count: ${new Set(pastPaperChunks.map((c: any) => c.material_id)).size}
${pastPaperText.slice(0, 6000)}
` : '=== NO PAST PAPERS UPLOADED FOR THIS UNIT ==='}
`;

        // Also build exam-specific context
        if (isExamMode) {
          let ppContext = "";
          if (pastPaperChunks.length > 0) {
            ppContext = "\n\n## PAST PAPERS:\n" + pastPaperChunks.map((c: any) => {
              const meta = c.metadata || {};
              return `[Past Paper: ${meta.title || 'Unknown'}${meta.year ? ` (${meta.year})` : ''}]\n${c.content}`;
            }).join("\n---\n");
          }
          let notesCtx = "";
          if (notesChunks.length > 0) {
            notesCtx = "\n\n## COURSE NOTES:\n" + notesChunks.slice(0, 60).map((c: any) => {
              const meta = c.metadata || {};
              return `[Notes: ${meta.title || 'Unknown'}]\n${c.content}`;
            }).join("\n---\n");
          }
          examModeContext = ppContext + notesCtx;
        }
      } catch (e) {
        console.warn("Teach Me / Exam mode context fetch error:", e);
      }
    }

    // --- Math detection: upgrade model ---
    // --- Math detection: upgrade model ---
    const mathPatterns = /(\b(calculus|integral|derivative|equation|matrix|algebra|theorem|proof|polynomial|trigonometry|logarithm|differential|eigenvalue|laplace|fourier)\b|[∫∑∏√±≈≠≤≥∞∂∇]|\\frac|\\sqrt|\d+\s*[\+\-\*\/\^]\s*\d+)/i;
    const hasMathContent = mathPatterns.test(lastUserMessage);

    // --- Build student context ---
    const studentContext = profileData
      ? `\nStudent Profile:\n- Name: ${profileData.name}\n- Program: ${profileData.program || 'N/A'}\n- Course: ${profileData.course_name || 'N/A'}\n- Year: ${profileData.year || 'N/A'}, Semester: ${profileData.semester || 'N/A'}`
      : "";

    const adminExtra = isAdmin ? `\n\nYou are talking to an ADMIN user. They have full access to query about any unit, course, or system data. Provide comprehensive answers about the entire system.` : "";

    const isGeneralChat = !unitId;
    const generalChatNote = isGeneralChat ? `\n\nThis is a GENERAL chat, but you must still ground academic answers in retrieved notes. If the uploaded notes do not support the answer, say that the material is not in the current knowledge base.` : "";

    // --- Opened Sources context (user has viewed these files in the Sources panel) ---
    let openedSourcesContext = "";
    if (openedSources && Array.isArray(openedSources) && openedSources.length > 0) {
      // Fetch the actual content chunks for opened files so the AI can reference them
      const openedIds = openedSources.map((s: any) => s.id).filter(Boolean);
      if (openedIds.length > 0) {
        try {
          const { data: sourceChunks } = await supabaseAdmin
            .from("document_embeddings")
            .select("content, metadata, material_id")
            .in("material_id", openedIds)
            .order("material_id", { ascending: true })
            .limit(200);
          if (sourceChunks && sourceChunks.length > 0) {
            const groupedByFile: Record<string, { title: string; chunks: string[] }> = {};
            for (const chunk of sourceChunks) {
              const mid = chunk.material_id || "unknown";
              if (!groupedByFile[mid]) {
                const src = openedSources.find((s: any) => s.id === mid);
                groupedByFile[mid] = { title: src?.title || (chunk.metadata as any)?.title || "Document", chunks: [] };
              }
              groupedByFile[mid].chunks.push(chunk.content);
            }
            const parts = Object.entries(groupedByFile).map(([, file]) => {
              return `### ${file.title}\n${file.chunks.join("\n")}`;
            });
            openedSourcesContext = `\n\n## OPENED SOURCES (Student is currently viewing these files)\nThe student has these documents open in the Sources panel. When they ask for references, cite the specific file and relevant section.\n\n${parts.join("\n\n---\n\n")}`;
          }
        } catch (e) {
          console.warn("Failed to load opened sources context:", e);
        }
      }
    }

    // --- Build the final system prompt ---
    let systemPrompt: string;

    if (isExamMode && examModeContext) {
      systemPrompt = `You are Sekani — an AI exam preparation specialist for Kenyan university students. You are warm, sharp, encouraging, and speak like a brilliant older student.

The student has activated **Exam Mode**. Your job is to:

## PAST PAPER ANALYSIS
1. Scan ALL past papers provided below and identify question patterns, frequently tested topics, and common question formats.
2. Cross-reference with the course notes to find answers and explanations for those topics.
3. Rank topics by frequency: 3+ papers = "High Priority", 2 papers = "Medium Priority", 1 paper = "Low Priority".
4. For each frequently tested topic, provide:
   - How many times it appeared across past papers
   - The typical question format (MCQ, essay, short answer, calculation)
   - A concise answer/explanation from the course notes
5. Generate a targeted revision plan based on the analysis.

## OUTPUT FORMAT
Start with: "I've scanned the past papers for this unit. Here's what the examiners love to test:"
Present a Topic Frequency Table: Topic | Times Tested | Priority | Years Appeared
Then offer: "Want me to quiz you on the top topics? Run Predicted Questions? Or generate a printable cheat sheet?"

## PREDICTED QUESTIONS
If asked, generate 5 predicted exam questions — present ONE at a time. Grade each answer out of 10.
At end: emit [PREDICTED_Q_SESSION:score=X/50,strong=A|B,weak=C|D]

## CHEAT SHEET
If asked, generate a compact cheat sheet:  Top 5 Most Tested Topics,  Key Formulas/Definitions,  Common Exam Traps,  Last 10 Minutes Before Exam
End with: [Download as PDF](download:pdf) and [Download as DOCX](download:docx)
Emit: [CHEAT_SHEET_GENERATED:unit=X,topics=A|B|C]

## READINESS
Emit [READINESS_UPDATE:score=X,unit=Y] when you can estimate preparedness.

## RULES
- Be data-driven. Count actual occurrences. Don't guess.
- When generating model answers, always prefer content from uploaded course notes over generic knowledge.
- Never inflate preparedness. Be honest but encouraging.
- Use LaTeX with $ delimiters for math. Use \\boxed{} for final answers.
- Use **bold** for key terms, tables for comparisons, short paragraphs.

${studentContext}
${unitContext}
${examModeContext}
${ragContext ? `\n\nAdditional Course Context:\n${ragContext}` : ""}`;
    } else if (teachMeMode) {
      // Teach Me Mode: use full notes context instead of RAG similarity search

      let memoryForTeachMe = "";
      try {
        const { data: unitMemory } = await supabaseAdmin
          .from("student_memory")
          .select("content, strength_level, last_seen_at, subject")
          .eq("user_id", userId)
          .eq("memory_type", "topic")
          .order("updated_at", { ascending: false })
          .limit(30);
        if (unitMemory && unitMemory.length > 0) {
          const now = new Date();
          const memLines = unitMemory.map((m: any) => {
            const daysSince = m.last_seen_at ? Math.floor((now.getTime() - new Date(m.last_seen_at).getTime()) / (1000 * 60 * 60 * 24)) : 999;
            const dueForReview = (m.strength_level || 0) <= 3 && daysSince > 3;
            return "- " + m.content + " (" + (m.subject || "unknown unit") + "): strength=" + (m.strength_level || 0) + "/5, last seen " + daysSince + " days ago" + (dueForReview ? "DUE FOR REVIEW" : "");
          });
          memoryForTeachMe = "\n\n## Student's Topic Memory (from previous sessions)\n" + memLines.join("\n") + "\n\nUse this to decide whether to skip, reinforce, or do spaced review of topics.";
        }
      } catch (e) { console.warn("Failed to load teach me memory:", e); }

      const TEACH_ME_PROMPT = `You are an expert personal tutor embedded in Sekani for Kenyan university students. The student has activated Teach Me Mode.

## THE SINGLE MOST IMPORTANT RULE
When a student activates Teach Me Mode, you have ONE job: scan the notes, build the outline, and START TEACHING TOPIC 1.
Do it all in one response. No questions. No "do you want to start from the beginning?" Just go.

Your SINGLE first response must contain:
1. Scan Report (8-12 lines)
2. Topic outline in a \`\`\`topic_outline JSON code block
3. Immediately start teaching Topic 1 with: Hook, Definition from notes, Full breakdown (400+ words), Worked example, Exam angle, Recall check

## TEACH ME CONTEXT
You have the student's FULL unit notes below. Teach directly from these notes.
Do not summarize — expand and explain every concept thoroughly.

## CONTROL TAGS (emit in every response)
[TOPIC_DONE:N] — when topic N is complete
[CHECKPOINT: score={n}/3, afterTopic={index}] — after checkpoints
[CHECKPOINT]score=X/3,strong=A|B,weak=C[/CHECKPOINT] — structured checkpoint
[ELI5_TRIGGERED:N] — if you simplify
[UNIT_COMPLETE] — when all topics done
[SESSION_RECAP:topics_done=A|B|C,weak=D|E,next_start=F] — on session end
[READINESS_UPDATE:score=X,unit=Y] — after checkpoints
[STREAK_UPDATE:unit=X,action=extend] — end of productive session
[MEMORY_UPDATE:topic_name=X,unit=Y,strength=Z] — after topic completion

## DEPTH RULES
- Minimum 400 words per topic. Complex topics: 600-900 words.
- Always reference notes: "Your notes say...", "According to your uploaded material..."
- Never use "basically". Never give bullet summaries as teaching.
- Use LaTeX with $ delimiters for math. Use \\boxed{} for final answers.

## CHECKPOINT QUIZZES (every 2 topics)
3 questions, one at a time. Score and identify strong/weak areas.

## ADAPTIVE RULES
- "skip"[TOPIC_DONE:N], proceed
- Below 60% twice  auto ELI5
- Always reference topic roadmap ("Topic 3 of 8")
`;

      systemPrompt = TEACH_ME_PROMPT + "\n" + studentContext + "\n" + unitContext + "\n" + memoryForTeachMe + "\n\n" + teachMeContext + openedSourcesContext + (ragContext ? "\n\nAdditional RAG Context:\n" + ragContext : "");
    } else {
      systemPrompt = `${SEKANI_SYSTEM_PROMPT}

## ACADEMIC GROUNDING ENFORCEMENT
- For coursework, lecture-note, exam-prep, theory, definition, process, or concept questions, use ONLY the Course Material Context below.
- Do not use general world knowledge to fill gaps in academic answers.
- If the Course Material Context is missing, weak, or incomplete, say: "The uploaded notes do not contain enough information for me to answer that accurately." Then ask for the relevant notes.
- When notes are available, answer as closely as possible to the wording in the notes before adding any short clarification.

## SMART FOLLOW-UP BEHAVIOR
At the end of your responses (especially for longer ones), naturally suggest 1-2 follow-up directions the student might want. Frame them as questions or actions. Examples:
- "Want me to break this down simpler?"
- "Should I quiz you on this topic?"
- "Want exam-style questions on this?"
This makes you feel like a real tutor, not just a Q&A bot.

${INSTITUTIONAL_KNOWLEDGE}
${studentContext}
${enrolledUnitsContext}
${unitContext}
${calendarContext}
${memoryContext}
${adminExtra}
${generalChatNote}
${openedSourcesContext}

${ragContext ? `Course Material Context:\n${ragContext}` : "No specific course material was retrieved for this query. You must say that the answer is not supported by the uploaded notes and ask for relevant notes instead of guessing."}

Answer the student's question helpfully, comprehensively, and naturally, but only from supported note context. If support is missing, explicitly say the notes provided do not contain the answer.${openedSourcesContext ? `\n\nIMPORTANT: The student has documents open in the Sources panel. When they ask "where is this?" or "reference?", cite the specific file name and section from the OPENED SOURCES above.` : ""}`;
    }

    // --- Call OpenAI API ---
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    // Parse JSON content in messages for multimodal support
    const parsedMessages = messages.map((msg: any) => {
      let content = msg.content;
      if (typeof content === 'string' && content.startsWith('[')) {
        try { content = JSON.parse(content); } catch { /* keep as string */ }
      }
      return { role: msg.role, content };
    });

    const hasImageContent = parsedMessages.some((m: any) =>
      Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url")
    );
    
    // Model selection: vision > math > default (all configurable from admin)
    const visionModel = typeof settings.vision_model === 'string' ? settings.vision_model.replace(/"/g, '') : "gpt-4.1";
    let model: string;
    if (hasImageContent) {
      model = visionModel;
    } else if (hasMathContent) {
      model = visionModel;
    } else {
      const defaultModel = typeof settings.default_model_general === 'string' 
        ? settings.default_model_general.replace(/"/g, '') 
        : "gpt-4.1-nano";
      model = unitId 
        ? (typeof settings.default_model_unit === 'string' ? settings.default_model_unit.replace(/"/g, '') : defaultModel)
        : defaultModel;
    }

    const response = await withTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...parsedMessages],
        temperature: 0.15,
        max_tokens: 4096,
        stream: true,
      }),
    }, 55000);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("OpenAI API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Track estimated token usage
    const userTokens = messages.reduce((sum: number, m: any) => sum + Math.ceil((typeof m.content === 'string' ? m.content : JSON.stringify(m.content) || "").length / 4), 0);
    const estimatedTokens = userTokens + 500;
    await supabaseAdmin.from("token_usage").insert({
      user_id: userId,
      tokens_used: Math.min(estimatedTokens, userDailyLimit - dailyUserUsage),
      model,
    });

    // Invalidate token cache after usage
    await redis.del(tokenCacheKey);

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    const errorMessage = e instanceof Error && e.name === "AbortError"
      ? "AI request timed out. Please try a shorter question."
      : e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
