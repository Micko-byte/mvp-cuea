import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_USER_LIMIT = 5000; // tokens per user per day

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const { messages, chatId } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check daily token limit
    const { data: usageData } = await supabase.rpc("get_daily_token_usage", { _user_id: userId });
    const dailyUsage = usageData || 0;
    if (dailyUsage >= DAILY_USER_LIMIT) {
      return new Response(JSON.stringify({ error: "Daily token limit reached. Please try again tomorrow." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // RAG: Get relevant context from embeddings if available
    let ragContext = "";
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (GEMINI_API_KEY && lastUserMessage) {
      try {
        // Get embedding for the query using Gemini
        const embResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "models/gemini-embedding-001",
              content: { parts: [{ text: lastUserMessage }] },
            }),
          }
        );
        
        if (embResponse.ok) {
          const embData = await embResponse.json();
          const queryEmbedding = embData.embedding?.values;
          
          if (queryEmbedding) {
            const { data: docs } = await supabase.rpc("match_documents", {
              query_embedding: JSON.stringify(queryEmbedding),
              match_threshold: 0.5,
              match_count: 3,
            });
            
            if (docs && docs.length > 0) {
              ragContext = "\n\nRelevant course materials:\n" + docs.map((d: any) => d.content).join("\n---\n");
            }
          }
        }
      } catch (e) {
        console.error("RAG embedding error:", e);
        // Continue without RAG context
      }
    }

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are CUEA AI, a helpful university assistant for the Catholic University of Eastern Africa (CUEA). 
You help students with:
- Course information, assignments, and schedules
- Lecture notes and study materials
- Exam preparation and academic guidance
- University policies and procedures

Be concise, accurate, and supportive. Format responses using markdown when helpful.
${ragContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try later." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Track estimated token usage (rough estimate: 4 chars per token)
    const estimatedTokens = messages.reduce((sum: number, m: any) => sum + Math.ceil((m.content || "").length / 4), 0);
    await supabase.from("token_usage").insert({
      user_id: userId,
      tokens_used: estimatedTokens,
      model: "gemini-3-flash-preview",
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
