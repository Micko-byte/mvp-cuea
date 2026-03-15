import { useArtifacts } from "@/contexts/ArtifactContext";
import { X, Eye, Code2, Copy, Check, Play, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const ArtifactViewer = () => {
  const { activeArtifact, viewerOpen, viewMode, setViewerOpen, setViewMode } = useArtifacts();
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execOutput, setExecOutput] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleCopy = () => {
    if (!activeArtifact) return;
    navigator.clipboard.writeText(activeArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canPreview = activeArtifact && ["html", "svg", "markdown"].includes(activeArtifact.type);
  const canExecute = activeArtifact?.type === "code";

  const isWebRunnable = activeArtifact && (
    activeArtifact.language === "html" ||
    activeArtifact.language === "htm" ||
    activeArtifact.language === "javascript" ||
    activeArtifact.language === "js" ||
    activeArtifact.language === "css"
  );

  const wrapJSCode = (code: string) => `<!DOCTYPE html><html><head><style>
body{font-family:'Courier New',monospace;padding:1rem;background:#1e1e2e;color:#cdd6f4;white-space:pre-wrap;font-size:14px;line-height:1.5;margin:0;}
.error{color:#f38ba8;} .log{color:#a6e3a1;} .warn{color:#f9e2af;}
</style></head><body><script>
const _out=[];const _el=document.body;
const _fmt=(...a)=>a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ');
console.log=(...a)=>{_out.push('<span class="log">'+_fmt(...a)+'</span>');_el.innerHTML=_out.join('\\n');};
console.error=(...a)=>{_out.push('<span class="error">Error: '+_fmt(...a)+'</span>');_el.innerHTML=_out.join('\\n');};
console.warn=(...a)=>{_out.push('<span class="warn">Warning: '+_fmt(...a)+'</span>');_el.innerHTML=_out.join('\\n');};
try{${code}}catch(e){_out.push('<span class="error">'+e.name+': '+e.message+'</span>');_el.innerHTML=_out.join('\\n');}
</script></body></html>`;

  const wrapCSSCode = (code: string) => `<!DOCTYPE html><html><head><style>${code}</style></head><body>
<div class="preview-container"><h1>CSS Preview</h1><p>This is a paragraph to demonstrate styles.</p>
<button>Button</button><a href="#">Link</a><ul><li>Item 1</li><li>Item 2</li></ul></div></body></html>`;

  const writeToIframe = useCallback((content: string) => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(content);
    doc.close();
  }, []);

  const handleExecute = async () => {
    if (!activeArtifact) return;

    if (isWebRunnable) {
      setViewMode("preview");
      setExecOutput(null);
      // Small delay to ensure iframe is mounted
      requestAnimationFrame(() => {
        let content = activeArtifact.content;
        if (activeArtifact.language === "javascript" || activeArtifact.language === "js") {
          content = wrapJSCode(content);
        } else if (activeArtifact.language === "css") {
          content = wrapCSSCode(content);
        }
        writeToIframe(content);
      });
      return;
    }

    // For non-web languages, use AI to simulate execution
    setExecuting(true);
    setExecOutput(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setExecOutput("Error: Not authenticated");
        return;
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Execute this ${activeArtifact.language} code and show ONLY the output. No explanations, just the output:\n\`\`\`${activeArtifact.language}\n${activeArtifact.content}\n\`\`\``
          }],
          chatId: "artifact-exec"
        }),
      });

      if (!resp.ok || !resp.body) {
        setExecOutput("Error: Failed to execute code");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              result += content;
              setExecOutput(result);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (!result) setExecOutput("No output produced.");
    } catch (e) {
      setExecOutput(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setExecuting(false);
    }
  };

  // Auto-render previews
  useEffect(() => {
    if (viewMode === "preview" && iframeRef.current && activeArtifact) {
      if (canPreview) {
        let content = activeArtifact.content;
        if (activeArtifact.type === "svg") {
          content = `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9f9f9">${content}</body></html>`;
        } else if (activeArtifact.type === "markdown") {
          content = `<!DOCTYPE html><html><head><style>body{font-family:system-ui,-apple-system,sans-serif;padding:2rem;max-width:700px;margin:0 auto;line-height:1.7;color:#333}pre{background:#f4f4f4;padding:1rem;border-radius:8px;overflow-x:auto}code{font-size:0.9em}h1,h2,h3{margin-top:1.5em}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}</style></head><body>${content}</body></html>`;
        }
        writeToIframe(content);
      } else if (isWebRunnable) {
        let content = activeArtifact.content;
        if (activeArtifact.language === "javascript" || activeArtifact.language === "js") {
          content = wrapJSCode(content);
        } else if (activeArtifact.language === "css") {
          content = wrapCSSCode(content);
        }
        writeToIframe(content);
      }
    }
  }, [viewMode, activeArtifact, canPreview, isWebRunnable, writeToIframe]);

  // Reset exec output when artifact changes
  useEffect(() => {
    setExecOutput(null);
  }, [activeArtifact?.id]);

  if (!viewerOpen || !activeArtifact) return null;

  const showPreviewTab = canPreview || isWebRunnable;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "100%", opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full border-l border-border bg-card overflow-hidden"
      >
        {/* Toolbar */}
        <div className="h-12 flex items-center justify-between px-3 border-b border-border bg-muted/50 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {activeArtifact.language || activeArtifact.type}
            </span>
            <span className="text-sm font-medium text-foreground truncate">{activeArtifact.title}</span>
          </div>
          <div className="flex items-center gap-1">
            {showPreviewTab && (
              <div className="flex bg-muted rounded-md p-0.5">
                <button
                  onClick={() => setViewMode("preview")}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Eye className="w-3 h-3" /> Preview
                </button>
                <button
                  onClick={() => setViewMode("code")}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === "code" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Code2 className="w-3 h-3" /> Code
                </button>
              </div>
            )}
            {canExecute && !isWebRunnable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleExecute}
                disabled={executing}
              >
                {executing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Run
              </Button>
            )}
            {isWebRunnable && viewMode === "code" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleExecute}
              >
                <Play className="w-3 h-3" /> Run
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewerOpen(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex flex-col">
          {viewMode === "preview" && showPreviewTab ? (
            <iframe
              ref={iframeRef}
              title="Artifact Preview"
              className="w-full flex-1 border-0 bg-white"
              sandbox="allow-scripts allow-modals"
              style={{ minHeight: "300px" }}
            />
          ) : (
            <div className="flex flex-col flex-1">
              <pre className="p-4 text-sm font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed flex-1 bg-card">
                <code>{activeArtifact.content}</code>
              </pre>
              {execOutput !== null && (
                <div className="border-t border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Output</p>
                  <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed max-h-[300px] overflow-y-auto">
                    {execOutput}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ArtifactViewer;
