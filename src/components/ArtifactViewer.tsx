import { useArtifacts } from "@/contexts/ArtifactContext";
import { X, Eye, Code2, Copy, Check, Play, Loader2, Download, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const wrapHtml = (content: string) => {
  if (content.trimStart().startsWith('<!DOCTYPE') || content.trimStart().startsWith('<html')) {
    return content;
  }
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; margin: 0; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
};

const wrapJs = (code: string) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { font-family: monospace; padding: 12px; margin: 0; background: #1a1a1a; color: #e5e5e5; }
  .output { margin: 4px 0; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
  .log { color: #a8ff78; }
  .error { color: #ff6b6b; background: rgba(255,107,107,0.1); }
  .warn { color: #ffd93d; }
  .info { color: #74b9ff; }
</style>
</head>
<body>
<div id="output"></div>
<script>
const output = document.getElementById('output');
const addLine = (text, type) => {
  const div = document.createElement('div');
  div.className = 'output ' + type;
  div.textContent = text;
  output.appendChild(div);
};
const fmt = (...args) => args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
console.log = (...a) => { addLine(fmt(...a), 'log'); };
console.error = (...a) => { addLine(fmt(...a), 'error'); };
console.warn = (...a) => { addLine(fmt(...a), 'warn'); };
console.info = (...a) => { addLine(fmt(...a), 'info'); };
window.onerror = (msg, src, line, col, err) => { addLine('Error: ' + msg + ' (line ' + line + ')', 'error'); return true; };
try {
${code}
} catch(e) { addLine('Error: ' + e.message, 'error'); }
</script>
</body>
</html>`;

const wrapReact = (code: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
<style>
  body { font-family: system-ui, sans-serif; padding: 16px; margin: 0; }
  * { box-sizing: border-box; }
  .error-msg { color: #ff6b6b; background: rgba(255,107,107,0.1); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; }
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
try {
${code}

// Auto-render: find the last component/function defined
const _exports = typeof App !== 'undefined' ? App : typeof Component !== 'undefined' ? Component : null;
if (_exports) {
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(_exports));
}
} catch(e) {
  document.getElementById('root').innerHTML = '<div class="error-msg">Error: ' + e.message + '</div>';
}
<\/script>
</body>
</html>`;

const wrapCss = (code: string) => `<!DOCTYPE html><html><head><style>${code}</style></head><body>
<div class="preview-container"><h1>CSS Preview</h1><p>This is a paragraph to demonstrate styles.</p>
<button>Button</button><a href="#">Link</a><ul><li>Item 1</li><li>Item 2</li></ul></div></body></html>`;

const sanitizeSvg = (svg: string) => svg.replace(/<script[\s\S]*?<\/script>/gi, '');

const ArtifactViewer = () => {
  const { activeArtifact, viewerOpen, viewMode, setViewerOpen, setViewMode } = useArtifacts();
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execOutput, setExecOutput] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const handleCopy = () => {
    if (!activeArtifact) return;
    navigator.clipboard.writeText(activeArtifact.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeArtifact) return;
    const ext = activeArtifact.language === 'javascript' || activeArtifact.language === 'js' ? 'js'
      : activeArtifact.language === 'python' || activeArtifact.language === 'py' ? 'py'
      : activeArtifact.language === 'html' || activeArtifact.language === 'htm' ? 'html'
      : activeArtifact.language === 'svg' ? 'svg'
      : activeArtifact.language === 'css' ? 'css'
      : activeArtifact.language === 'markdown' || activeArtifact.language === 'md' ? 'md'
      : activeArtifact.language || 'txt';
    const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeArtifact.title || 'artifact'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lang = activeArtifact?.language?.toLowerCase() || '';
  const type = activeArtifact?.type || 'code';

  const isHtml = type === 'html' || ['html', 'htm'].includes(lang);
  const isJs = ['javascript', 'js'].includes(lang);
  const isJsx = ['jsx', 'tsx', 'react'].includes(lang);
  const isCss = lang === 'css';
  const isSvg = type === 'svg' || lang === 'svg';
  const isMarkdown = type === 'markdown' || ['markdown', 'md'].includes(lang);
  const isPython = ['python', 'py'].includes(lang);
  const canPreview = isHtml || isJs || isJsx || isCss || isSvg || isMarkdown;

  const getPreviewContent = useCallback((): string | null => {
    if (!activeArtifact) return null;
    const content = activeArtifact.content;
    if (isHtml) return wrapHtml(content);
    if (isJs) return wrapJs(content);
    if (isJsx) return wrapReact(content);
    if (isCss) return wrapCss(content);
    if (isSvg) return `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9f9f9">${sanitizeSvg(content)}</body></html>`;
    if (isMarkdown) return `<!DOCTYPE html><html><head><style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:700px;margin:0 auto;line-height:1.7;color:#333}pre{background:#f4f4f4;padding:1rem;border-radius:8px;overflow-x:auto}code{font-size:0.9em}h1,h2,h3{margin-top:1.5em}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}</style></head><body>${content}</body></html>`;
    return null;
  }, [activeArtifact, isHtml, isJs, isJsx, isCss, isSvg, isMarkdown]);

  const previewContent = canPreview ? getPreviewContent() : null;

  const handleOpenNewTab = () => {
    if (!previewContent) return;
    const blob = new Blob([previewContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleRefresh = () => {
    setIframeKey(k => k + 1);
  };

  // AI execution for non-web languages
  const handleExecute = async () => {
    if (!activeArtifact) return;
    if (canPreview) {
      setViewMode("preview");
      return;
    }

    setExecuting(true);
    setExecOutput(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) { setExecOutput("Error: Not authenticated"); return; }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Execute this ${activeArtifact.language} code and show ONLY the output. No explanations:\n\`\`\`${activeArtifact.language}\n${activeArtifact.content}\n\`\`\`` }],
          chatId: "artifact-exec"
        }),
      });

      if (!resp.ok || !resp.body) { setExecOutput("Error: Failed to execute code"); return; }

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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { result += content; setExecOutput(result); }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
      if (!result) setExecOutput("No output produced.");
    } catch (e) {
      setExecOutput(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => { setExecOutput(null); }, [activeArtifact?.id]);

  if (!viewerOpen || !activeArtifact) return null;

  const showPreviewTab = canPreview;
  const lines = activeArtifact.content.split('\n');

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
            {!canPreview && !isPython && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleExecute} disabled={executing}>
                {executing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Run
              </Button>
            )}
            {canPreview && viewMode === "preview" && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            )}
            {canPreview && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenNewTab} title="Open in new tab">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Download">
              <Download className="w-3.5 h-3.5" />
            </Button>
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
              key={iframeKey}
              ref={iframeRef}
              title="Artifact Preview"
              className="w-full flex-1 border-0 bg-white"
              sandbox="allow-scripts allow-modals"
              style={{ minHeight: "400px", resize: "vertical" }}
            />
          ) : isPython ? (
            <div className="flex flex-col flex-1">
              <div className="p-4 bg-muted/30 border-b border-border">
                <p className="text-sm text-muted-foreground">
                  🐍 Python runs server-side. Copy and run in your environment.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCopy}>
                    <Copy className="w-3 h-3 mr-1" /> Copy Code
                  </Button>
                  <a
                    href="https://colab.research.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <ExternalLink className="w-3 h-3 mr-1" /> Run in Colab
                    </Button>
                  </a>
                </div>
              </div>
              <div className="flex-1 overflow-auto" style={{ background: "#1e1e1e" }}>
                <div className="flex">
                  <div className="select-none text-right pr-3 pl-4 py-4 text-xs leading-relaxed" style={{ color: "#555", fontFamily: "monospace", minWidth: "3rem" }}>
                    {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
                  </div>
                  <pre className="py-4 pr-4 text-sm leading-relaxed overflow-x-auto flex-1" style={{ color: "#d4d4d4", fontFamily: "'Fira Code', 'Cascadia Code', monospace" }}>
                    <code>{activeArtifact.content}</code>
                  </pre>
                </div>
              </div>
              {execOutput !== null && (
                <div className="border-t border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Output</p>
                  <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed max-h-[300px] overflow-y-auto">
                    {execOutput}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              <div className="flex-1 overflow-auto" style={{ background: "#1e1e1e" }}>
                <div className="flex">
                  <div className="select-none text-right pr-3 pl-4 py-4 text-xs leading-relaxed" style={{ color: "#555", fontFamily: "monospace", minWidth: "3rem" }}>
                    {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
                  </div>
                  <pre className="py-4 pr-4 text-sm leading-relaxed overflow-x-auto flex-1" style={{ color: "#d4d4d4", fontFamily: "'Fira Code', 'Cascadia Code', monospace" }}>
                    <code>{activeArtifact.content}</code>
                  </pre>
                </div>
              </div>
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