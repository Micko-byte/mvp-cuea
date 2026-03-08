import React, { createContext, useContext, useState, useCallback } from "react";

export interface Artifact {
  id: string;
  title: string;
  content: string;
  language: string;
  type: "code" | "html" | "markdown" | "svg" | "table";
  timestamp: number;
  chatId?: string;
}

interface ArtifactContextType {
  artifacts: Artifact[];
  activeArtifact: Artifact | null;
  viewerOpen: boolean;
  viewMode: "preview" | "code";
  addArtifact: (artifact: Omit<Artifact, "id" | "timestamp">) => Artifact;
  setActiveArtifact: (id: string | null) => void;
  setViewerOpen: (open: boolean) => void;
  setViewMode: (mode: "preview" | "code") => void;
  removeArtifact: (id: string) => void;
}

const ArtifactContext = createContext<ArtifactContextType | null>(null);

export const ArtifactProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");

  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId) || null;

  const addArtifact = useCallback((data: Omit<Artifact, "id" | "timestamp">) => {
    const artifact: Artifact = {
      ...data,
      id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    setArtifacts((prev) => [artifact, ...prev]);
    setActiveArtifactId(artifact.id);
    setViewerOpen(true);
    return artifact;
  }, []);

  const setActiveArtifact = useCallback((id: string | null) => {
    setActiveArtifactId(id);
    if (id) setViewerOpen(true);
  }, []);

  const removeArtifact = useCallback((id: string) => {
    setArtifacts((prev) => prev.filter((a) => a.id !== id));
    if (activeArtifactId === id) {
      setActiveArtifactId(null);
      setViewerOpen(false);
    }
  }, [activeArtifactId]);

  return (
    <ArtifactContext.Provider
      value={{
        artifacts,
        activeArtifact,
        viewerOpen,
        viewMode,
        addArtifact,
        setActiveArtifact,
        setViewerOpen,
        setViewMode,
        removeArtifact,
      }}
    >
      {children}
    </ArtifactContext.Provider>
  );
};

export const useArtifacts = () => {
  const ctx = useContext(ArtifactContext);
  if (!ctx) throw new Error("useArtifacts must be used within ArtifactProvider");
  return ctx;
};
