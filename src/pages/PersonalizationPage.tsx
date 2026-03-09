import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Type, Palette, Image as ImageIcon, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  usePersonalization,
  FONT_OPTIONS,
  THEME_OPTIONS,
  CHAT_BACKGROUNDS,
  type FontOption,
  type ThemeOption,
} from "@/contexts/PersonalizationContext";

const PersonalizationPage = () => {
  const navigate = useNavigate();
  const {
    font, theme, chatBackground, nickname,
    setFont, setTheme, setChatBackground, setNickname,
  } = usePersonalization();

  // Pending (draft) state
  const [draft, setDraft] = useState({ font, theme, chatBackground, nickname });
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);

  const hasChanges = draft.font !== font || draft.theme !== theme || draft.chatBackground !== chatBackground || draft.nickname !== nickname;

  const handleSave = () => {
    setFont(draft.font);
    setTheme(draft.theme);
    setChatBackground(draft.chatBackground);
    setNickname(draft.nickname);
    toast.success("Changes saved");
  };

  const handleBack = useCallback(() => {
    if (hasChanges) {
      setPendingNavPath("/chat");
      setShowDiscardPrompt(true);
    } else {
      navigate("/chat");
    }
  }, [hasChanges, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 flex items-center px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display font-bold text-foreground text-lg flex-1">Personalization</h1>
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className="text-sm font-semibold transition-colors"
          style={hasChanges ? { backgroundColor: "#800000", color: "white" } : undefined}
          variant={hasChanges ? "default" : "secondary"}
        >
          Save
        </Button>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-10">
        {/* 1. AI Nickname */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-foreground text-lg">AI Nickname</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Choose a nickname the AI should call you</p>
          <Input
            value={draft.nickname}
            onChange={(e) => setDraft((d) => ({ ...d, nickname: e.target.value }))}
            placeholder="e.g. Boss, Chief, Captain..."
            className="max-w-sm"
          />
          {draft.nickname && (
            <p className="text-xs text-muted-foreground mt-2">
              The AI will greet you as <span className="font-semibold text-primary">"{draft.nickname}"</span>
            </p>
          )}
        </motion.section>

        {/* 2. Font Selection */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-foreground text-lg">Font</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Choose your preferred font</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDraft((d) => ({ ...d, font: f.value }))}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  draft.font === f.value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30 bg-card"
                }`}
              >
                {draft.font === f.value && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <p className="font-semibold text-sm text-foreground" style={{ fontFamily: f.family }}>
                  {f.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: f.family }}>
                  The quick brown fox
                </p>
              </button>
            ))}
          </div>
        </motion.section>

        {/* 3. Theme */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-foreground text-lg">Theme</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Pick a color theme for the app</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setDraft((d) => ({ ...d, theme: t.value }))}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  draft.theme === t.value
                    ? "border-primary shadow-sm"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full border border-border shadow-sm"
                  style={{ background: t.preview }}
                />
                {draft.theme === t.value && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
                <span className="text-xs font-medium text-foreground">{t.label}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* 4. Chat Background */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-foreground text-lg">Chat Background</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Choose a background image for the chat — bubble colors will adapt automatically
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {CHAT_BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setDraft((d) => ({ ...d, chatBackground: bg.id }))}
                className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all ${
                  draft.chatBackground === bg.id
                    ? "border-primary shadow-md ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {bg.url ? (
                  <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">None</span>
                  </div>
                )}
                {draft.chatBackground === bg.id && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <span className="text-[10px] font-medium text-white">{bg.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Preview */}
          {draft.chatBackground !== "none" && (
            <div className="mt-4">
              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">Preview</Label>
              <div
                className="rounded-xl overflow-hidden border border-border p-4 h-48 flex flex-col justify-end gap-2"
                style={{
                  backgroundImage: `url(${CHAT_BACKGROUNDS.find((b) => b.id === draft.chatBackground)?.url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {(() => {
                  const bg = CHAT_BACKGROUNDS.find((b) => b.id === draft.chatBackground);
                  if (!bg) return null;
                  return (
                    <>
                      <div className="flex justify-start">
                        <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-xs max-w-[70%]" style={{ background: bg.botBubble, color: bg.botText }}>
                          Hey! How can I help you today?
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="px-3 py-2 rounded-2xl rounded-br-sm text-xs max-w-[70%]" style={{ background: bg.userBubble, color: bg.userText }}>
                          Help me with my assignment
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </motion.section>
      </div>

      <ConfirmDialog
        open={showDiscardPrompt}
        onOpenChange={setShowDiscardPrompt}
        title="Unsaved Changes"
        description="You have unsaved changes. Leave without saving?"
        confirmLabel="Discard Changes"
        onConfirm={() => {
          setShowDiscardPrompt(false);
          if (pendingNavPath) navigate(pendingNavPath);
        }}
      />
    </div>
  );
};

export default PersonalizationPage;
