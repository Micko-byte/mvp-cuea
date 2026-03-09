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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = user.id;

    const { messages, chatId } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if user has a successful payment (paid plan)
    const { data: paymentData } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "success")
      .limit(1);
    
    const isPaidUser = paymentData && paymentData.length > 0;
    const userDailyLimit = isPaidUser ? PAID_DAILY_LIMIT : FREE_DAILY_LIMIT;

    // Check daily per-user token limit
    const { data: userUsage } = await supabaseAdmin.rpc("get_daily_token_usage", { _user_id: userId });
    const dailyUserUsage = userUsage || 0;
    if (dailyUserUsage >= userDailyLimit) {
      const errorMsg = isPaidUser
        ? "You've used all your tokens for today. Come back tomorrow to continue using CUEA AI! 🎓"
        : "You've reached your free daily limit! 🎓 Pay KES 200 to unlock 200,000 tokens/day and support CUEA AI infrastructure.";
      return new Response(JSON.stringify({ 
        error: errorMsg,
        limit_reached: true,
        is_paid: isPaidUser,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check global daily limit
    const { data: globalData } = await supabaseAdmin
      .from("token_usage")
      .select("tokens_used")
      .gte("created_at", new Date().toISOString().split("T")[0]);
    const globalUsage = globalData?.reduce((sum: number, t: any) => sum + t.tokens_used, 0) || 0;
    if (globalUsage >= DAILY_GLOBAL_LIMIT) {
      return new Response(JSON.stringify({ error: "System is at capacity today. Come back tomorrow to enjoy CUEA AI! 🎓" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch user profile for context
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("name, program, course_name, year, semester")
      .eq("user_id", userId)
      .single();

    // RAG: Get relevant context from embeddings
    let ragContext = "";
    const lastUserMessage = messages[messages.length - 1]?.content?.trim() || "";
    const shouldRunRag = lastUserMessage.length >= 12;
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (OPENAI_API_KEY && shouldRunRag) {
      try {
        const embResponse = await withTimeout(
          "https://api.openai.com/v1/embeddings",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "text-embedding-3-small",
              input: lastUserMessage,
              dimensions: 768,
            }),
          },
          8000
        );
        
        if (embResponse.ok) {
          const embData = await embResponse.json();
          const queryEmbedding = embData.data?.[0]?.embedding;
          
          if (queryEmbedding) {
            const { data: docs } = await supabaseAdmin.rpc("match_documents", {
              query_embedding: JSON.stringify(queryEmbedding),
              match_threshold: 0.5,
              match_count: 5,
            });
            
            if (docs && docs.length > 0) {
              ragContext = "\n\n## Relevant Course Materials (from uploaded documents):\n" + docs.map((d: any) => {
                const meta = d.metadata || {};
                return `[Source: ${meta.title || 'Document'} | Unit: ${meta.unit_code || 'N/A'}]\n${d.content}`;
              }).join("\n---\n");
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

    // Build the NotifyAI system prompt
    const systemPrompt = `You are NotifyAI, an AI academic assistant for university students at the Catholic University of Eastern Africa (CUEA).

Your job is to help students understand:
- their courses, assignments, and lecture material
- university systems (ODeL portal, student portal, e-learning)
- academic concepts and questions
- study tips, exam preparation, and academic writing

You should behave like a helpful, knowledgeable university tutor.

## How You Answer:
- Answer conversationally and naturally. Be friendly, encouraging, and supportive.
- If the student asks something not directly about CUEA, still try to help if it's educational or general knowledge. Be helpful, not restrictive.
- If course material is provided below, prioritize that information.
- If the answer is not in the provided material, explain the concept clearly and say: "This isn't in your course documents, but here's what I know about it."
- Never invent references or lecture content.
- Explain things step-by-step when possible.
- Format responses using markdown for readability.
- Personalize responses using the student's profile when available.
- Detect the user's language and reply in the same language. Support English, Swahili, French, and any other language.

## Tone:
- Friendly, warm, and encouraging
- Like a smart teaching assistant who genuinely cares
- Never dismissive or robotic

## Important Rules:
- NEVER say "I cannot assist with that topic" or "I'm here to help with CUEA academic matters only"
- Instead, always try to be helpful. If something is truly outside your knowledge, say something like: "That's an interesting question! While it's not directly related to your coursework, here's what I can share..."
- Always try to continue the conversation naturally
- At the end of responses, suggest 2-3 follow-up topics:
  "📚 **Want to explore more?**
  - [Topic 1]
  - [Topic 2]
  - [Topic 3]"

${CUEA_KNOWLEDGE}
${studentContext}

${ragContext ? `Course Material Context:\n${ragContext}` : "No specific course material available for this query."}

Answer the student's question helpfully and naturally.`;

    // Call OpenAI API
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const response = await withTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        stream: true,
      }),
    }, 45000);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("OpenAI API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Track estimated token usage
    const estimatedTokens = messages.reduce((sum: number, m: any) => sum + Math.ceil((m.content || "").length / 4), 0) + 200;
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
      : e instanceof Error
        ? e.message
        : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
