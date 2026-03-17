import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/\\u0000/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\uFFFD/g, '');
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const clean = sanitizeText(text);
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content, title, unitId, fileName } = await req.json();

    if (!content || content.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Content too short to embed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit content size
    const trimmedContent = content.slice(0, 50000);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const chunks = chunkText(trimmedContent);
    let processedCount = 0;

    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20);

      const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-large",
          input: batch,
          dimensions: 768,
        }),
      });

      if (!embResponse.ok) {
        const errText = await embResponse.text();
        console.error("Embedding error:", errText);
        throw new Error(`Embedding API error: ${embResponse.status}`);
      }

      const embData = await embResponse.json();

      const rows = embData.data.map((item: any, idx: number) => ({
        content: batch[idx],
        embedding: JSON.stringify(item.embedding),
        metadata: {
          title: title || fileName || "Chat Upload",
          unit_id: unitId || null,
          uploaded_by: user.id,
          source: "chat_attachment",
          file_name: fileName || "unknown",
          chunk_index: i + idx,
        },
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

    console.log(`Embedded ${processedCount} chunks from chat attachment: ${fileName}`);

    return new Response(JSON.stringify({ success: true, chunksProcessed: processedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
