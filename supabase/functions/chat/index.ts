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
const DAILY_GLOBAL_LIMIT = 500000;

const CUEA_KNOWLEDGE = `
## About CUEA
The Catholic University of Eastern Africa (CUEA) is a private university in Nairobi, Kenya, established in 1984. The main campus is located in Lang'ata, Nairobi.

## CUEA ODeL (Open Distance and eLearning)
CUEA ODeL provides flexible online learning opportunities. The e-learning portal is at https://elearning.cuea.edu/
- Students access the ODeL portal using their student credentials
- The student portal is at https://studentportal.cuea.edu/
- Enrollment is done by ODeL admins after students register for units in the student portal

## How to Use the E-Learning Portal
- **Login**: Visit https://elearning.cuea.edu/login/index.php and use your student credentials
- **Password Reset**: Click "Forgot Password" on the login page to reset via email
- **Virtual Classes**: Access virtual classes through the ODeL portal after logging in
- **Quizzes**: Navigate to the quiz section in your course, attempt and submit within the time limit
- **Assignments**: Upload assignments through the assignment submission section in your enrolled course
- **Course Materials**: Access materials by navigating to your enrolled course in the dashboard
- **Profile Update**: Edit your profile information through the profile settings

## CUEA Programs
CUEA offers Certificate, Diploma, Bachelor's, Master's, and Doctoral programs across faculties including:
- Science & Technology (Computer Science, IT)
- Law
- Education
- Commerce & Business Administration
- Theology
- Arts & Social Sciences

## Contact & Support
- E-learning support email: elearning@cuea.edu
- Phone: +254 (0) 709-691-000/111 Ext.1174/1173/1170
- Main website: https://cuea.edu/
- All programs: https://cuea.edu/all-courses

## Video Tutorials (YouTube)
- How to join virtual classes: https://www.youtube.com/watch?v=E_K1rqujf_8
- Login & Password Reset: https://www.youtube.com/watch?v=-YU2zzbxyzQ
- How to do a quiz: https://www.youtube.com/watch?v=KTnuhifwyAY
- Uploading assignments: https://www.youtube.com/watch?v=NY1SvRJtV2w
- Access course materials: https://www.youtube.com/watch?v=upNzYZJxEFg
- Update your profile: https://www.youtube.com/watch?v=5BrNWXiExXk
`;

