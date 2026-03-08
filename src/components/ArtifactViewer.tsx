import { useArtifacts } from "@/contexts/ArtifactContext";
import { X, Eye, Code2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ArtifactViewer = () => {
  const { activeArtifact, viewerOpen, viewMode, setViewerOpen, setViewMode } = useArtifacts();
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleCopy = () => {
    if (!activeArtifact) return;
    navigator.clipboard.writeText(activeArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canPreview = activeArtifact && ["html", "svg", "markdown"].includes(activeArtifact.type);

  useEffect(() => {
    if (viewMode === "preview" && canPreview && iframeRef.current && activeArtifact) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        let content = activeArtifact.content;
        if (activeArtifact.type === "svg") {
          content = `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9f9f9">${content}</body></html>`;
        } else if (activeArtifact.type === "markdown") {
          content = `<!DOCTYPE html><html><head><style>body{font-family:system-ui;padding:2rem;max-width:700px;margin:0 auto;line-height:1.6;color:#333}pre{background:#f4f4f4;padding:1rem;border-radius:8px;overflow-x:auto}code{font-size:0.9em}</style></head><body>${content}</body></html>`;
        }
        doc.open();
        doc.write(content);
        doc.close();
      }
    }
  }, [viewMode, activeArtifact, canPreview]);

  if (!viewerOpen || !activeArtifact) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "100%", opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col h-full border-l border-border bg-card overflow-hidden"
      >
        {/* Toolbar */}
        <div className="h-12 flex items-center justify-between px-3 border-b border-border bg-muted/50 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {activeArtifact.type}
            </span>
            <span className="text-sm font-medium text-foreground truncate">{activeArtifact.title}</span>
          </div>
          <div className="flex items-center gap-1">
            {canPreview && (
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewerOpen(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {viewMode === "preview" && canPreview ? (
            <iframe
              ref={iframeRef}
              title="Artifact Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts"
            />
          ) : (
            <pre className="p-4 text-sm font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">
              <code>{activeArtifact.content}</code>
            </pre>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ArtifactViewer;
