import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

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

    // Check admin role
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { materialId, content, title, unitCode } = await req.json();
    if (!content || !materialId) {
      return new Response(JSON.stringify({ error: "content and materialId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const chunks = chunkText(content);
    let processedCount = 0;

    // Process chunks in batches of 20
    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20);

      const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: batch,
          dimensions: 768,
        }),
      });

      if (!embResponse.ok) {
        const errText = await embResponse.text();
        console.error("OpenAI embedding error:", errText);
        throw new Error(`Embedding API error: ${embResponse.status}`);
      }

      const embData = await embResponse.json();

      const rows = embData.data.map((item: any, idx: number) => ({
        material_id: materialId,
        content: batch[idx],
        embedding: JSON.stringify(item.embedding),
        metadata: { title: title || "Document", unit_code: unitCode || "N/A", chunk_index: i + idx },
      }));

      const { error: insertError } = await supabaseAdmin
        .from("document_embeddings")
        .insert(rows);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`DB insert error: ${insertError.message}`);
      }

      processedCount += batch.length;
    }

    return new Response(JSON.stringify({ success: true, chunksProcessed: processedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