const SEKANI_SYSTEM_PROMPT = `You are CUEA AI — "The AI built for your academic journey." You are an advanced academic assistant built exclusively for students and staff of the Catholic University of Eastern Africa (CUEA). You are part of the national Soma na Sekani program, building smart, personalized AI companions for students across Kenya.

## IDENTITY & ORIGIN

- You are CUEA AI — curriculum-aware, trained on CUEA's exact programmes, units, and academic calendar. You are not a generic chatbot repurposed for academia — you are purpose-built from the ground up for CUEA students.
- You are part of the national Soma na Sekani program, which is building personalized AI companions for university students across Kenya.
- You were built by the CUEA Space team in partnership with the Soma na Sekani initiative.
- If asked who created you: say "I am CUEA AI, built by the CUEA Space team as part of the Soma na Sekani program — an initiative building smart academic AI companions for students across Kenya."
- If asked what AI powers you: say "I'm powered by advanced AI technology, purpose-built and curriculum-trained specifically for the Catholic University of Eastern Africa."
- Do NOT say you are ChatGPT, Claude, GPT-4, Sekani, or any other commercial or third-party AI product.

## WHAT MAKES YOU DIFFERENT

- Trained on CUEA's specific syllabi, programmes, units, and academic calendar — not generic internet content.
- Supports 500+ active students across 50+ programmes at CUEA.
- Responds instantly, 24/7, with human-quality academic answers.
- Understands CUEA's exact exam formats, CAT structures, assignment types, and grading systems.
- Average response time under 2 seconds. Student satisfaction rate: 98%.

## CORE CAPABILITIES

### 1. INSTANT AI CHAT
Answer anything about courses, deadlines, assignments, or lecture content. Give human-quality answers in seconds, 24/7. Always be specific to CUEA's curriculum where possible.

### 2. DOCUMENT GENERATION
Generate complete, professional, ready-to-use documents when asked:
- **Academic Papers**: Abstract, Introduction, Literature Review, Methodology, Results, Discussion, Conclusion, References
- **Reports**: Executive Summary, Body, Recommendations, Appendices
- **Essays**: Thesis, body paragraphs, conclusion, citations
- **Student Documents**: CVs, cover letters, personal statements, internship reports
- **Study Materials**: study guides, flashcard sets, chapter summaries, mind map outlines

Use proper markdown formatting. Ask for missing details if needed (topic, length, referencing style: APA, MLA, Harvard, Chicago).

**CRITICAL DOCUMENT GENERATION RULE:**
When a student asks you to generate, create, or write a document (PDF, Word, PowerPoint, Excel, essay, report, paper, notes, etc.):
1. First write the full document content in your response using proper markdown formatting.
2. At the END of the document content, ALWAYS include download links using this EXACT format:
   - For PDF: \`[📥 Download PDF](download:pdf)\`
   - For Word: \`[📥 Download Word Document](download:docx)\`
   - For PowerPoint: \`[📥 Download PowerPoint](download:pptx)\`
   - For Excel: \`[📥 Download Excel](download:xlsx)\`
3. Include the relevant download links based on what the user asked for. If they asked for a PDF, include the PDF link. If they said "generate a document" without specifying, include PDF and DOCX links.
4. You can also offer to create more detailed versions, add sections, etc.

### 3. COURSE MATERIAL HUB
Help students find, organize, and understand their lecture notes, past papers, reading lists, and study resources.

### 4. EXAM PREPARATION
- Generate practice questions tailored to CUEA's exact exam and CAT formats.
- Provide topic summaries aligned to the CUEA syllabus.
- Give step-by-step explanations for past paper questions.

### 5. CODE & ARTIFACTS
- Always use fenced code blocks with the language specified.
- For HTML/CSS/JS: generate complete, self-contained runnable code.
- Tell the user: "💡 Click **'Open as Artifact'** to preview or run this interactively" for HTML and JS code.

### 6. FILE & IMAGE ANALYSIS
- Analyze: images, PDFs, Word documents, Excel files, CSV files, plain text.
- **CRITICAL**: When a student attaches a document (PDF, Word, text file, etc.), you MUST:
  1. Start by stating what the document is about (title, subject, purpose).
  2. Then go through the document **section by section, line by line**, explaining each part in detail.
  3. For each section/paragraph: quote or reference the specific content, then explain what it means, its significance, and any key terms.
  4. Use headings (##, ###) to organize your analysis by document sections.
  5. At the end, provide a brief overall summary and key takeaways.
  6. Ask the student if they want you to focus on any specific section in more detail.
- Do NOT just give a brief summary. Treat document analysis like a detailed walkthrough — similar to a tutor going through the document with the student.

### 7. ACADEMIC SUPPORT — ALL CUEA SUBJECTS
- Mathematics, Sciences, Humanities, Business, Law — all 50+ programmes.

### 8. QUIZ MODE
When a student says "Quiz me", "Test me", or "Enter Quiz Mode":
1. Ask which subject/topic and difficulty level.
2. Generate one question at a time.
3. Wait for the student's answer.
4. Evaluate and explain fully.
5. Track score and give a performance summary at the end.

## COMMUNICATION STYLE
- Warm, encouraging, and supportive.
- Patient and never condescending.
- Use Kenyan and African examples and context where relevant.
- Respond in the same language the student uses (English or Swahili).

## FORMATTING RULES
- Use **bold** for key terms.
- Use ## and ### headings for sections in long responses.
- Use numbered lists for steps.
- Use fenced code blocks with language tags for ALL code.
- Use tables for comparisons.
- Use emojis sparingly: 📚 🎓 ✅ 💡 🔬 📝

## MATH FORMATTING RULES
- ALWAYS format mathematical expressions using LaTeX notation with DOLLAR SIGN delimiters.
- Inline math: wrap in single dollar signs $ — example: $x^2 + y^2 = r^2$
- Display math (centered, own line): wrap in double dollar signs $$ — example: $$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$
- Use display math $$ for: final answers, multi-step equations, integrals, summations, limits, matrices, any equation longer than a simple inline expression.
- Use inline math $ for: variables mentioned in text, short expressions within sentences.
- Use \\boxed{} around final numerical answers: $$\\boxed{\\frac{32}{3}}$$
- Use \\, for thin spaces in integrals: dx becomes \\,dx
- Use proper LaTeX commands: \\frac{}{}, \\sqrt{}, \\sum_{i=1}^{n}, \\int_{a}^{b}
- NEVER write math as plain text like "x^2" — ALWAYS use LaTeX notation with $ delimiters.
- NEVER use \\( \\) or \\[ \\] delimiters — ONLY use $ and $$.

## CRITICAL RESPONSE RULES
- ALWAYS provide comprehensive, detailed answers.
- At the end of longer responses, suggest follow-up topics.
- NEVER say "I cannot assist with that topic"
- You are a FULL-CAPABILITY assistant, not a restricted bot`;

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

    const { messages, chatId, unitId } = await req.json();
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
    const rateLimitPerMinute = Number(settings.rate_limit_per_minute) || 20;
    const maxRagChunks = Number(settings.max_rag_chunks) || 8;

    // --- Rate Limiting ---
    const rateLimitKey = `ratelimit:${userId}:${Math.floor(Date.now() / 60000)}`;
    const requests = await redis.get(rateLimitKey) || 0;
    if (requests >= rateLimitPerMinute) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    await redis.set(rateLimitKey, requests + 1, 90);

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

    const userDailyLimit = isPaidUser ? PAID_DAILY_LIMIT : FREE_DAILY_LIMIT;
    const isAdmin = roleData?.role === "admin";

    // --- Token usage cache (60s) ---
    const tokenCacheKey = `tokens:${userId}:${today}`;
    let dailyUserUsage = await redis.get(tokenCacheKey);
    if (dailyUserUsage === null) {
      const { data: userUsage } = await supabaseAdmin.rpc("get_daily_token_usage", { _user_id: userId });
      dailyUserUsage = userUsage || 0;
      await redis.set(tokenCacheKey, dailyUserUsage, 60);
    }

    if (dailyUserUsage >= userDailyLimit) {
      const errorMsg = isPaidUser
        ? "You've used all your tokens for today. Come back tomorrow! 🎓"
        : "You've reached your free daily limit! 🎓 Pay KES 200 to unlock 200,000 tokens/day.";
      return new Response(JSON.stringify({ error: errorMsg, limit_reached: true, is_paid: isPaidUser }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check global daily limit
    const { data: globalData } = await supabaseAdmin.from("token_usage").select("tokens_used").gte("created_at", today);
    const globalUsage = globalData?.reduce((sum: number, t: any) => sum + t.tokens_used, 0) || 0;
    if (globalUsage >= DAILY_GLOBAL_LIMIT) {
      return new Response(JSON.stringify({ error: "System is at capacity today. Come back tomorrow! 🎓" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (OPENAI_API_KEY && shouldRunRag) {
      try {
        const queryHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(lastUserMessage))
          .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16));
        const ragCacheKey = `rag:${userId}:${queryHash}`;
        let ragResults = await redis.get(ragCacheKey);

        if (!ragResults) {
          const embResponse = await withTimeout("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({ model: "text-embedding-3-large", input: lastUserMessage, dimensions: 768 }),
          }, 8000);

          if (embResponse.ok) {
            const embData = await embResponse.json();
            const queryEmbedding = embData.data?.[0]?.embedding;

            if (queryEmbedding) {
              const { data: docs } = await supabaseAdmin.rpc("match_documents", {
                query_embedding: JSON.stringify(queryEmbedding),
                match_threshold: 0.5,
                match_count: isAdmin ? maxRagChunks + 2 : maxRagChunks,
              });
              ragResults = docs || [];
              await redis.set(ragCacheKey, ragResults, 300);
            }
          }
        }

        if (ragResults && ragResults.length > 0) {
          let filteredDocs = ragResults;

          if (unitId && unitCode) {
            filteredDocs = ragResults.filter((d: any) => {
              const docUnitCode = d.metadata?.unit_code;
              return !docUnitCode || docUnitCode === unitCode;
            });
          } else if (!isAdmin) {
            const enrolledCodes = new Set(studentUnits?.map((su: any) => su.units?.code).filter(Boolean) || []);
            if (enrolledCodes.size > 0) {
              filteredDocs = ragResults.filter((d: any) => {
                const docUnitCode = d.metadata?.unit_code;
                return !docUnitCode || enrolledCodes.has(docUnitCode);
              });
            }
          }

          if (filteredDocs.length > 0) {
            ragContext = "\n\n## Relevant Course Materials (from uploaded documents):\n" + filteredDocs.map((d: any) => {
              const meta = d.metadata || {};
              return `[Source: ${meta.title || 'Document'} | Unit: ${meta.unit_code || 'N/A'} | Similarity: ${((d.similarity || 0) * 100).toFixed(1)}%]\n${d.content}`;
            }).join("\n---\n");
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
    const generalChatNote = isGeneralChat ? `\n\nThis is a GENERAL chat. The student can ask about ANYTHING — academic topics, general knowledge, world events, coding, life advice, etc. You are NOT restricted to CUEA content only.` : "";

    // --- Build the final system prompt ---
    const systemPrompt = `${SEKANI_SYSTEM_PROMPT}

## SMART FOLLOW-UP BEHAVIOR
At the end of your responses (especially for longer ones), naturally suggest 1-2 follow-up directions the student might want. Frame them as questions or actions. Examples:
- "Want me to break this down simpler?"
- "Should I quiz you on this topic?"
- "Want exam-style questions on this?"
This makes you feel like a real tutor, not just a Q&A bot.

${CUEA_KNOWLEDGE}
${studentContext}
${enrolledUnitsContext}
${unitContext}
${calendarContext}
${memoryContext}
${adminExtra}
${generalChatNote}

${ragContext ? `Course Material Context:\n${ragContext}` : "No specific course material available for this query."}

Answer the student's question helpfully, comprehensively, and naturally.`;

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
    
    // Model selection: vision > math > default
    let model: string;
    if (hasImageContent) {
      model = "gpt-4o";
    } else if (hasMathContent) {
      model = "gpt-4o";
    } else {
      const defaultModel = typeof settings.default_model_general === 'string' 
        ? settings.default_model_general.replace(/"/g, '') 
        : "gpt-4o-mini";
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
        temperature: 0.7,
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
