import { useArtifacts } from "@/contexts/ArtifactContext";
import { useNavigate } from "react-router-dom";
import { Code2, FileText, Image, Table, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const TYPE_ICONS: Record<string, React.ElementType> = {
  code: Code2,
  html: FileText,
  markdown: FileText,
  svg: Image,
  table: Table,
};

const ArtifactsPage = () => {
  const { artifacts, setActiveArtifact, removeArtifact } = useArtifacts();
  const navigate = useNavigate();

  const handleOpen = (id: string) => {
    setActiveArtifact(id);
    navigate("/chat");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {artifacts.length === 0 ? (
        <div className="text-center py-20">
          <Code2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-lg font-display font-semibold text-foreground mb-2">No artifacts yet</h2>
          <p className="text-sm text-muted-foreground">
            When the AI generates code, HTML, or other structured content, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {artifacts.map((artifact, i) => {
            const Icon = TYPE_ICONS[artifact.type] || Code2;
            return (
              <motion.div
                key={artifact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-card transition-shadow cursor-pointer group"
                onClick={() => handleOpen(artifact.id)}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{artifact.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {artifact.type.toUpperCase()} &middot;{" "}
                    {new Date(artifact.timestamp).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeArtifact(artifact.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ArtifactsPage;
