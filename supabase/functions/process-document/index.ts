import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import mammoth from "https://esm.sh/mammoth@1.8.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

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

function stripXmlTags(xml: string): string {
  return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function extractTextFromPptx(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const texts: string[] = [];

  const slideFiles = Object.keys(zip.files)
    .filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort();

  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async("string");
    const text = stripXmlTags(content);
    if (text) texts.push(text);
  }
  return texts.join("\n\n");
}

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

async function extractTextFromDoc(buffer: ArrayBuffer): Promise<string> {
  // Basic DOC text extraction: read printable ASCII from binary
  const bytes = new Uint8Array(buffer);
  let text = "";
  let current = "";
  for (const byte of bytes) {
    if (byte >= 32 && byte < 127) {
      current += String.fromCharCode(byte);
    } else if (byte === 10 || byte === 13) {
      if (current.trim().length > 3) {
        text += current.trim() + "\n";
      }
      current = "";
    } else {
      if (current.trim().length > 3) {
        text += current.trim() + " ";
      }
      current = "";
    }
  }
  if (current.trim().length > 3) text += current.trim();
  return text;
}

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  // Extract text streams from PDF binary
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder("latin1").decode(bytes);
  const texts: string[] = [];

  // Extract text between BT and ET markers (text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const t = tjMatch[1].replace(/\\([nrt\\()])/g, (_, c) => {
        if (c === 'n') return '\n';
        if (c === 'r') return '\r';
        if (c === 't') return '\t';
        return c;
      });
      if (t.trim()) texts.push(t.trim());
    }

    // TJ array operator
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = tjArrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch;
      let line = "";
      while ((strMatch = strRegex.exec(inner)) !== null) {
        line += strMatch[1];
      }
      if (line.trim()) texts.push(line.trim());
    }
  }

  // Fallback: try to extract readable text if no BT/ET found
  if (texts.length === 0) {
    const printable = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ");
    const words = printable.split(" ").filter(w => w.length > 2);
    if (words.length > 20) {
      return words.join(" ").slice(0, 50000);
    }
  }

  return texts.join(" ").slice(0, 100000);
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

    const { materialId, title, unitCode, storagePath, fileType, content: directContent } = await req.json();
    if (!materialId) {
      return new Response(JSON.stringify({ error: "materialId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: materialRecord, error: materialLookupError } = await supabaseAdmin
      .from("materials")
      .select("id, uploaded_by, unit_id")
      .eq("id", materialId)
      .single();

    if (materialLookupError || !materialRecord) {
      return new Response(JSON.stringify({ error: "Material not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownsMaterial = materialRecord.uploaded_by === user.id;
    if (!isAdmin && !ownsMaterial) {
      return new Response(JSON.stringify({ error: "You can only process your own uploaded notes" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let content = directContent || "";

    // If storagePath provided, download file and extract text
    if (storagePath && !content) {
      console.log(`Downloading file from storage: ${storagePath}, type: ${fileType}`);
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from("materials")
        .download(storagePath);

      if (downloadError || !fileData) {
        console.error("Download error:", downloadError);
        return new Response(JSON.stringify({ error: `Failed to download file: ${downloadError?.message}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const buffer = await fileData.arrayBuffer();
      const ext = (storagePath.split(".").pop() || "").toLowerCase();
      const mimeType = (fileType || "").toLowerCase();

      console.log(`Extracting text from file, ext: ${ext}, mime: ${mimeType}, size: ${buffer.byteLength}`);

      try {
        if (ext === "txt" || ext === "md" || ext === "csv" || mimeType.includes("text/")) {
          content = new TextDecoder().decode(buffer);
        } else if (ext === "docx" || mimeType.includes("wordprocessingml")) {
          content = await extractTextFromDocx(buffer);
        } else if (ext === "doc" && !mimeType.includes("wordprocessingml")) {
          content = await extractTextFromDoc(buffer);
        } else if (ext === "pptx" || mimeType.includes("presentationml")) {
          content = await extractTextFromPptx(buffer);
        } else if (ext === "pdf" || mimeType.includes("pdf")) {
          content = await extractTextFromPdf(buffer);
        } else {
          // Fallback: try to read as text
          content = new TextDecoder().decode(buffer);
        }
      } catch (extractErr) {
        console.error("Text extraction error:", extractErr);
        return new Response(JSON.stringify({ error: `Text extraction failed for ${ext}: ${extractErr}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Extracted ${content.length} characters of text`);
    }

    if (!content || content.trim().length < 20) {
      return new Response(JSON.stringify({ error: "No extractable text content found in document" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const chunks = chunkText(content);
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
        console.error("OpenAI embedding error:", errText);
        throw new Error(`Embedding API error: ${embResponse.status}`);
      }

      const embData = await embResponse.json();

      const rows = embData.data.map((item: any, idx: number) => ({
        material_id: materialId,
        content: batch[idx],
        embedding: JSON.stringify(item.embedding),
        metadata: {
          title: title || "Document",
          unit_code: unitCode || "N/A",
          unit_id: materialRecord.unit_id,
          uploaded_by: materialRecord.uploaded_by,
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

    await supabaseAdmin
      .from("materials")
      .update({
        embedding_status: "completed",
        chunk_count: processedCount,
      })
      .eq("id", materialId);

    return new Response(JSON.stringify({ success: true, chunksProcessed: processedCount, textLength: content.length }), {
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
