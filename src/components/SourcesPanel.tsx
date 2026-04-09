import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  ChevronLeft,
  X,
  Download,
  File,
  BookOpen,
  Loader2,
  ScrollText,
  FileQuestion,
} from "lucide-react";

interface Material {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string | null;
  document_type: string;
  created_at: string;
}

interface SourcesPanelProps {
  unitId: string;
  unitName: string;
  onClose: () => void;
}

/** Smart sort: course outlines first, then by module/chapter/week number, then alphabetically. Past papers last. */
function smartSort(materials: Material[]): Material[] {
  const getOrder = (m: Material) => {
    const name = m.file_name.toLowerCase();
    const title = m.title.toLowerCase();
    const combined = name + " " + title;

    // Past papers always last
    if (m.document_type === "past_paper") return 9000;

    // Course outline / syllabus first
    if (/course.?outline|syllabus|curriculum/i.test(combined)) return -100;
    if (/introduction|intro\b/i.test(combined)) return -50;

    // Extract number from common patterns
    const patterns = [
      /(?:module|chapter|ch|unit|topic|week|lecture|lec|part|section|sess)\s*[:\-.]?\s*(\d+)/i,
      /^(\d+)\s*[:\-.\s]/,
    ];
    for (const p of patterns) {
      const match = combined.match(p);
      if (match) return parseInt(match[1]);
    }
    return 500; // no number found → middle
  };

  return [...materials].sort((a, b) => {
    const oa = getOrder(a);
    const ob = getOrder(b);
    if (oa !== ob) return oa - ob;
    return a.title.localeCompare(b.title);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(docType: string) {
  if (docType === "past_paper") return FileQuestion;
  return FileText;
}

export function SourcesPanel({ unitId, unitName, onClose }: SourcesPanelProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<Material | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Fetch materials for this unit
  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("materials")
        .select("id, title, file_name, file_type, file_size, storage_path, document_type, created_at")
        .eq("unit_id", unitId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMaterials(data);
      }
      setLoading(false);
    };
    fetchMaterials();
  }, [unitId]);

  const sortedMaterials = useMemo(() => smartSort(materials), [materials]);

  const noteFiles = sortedMaterials.filter((m) => m.document_type !== "past_paper");
  const pastPapers = sortedMaterials.filter((m) => m.document_type === "past_paper");

  // Open a file — get signed URL
  const openFile = async (material: Material) => {
    if (!material.storage_path) return;
    setSelectedFile(material);
    setPdfLoading(true);
    setPdfUrl(null);

    const { data, error } = await supabase.storage
      .from("materials")
      .createSignedUrl(material.storage_path, 3600); // 1 hour

    if (!error && data?.signedUrl) {
      setPdfUrl(data.signedUrl);
    }
    setPdfLoading(false);
  };

  const goBack = () => {
    setSelectedFile(null);
    setPdfUrl(null);
  };

  // ── Viewing a file ──
  if (selectedFile) {
    return (
      <aside className="hidden md:flex flex-col w-[340px] flex-shrink-0 border-l border-border bg-card/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border flex-shrink-0">
          <button
            onClick={goBack}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{selectedFile.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">{selectedFile.file_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          {pdfLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          ) : pdfUrl ? (
            selectedFile.file_type === "application/pdf" || selectedFile.file_name.endsWith(".pdf") ? (
              <iframe
                src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`}
                className="w-full h-full border-0 bg-background"
                title={selectedFile.title}
              />
            ) : (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title={selectedFile.title}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
              <File className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                Unable to preview this file. Try downloading it instead.
              </p>
              {selectedFile.storage_path && (
                <button
                  onClick={async () => {
                    const { data } = await supabase.storage
                      .from("materials")
                      .createSignedUrl(selectedFile.storage_path!, 300);
                    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    );
  }

  // ── File list ──
  return (
    <aside className="hidden md:flex flex-col w-[300px] flex-shrink-0 border-l border-border bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ScrollText className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">Sources</p>
            <p className="text-[10px] text-muted-foreground truncate">{unitName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading sources...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No files uploaded for this unit yet.</p>
            <p className="text-xs text-muted-foreground/60">Upload notes or past papers to see them here.</p>
          </div>
        ) : (
          <>
            {/* Notes section */}
            {noteFiles.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Course Notes ({noteFiles.length})
                </p>
                <div className="space-y-0.5">
                  {noteFiles.map((m) => {
                    const Icon = getFileIcon(m.document_type);
                    return (
                      <button
                        key={m.id}
                        onClick={() => openFile(m)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-muted/60 transition-colors group"
                      >
                        <Icon className="w-4 h-4 text-primary/70 flex-shrink-0 group-hover:text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{m.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {m.file_type.toUpperCase()} · {formatFileSize(m.file_size)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past papers section */}
            {pastPapers.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Past Papers ({pastPapers.length})
                </p>
                <div className="space-y-0.5">
                  {pastPapers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => openFile(m)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-muted/60 transition-colors group"
                    >
                      <FileQuestion className="w-4 h-4 text-amber-500/70 flex-shrink-0 group-hover:text-amber-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{m.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {m.file_type.toUpperCase()} · {formatFileSize(m.file_size)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border flex-shrink-0">
        <p className="text-[10px] text-muted-foreground text-center">
          {materials.length} file{materials.length !== 1 ? "s" : ""} · Click to preview
        </p>
      </div>
    </aside>
  );
}
