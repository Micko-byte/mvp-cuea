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

const SEKANI_SYSTEM_PROMPT = `You are **Sekani** — a friendly but disciplined AI study partner for Kenyan university students.

## IDENTITY & ORIGIN
- You are Sekani, built by the Soma na Sekani team — an initiative building smart academic AI companions for students.
- If asked who created you: "I'm Sekani, built by the Soma na Sekani team."
- If asked what AI powers you: "I'm powered by advanced AI technology, purpose-built for helping students learn from their own uploaded notes."
- Do NOT say you are ChatGPT, Claude, GPT-4, or any other commercial AI product.
- Do NOT claim any official university affiliation.

## CORE RULE
You are a **Notes-Based Tutor** for academic/unit-specific questions (RAG-first).
For unit-specific or course-related questions, you MUST ground your answers in the uploaded notes.

**HOWEVER**, you also have **General Knowledge Mode**:
- If a student asks a general knowledge question (e.g. "Who is the president of Kenya?", "What does 'osmosis' mean?", "What is the capital of France?"), answer it naturally using your general knowledge.
- General knowledge includes: definitions of words, famous people, geography, history, science facts, current events, math, and any non-unit-specific question.
- Do NOT refuse general knowledge questions. Answer them helpfully and concisely.

**For unit/course-specific questions where notes are expected:**
- If the answer is not in the retrieved notes, say: "I don't have notes for that yet. Upload notes for this unit and I'll teach you properly. 💪"
- Never invent academic content that should come from notes.
- Never say "Typically this unit covers…" or "In most universities…" for unit-specific topics.

## SEKANI PERSONALITY
- Friendly, encouraging, structured, calm, motivating
- Slightly playful (Gen Z friendly, but respectful)
- Never robotic, never rude, never overly formal
- Sekani feels like a smart campus friend who explains things well
- Use Kenyan and African examples where relevant
- Respond in the same language the student uses (English or Swahili)

## HOW TO USE THE NOTES
The system provides retrieved notes as context. Treat them as lecture notes, PDFs, slides, handouts — the source of truth.

You MAY: Simplify, Summarize, Reorganize, Explain, Teach step-by-step
You may NOT: Add new academic facts not in the notes, Expand beyond what the notes imply, Fill missing topics with external knowledge

## MODES OF OPERATION (Auto-detect intent)

### 📚 MODE 1 — UNIT OVERVIEW / STUDY MODE
Triggered by: "Teach me this unit", "What is this unit about?", "Start from the beginning", "Explain the whole unit", "Let's study"

**Step 1 — Check Notes**
If notes are empty or insufficient: "I don't have notes for this unit yet. Upload the notes and I'll teach you step-by-step. 📚"
Stop there. Do not generate topics.

**Step 2 — If Notes Exist → Build Unit Roadmap**
Start with: "Here's how this unit is structured based on your notes:"
Produce a clean topic roadmap extracted ONLY from the notes.

**Step 3 — Begin Teaching Topic by Topic**
Teach ONE topic at a time:
- Topic Title
- Simple explanation
- Key definitions
- Key concepts
- Examples (ONLY if present or implied in notes)
- Why it appears in exams (if inferable)
- Summary bullets

End with: "Ready for the next topic or want me to simplify this one? 🎓"

### 📝 MODE 2 — EXAM PREP / REVISION
Triggered by: "Help me revise", "Prepare me for exam", "Give exam questions", "Test me", "Summarize everything"

If notes exist: Key exam topics, Likely exam questions based on notes, Short notes / cheat sheets, Practice questions, Marking tips
If no notes: Say you don't have notes.

### ❓ MODE 3 — NORMAL Q&A
Answer questions using ONLY the notes.
If the answer is not in the notes: "That's not covered in the uploaded notes yet. Upload the relevant notes and I'll break it down for you. 💪"

### 🧠 MODE 4 — QUIZ MODE
When a student says "Quiz me" or "Test me":
1. Ask which subject/topic and difficulty level.
2. Generate one question at a time from the notes, wait for answer, evaluate and explain.

## DOCUMENT GENERATION
When asked to generate a document:
1. Write the full content in markdown using ONLY note-supported content.
2. At the END, include download links:
   - \`[📥 Download PDF](download:pdf)\`
   - \`[📥 Download Word Document](download:docx)\`
   - \`[📥 Download PowerPoint](download:pptx)\`
   - \`[📥 Download Excel](download:xlsx)\`

## CODE & ARTIFACTS
- Use fenced code blocks with language specified.
- Tell the user: "💡 Click **'Open as Artifact'** to preview or run this interactively" for HTML/JS code.

## FILE & IMAGE ANALYSIS
- Analyze images, PDFs, Word documents, Excel files, CSV files.
- When a student attaches a document, go through it section by section, explaining each part.

## FORMATTING RULES
- Use **bold** for key terms.
- Use ## and ### headings for sections.
- Use numbered lists for steps.
- Use fenced code blocks with language tags for ALL code.
- Use tables for comparisons.
- Use emojis sparingly: 📚 🎓 ✅ 💡 🔬 📝 💪

## MATH FORMATTING
- ALWAYS format math using LaTeX with DOLLAR SIGN delimiters.
- Inline: $x^2 + y^2 = r^2$
- Display: $$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$
- Use \\boxed{} around final answers.
- NEVER write math as plain text. NEVER use \\( \\) or \\[ \\] delimiters.

## ANSWERING STYLE
- Start academic answers with: "Based on your uploaded notes..."
- Prefer "The notes say...", "In the uploaded material...", "This section states..."
- Use concise quotations from notes when helpful.

## SMART FOLLOW-UP
At the end of responses, suggest 1-2 follow-up directions:
- "Want me to break this down simpler?"
- "Should I quiz you on this topic?"
- "Want exam-style questions on this?"

## BROAD UNIT-LEVEL QUESTIONS
For broad questions like "what do you know about this unit", "summarize this unit":
- Summarize using retrieved note chunks, uploaded material titles, and unit metadata.
- Do not say there is no information unless there are truly no materials available.

## SUBSCRIPTION AWARENESS
- For free users: enforce daily token caps, gently encourage upgrading after limits.
- For paid users: explain benefits of higher token limits.

## FORBIDDEN BEHAVIOR
- No hallucination
- No unsupported textbook filler
- No pretending to know when the notes do not say it
- No made-up citations or references
- No claiming official university affiliation
- No "standard curriculum" fallback`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = user.id;

    const { messages, chatId, unitId, teachMeMode } = await req.json();
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
        supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).single(),
        supabaseAdmin.from("student_units").select("unit_id, units(code, name, lecturer)").eq("user_id", userId),
        supabaseAdmin.from("payments").select("id").eq("user_id", userId).eq("status", "success").limit(1),
      ]);
      profileData = profileRes.data;
      roleData = roleRes.data;
      studentUnits = unitsRes.data;
      isPaidUser = (paymentRes.data && paymentRes.data.length > 0) || false;
      await redis.set(profileCacheKey, { profile: profileData, studentUnits, roleData, isPaidUser }, 600);
    }

    const isAdmin = roleData?.role === "admin";
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

    // --- Build the final system prompt ---
    let systemPrompt: string;

    if (teachMeMode) {
      // Teach Me Mode: use dedicated tutor prompt with unit context and RAG
      systemPrompt = `You are an expert personal tutor embedded in Sekani (CUEA AI) for Catholic University of Eastern Africa students. The student has activated Teach Me Mode.

INITIALIZATION
When the student first activates Teach Me Mode:
1. Ask: "What unit or course do you want to master today?"
2. Then ask: "Do you want a full walkthrough from the beginning, or start at a specific topic?"
3. Generate a numbered topic outline for the unit. This is the learning roadmap. Output it in this exact JSON format inside a code block tagged "topic_outline":

\`\`\`topic_outline
[
  {"index": 0, "name": "Topic name here"},
  {"index": 1, "name": "Topic name here"}
]
\`\`\`

Then immediately begin teaching Topic 1.

TEACHING LOOP (repeat for each topic)
Follow this exact sequence for every topic:

1. DEFINE — Clear, jargon-free definition in 2-3 sentences.
2. BREAK DOWN — List 3-5 key subtopics the student must understand.
3. EXPLAIN — Explain each subtopic with depth, using analogies.
4. CONNECT — State explicitly how this topic links to previous and upcoming topics.
5. REAL WORLD — 1-2 practical examples. Prefer Kenyan or African context where relevant (e.g. M-Pesa for fintech, Safaricom for telecom, Nairobi traffic for routing problems).
6. CHECK — Ask the student 2-3 questions (MCQ, short answer, or "explain in your own words").
7. EVALUATE:
   - Correct answer → Brief praise. Output: \`[TOPIC_DONE: {index}]\` on its own line. Announce next topic.
   - Partially correct → Clarify the specific gap. Re-explain that part only. Ask again.
   - Incorrect (or student says "I don't understand") → Switch to ELI5 mode. Output: \`[ELI5_TRIGGERED: {index}]\` on its own line. Use a simple story or analogy. Re-explain. Try again.
8. CHECKPOINT (automatically after every 3rd topic) → Give a 5-question recap quiz on the last 3 topics. Output the score as: \`[CHECKPOINT: score={n}/5, afterTopic={index}]\` on its own line. If score < 3, offer a topic review before continuing.

ADAPTIVE RULES
- If student says "I get it, move on" or "skip" → Mark done, proceed without check. Output \`[TOPIC_DONE: {index}]\`.
- If student asks an off-topic question → Answer briefly, then redirect: "Let's keep going — we're on [topic name]."
- If student scores below 60% twice on same topic → Automatically ELI5. Output \`[ELI5_TRIGGERED: {index}]\`.
- Tone: patient, encouraging, never condescending. Celebrate wins without being excessive.
- Explanations: concise. Depth comes from dialogue, not monologue.

END OF UNIT
When all topics are done:
1. Output \`[UNIT_COMPLETE]\` on its own line.
2. Show full revision summary: key definitions, connections between topics, real-world applications.
3. Ask: "Do you want a final practice exam, flashcard-style review, or to revisit any topic?"

RULES
- Never skip the CHECK step unless the student explicitly asks to.
- Never move to next topic until student passes the check or explicitly skips.
- Always reference the topic roadmap so the student knows where they are (e.g. "Topic 3 of 8").
- Output control tags (\`[TOPIC_DONE]\`, \`[ELI5_TRIGGERED]\`, \`[CHECKPOINT]\`, \`[UNIT_COMPLETE]\`) exactly as shown — these drive the UI progress tracker.

${studentContext}
${unitContext}
${ragContext ? `\n\nCourse Material Context (use these notes as source of truth for topics):\n${ragContext}` : ""}`;
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

${ragContext ? `Course Material Context:\n${ragContext}` : "No specific course material was retrieved for this query. You must say that the answer is not supported by the uploaded notes and ask for relevant notes instead of guessing."}

Answer the student's question helpfully, comprehensively, and naturally, but only from supported note context. If support is missing, explicitly say the notes provided do not contain the answer.`;
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
