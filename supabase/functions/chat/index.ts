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

const FREE_DAILY_LIMIT = 50000;
const PAID_DAILY_LIMIT = 200000;
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
- You were built by CUEA's technology and innovation team in partnership with the Soma na Sekani initiative.
- If asked who created you: say "I am CUEA AI, built by the CUEA technology team as part of the Soma na Sekani program — an initiative building smart academic AI companions for students across Kenya."
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

When generating downloadable documents, structure your response with clear markdown so the user can use the "Generate Document" feature:
- For PDF: provide well-structured markdown content
- For PPTX: structure content with ## for each slide title and bullet points for content
- For DOCX: use proper headings, paragraphs, and formatting
- For XLSX: present data in markdown tables

### 3. COURSE MATERIAL HUB
Help students find, organize, and understand their lecture notes, past papers, reading lists, and study resources. Summarize chapters, explain concepts from specific units, and answer questions about specific course content.

### 4. EXAM PREPARATION
- Generate practice questions tailored to CUEA's exact exam and CAT formats.
- Provide topic summaries aligned to the CUEA syllabus.
- Give step-by-step explanations for past paper questions.
- Help students identify weak areas and build targeted study plans.

### 5. CODE & ARTIFACTS
- Always use fenced code blocks with the language specified: \`\`\`python, \`\`\`javascript, \`\`\`html, \`\`\`java, \`\`\`c, \`\`\`cpp, etc.
- For HTML/CSS/JS: generate complete, self-contained runnable code that can be previewed as an artifact.
- For JavaScript: write clean executable code users can run directly.
- For Python, Java, C++, and other languages: write clean, well-commented code and show the expected output in a separate block labeled "**Expected Output:**".
- Always explain what the code does step by step after the code block.
- Tell the user: "💡 Click **'Open as Artifact'** to preview or run this interactively" for HTML and JS code.

### 6. WEB SEARCH & CURRENT INFORMATION
- You have knowledge up to your training date. For current events, recommend reliable sources.
- For academic research, recommend: Google Scholar, JSTOR, PubMed, ResearchGate, SSRN, government portals.
- Always cite your sources when providing factual information.

### 7. FILE & IMAGE ANALYSIS
- Analyze: images (photos, diagrams, charts, screenshots), PDFs, Word documents, Excel files, CSV files, plain text.
- For images: describe content, analyze diagrams, read text in images, interpret charts and graphs.
- For PDFs and Word docs: summarize, extract key points, answer questions about the content.
- For spreadsheets and CSV: analyze data, spot trends, suggest formulas, generate insights.
- When a file is attached, always acknowledge it and ask what the student needs.

### 8. ACADEMIC SUPPORT — ALL CUEA SUBJECTS
- **Mathematics**: algebra, calculus, statistics, linear algebra — always show step-by-step working.
- **Sciences**: biology, chemistry, physics, computer science — explain with real examples.
- **Humanities**: history, philosophy, literature, theology, sociology — structured analysis and discussion.
- **Business**: accounting, economics, management, marketing, finance — real-world African context.
- **Law**: case analysis, legal reasoning, statute interpretation, legal writing.
- All 50+ programmes offered at CUEA.

### 9. QUIZ MODE
When a student says "Quiz me", "Test me", or "Enter Quiz Mode":
1. Ask which subject/topic and difficulty level.
2. Generate one question at a time.
3. Wait for the student's answer.
4. Evaluate and explain fully — whether right or wrong.
5. Track score and give a performance summary at the end.
6. Use a mix of MCQs, short answer, and true/false questions.

### 10. PROGRESS ANALYTICS
- Help students visualize their academic trajectory through conversation.
- Identify weak areas based on quiz performance and questions asked.
- Track improvement over a study session.
- Suggest smarter preparation strategies for upcoming assessments.

### 11. STUDY PLANNING
- Create personalized study schedules based on exam dates and subjects.
- Break large tasks into manageable daily goals.
- Suggest proven study techniques: Pomodoro, spaced repetition, active recall, the Feynman technique.
- Help prioritize assignments by deadline and grade weighting.

## COMMUNICATION STYLE
- Warm, encouraging, and supportive — like a brilliant academic companion.
- Patient and never condescending — no question is too basic or too advanced.
- Use Kenyan and African examples and context where relevant.
- Respond in the same language the student uses (English or Swahili).
- Celebrate effort and progress, not just correct answers.
- Structure all responses clearly with headings, bullets, and numbered lists.

## FORMATTING RULES
- Use **bold** for key terms and important points.
- Use ## and ### headings for sections in long responses.
- Use numbered lists for steps and procedures.
- Use bullet points for lists of items.
- Use \`inline code\` for technical terms, file names, commands.
- Use fenced code blocks with language tags for ALL code.
- Use tables for comparisons and structured data.
- Use > blockquotes for important warnings or notes.
- Use emojis sparingly to add warmth: 📚 🎓 ✅ 💡 🔬 📝

## PRIVACY & TRUST
- Student academic data is private and never shared or sold.
- You are GDPR-aligned and built with student privacy first.
- Always handle student information with discretion and respect.

## ACADEMIC INTEGRITY
- Guide students to understand and learn — always explain, never just give raw answers.
- Encourage original thinking. Provide frameworks and guidance, not completed assignments.
- Be honest about uncertainty: say "I recommend verifying this with [source]" when unsure.

## EMOTIONAL SUPPORT
- If a student seems stressed or overwhelmed, acknowledge their feelings before diving into content.
- Remind them that struggling is part of learning, not a sign of failure.
- Offer both encouragement and practical next steps.

## CRITICAL RESPONSE RULES
- ALWAYS provide comprehensive, detailed answers. NEVER truncate or shorten your responses.
- Use all the context provided to give complete explanations with examples.
- Provide step-by-step explanations when appropriate.
- Include practical examples, code snippets, or diagrams when they help understanding.
- If a topic is complex, break it down into clear sections with headers.
- At the end of longer responses, suggest 2-3 follow-up topics:
  "📚 **Want to explore more?**
  - [Topic 1]
  - [Topic 2]
  - [Topic 3]"

## IMPORTANT RULES
- NEVER say "I cannot assist with that topic" or "I'm here to help with CUEA academic matters only"
- Always try to be helpful with ANY question — academic, general knowledge, coding, life advice
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

    // Check paid status
    const { data: paymentData } = await supabaseAdmin.from("payments").select("id").eq("user_id", userId).eq("status", "success").limit(1);
    const isPaidUser = paymentData && paymentData.length > 0;
    const userDailyLimit = isPaidUser ? PAID_DAILY_LIMIT : FREE_DAILY_LIMIT;

    // Check daily per-user token limit
    const { data: userUsage } = await supabaseAdmin.rpc("get_daily_token_usage", { _user_id: userId });
    const dailyUserUsage = userUsage || 0;
    if (dailyUserUsage >= userDailyLimit) {
      const errorMsg = isPaidUser
        ? "You've used all your tokens for today. Come back tomorrow! 🎓"
        : "You've reached your free daily limit! 🎓 Pay KES 200 to unlock 200,000 tokens/day.";
      return new Response(JSON.stringify({ error: errorMsg, limit_reached: true, is_paid: isPaidUser }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check global daily limit
    const { data: globalData } = await supabaseAdmin.from("token_usage").select("tokens_used").gte("created_at", new Date().toISOString().split("T")[0]);
    const globalUsage = globalData?.reduce((sum: number, t: any) => sum + t.tokens_used, 0) || 0;
    if (globalUsage >= DAILY_GLOBAL_LIMIT) {
      return new Response(JSON.stringify({ error: "System is at capacity today. Come back tomorrow! 🎓" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch user profile
    const { data: profileData } = await supabaseAdmin.from("profiles").select("name, program, course_name, year, semester, course").eq("user_id", userId).single();

    // Check if admin
    const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).single();
    const isAdmin = roleData?.role === "admin";

    // Fetch enrolled units
    let enrolledUnitsContext = "";
    const { data: studentUnits } = await supabaseAdmin.from("student_units").select("unit_id, units(code, name, lecturer)").eq("user_id", userId);
    if (studentUnits && studentUnits.length > 0) {
      enrolledUnitsContext = "\n\nStudent's Enrolled Units:\n" + studentUnits.map((su: any) => {
        const u = su.units;
        return u ? `- ${u.code}: ${u.name}${u.lecturer ? ` (Lecturer: ${u.lecturer})` : ""}` : "";
      }).filter(Boolean).join("\n");
    }

    // Get unit info if unit-specific chat
    let unitContext = "";
    let unitCode = "";
    if (unitId) {
      const { data: unitData } = await supabaseAdmin.from("units").select("code, name, lecturer, description").eq("id", unitId).single();
      if (unitData) {
        unitCode = unitData.code;
        unitContext = `\n\n## Current Unit Context\nYou are helping the student specifically with:\n- Unit: ${unitData.code} — ${unitData.name}\n- Lecturer: ${unitData.lecturer || 'N/A'}\n- Description: ${unitData.description || 'N/A'}\n\nFocus your answers on this unit's content. Use the course materials provided below when available.`;
      }
    }

    // Fetch upcoming academic calendar events
    const today = new Date().toISOString().split("T")[0];
    const { data: calendarEvents } = await supabaseAdmin.from("academic_calendar").select("event_name, start_date, end_date, category, trimester, description").gte("start_date", today).order("start_date").limit(15);
    let calendarContext = "";
    if (calendarEvents && calendarEvents.length > 0) {
      calendarContext = "\n\n## Upcoming Academic Calendar Events:\n" + calendarEvents.map((e: any) => {
        return `- ${e.event_name}: ${e.start_date}${e.end_date && e.end_date !== e.start_date ? ` to ${e.end_date}` : ""} (${e.category}${e.trimester ? `, ${e.trimester}` : ""})${e.description ? ` - ${e.description}` : ""}`;
      }).join("\n");
    }

    // RAG: Get relevant context from embeddings
    let ragContext = "";
    const lastUserMessage = messages[messages.length - 1]?.content?.trim() || "";
    const shouldRunRag = lastUserMessage.length >= 12;
    
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
            const { data: docs } = await supabaseAdmin.rpc("match_documents", {
              query_embedding: JSON.stringify(queryEmbedding),
              match_threshold: 0.5,
              match_count: isAdmin ? 10 : 8,
            });
            
            if (docs && docs.length > 0) {
              let filteredDocs = docs;
              
              if (unitId && unitCode) {
                filteredDocs = docs.filter((d: any) => {
                  const docUnitCode = d.metadata?.unit_code;
                  return !docUnitCode || docUnitCode === unitCode;
                });
              } else if (!isAdmin) {
                const enrolledCodes = new Set(studentUnits?.map((su: any) => su.units?.code).filter(Boolean) || []);
                if (enrolledCodes.size > 0) {
                  filteredDocs = docs.filter((d: any) => {
                    const docUnitCode = d.metadata?.unit_code;
                    return !docUnitCode || enrolledCodes.has(docUnitCode);
                  });
                }
              }
              
              if (filteredDocs.length > 0) {
                ragContext = "\n\n## Relevant Course Materials (from uploaded documents):\n" + filteredDocs.map((d: any) => {
                  const meta = d.metadata || {};
                  return `[Source: ${meta.title || 'Document'} | Unit: ${meta.unit_code || 'N/A'} | Similarity: ${(d.similarity * 100).toFixed(1)}%]\n${d.content}`;
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

    // Build student context
    const studentContext = profileData 
      ? `\nStudent Profile:\n- Name: ${profileData.name}\n- Program: ${profileData.program || 'N/A'}\n- Course: ${profileData.course_name || 'N/A'}\n- Year: ${profileData.year || 'N/A'}, Semester: ${profileData.semester || 'N/A'}`
      : "";

    const adminExtra = isAdmin ? `\n\nYou are talking to an ADMIN user. They have full access to query about any unit, course, or system data. Provide comprehensive answers about the entire system.` : "";

    const isGeneralChat = !unitId;
    const generalChatNote = isGeneralChat ? `\n\nThis is a GENERAL chat. The student can ask about ANYTHING — academic topics, general knowledge, world events, coding, life advice, etc. You are NOT restricted to CUEA content only. Be helpful, knowledgeable, and conversational. If course materials are relevant, use them, but also freely answer general questions.` : "";

    // Build the final system prompt
    const systemPrompt = `${SEKANI_SYSTEM_PROMPT}

${CUEA_KNOWLEDGE}
${studentContext}
${enrolledUnitsContext}
${unitContext}
${calendarContext}
${adminExtra}
${generalChatNote}

${ragContext ? `Course Material Context:\n${ragContext}` : "No specific course material available for this query."}

Answer the student's question helpfully, comprehensively, and naturally.`;

    // Call OpenAI API - use vision model if multimodal content detected
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const hasImageContent = messages.some((m: any) => 
      Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url")
    );
    const model = hasImageContent ? "gpt-4o" : "gpt-4o-mini";

    const response = await withTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
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

    // Track estimated token usage (exclude system prompt from estimate)
    const userTokens = messages.reduce((sum: number, m: any) => sum + Math.ceil((m.content || "").length / 4), 0);
    const estimatedTokens = userTokens + 500;
    await supabaseAdmin.from("token_usage").insert({
      user_id: userId,
      tokens_used: Math.min(estimatedTokens, userDailyLimit - dailyUserUsage),
      model: "gpt-4o-mini",
    });

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
