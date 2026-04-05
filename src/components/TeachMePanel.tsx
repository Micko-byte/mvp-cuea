import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Focus, Download, ChevronDown, ChevronUp, AlertCircle, Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { TeachMeSession } from "@/types/teachMe";
import { useIsMobile } from "@/hooks/use-mobile";

interface TeachMePanelProps {
  session: TeachMeSession;
  onToggleFocusMode: () => void;
  onEndSession: () => void;
  onSendMessage?: (text: string) => void;
}

export const TeachMePanel = ({ session, onToggleFocusMode, onEndSession, onSendMessage }: TeachMePanelProps) => {
  const [checkpointExpanded, setCheckpointExpanded] = useState(false);
  const [readinessExpanded, setReadinessExpanded] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  const completedTopics = session.topicOutline?.filter(t => t.status === "done") || [];
  const activeTopicIndex = session.currentTopicIndex ?? 0;
  const totalTopics = session.topicOutline?.length ?? 0;
  const progressPct = totalTopics > 0 ? Math.round((completedTopics.length / totalTopics) * 100) : 0;
  const activeTopic = session.topicOutline?.[activeTopicIndex];
  const readiness = session.exam_readiness_score ?? 0;
  const streak = session.streak_days ?? 0;
  const weakTopics: string[] = session.weak_topics ?? [];
  const strongTopics: string[] = session.strong_topics ?? [];
  const readinessColor = readiness === 0 ? "text-muted-foreground" : readiness >= 70 ? "text-emerald-600 dark:text-emerald-400" : readiness >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  if (session.focusMode) {
    return (
      <div className="fixed top-3 right-3 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-lg">
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{activeTopic?.name ?? "Studying"}</span>
        <span className="text-xs text-muted-foreground">{completedTopics.length}/{totalTopics}</span>
        <button onClick={onToggleFocusMode} className="text-xs text-primary hover:underline ml-1">Exit focus</button>
      </div>
    );
  }

  const panelBody = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{session.unitName}</p>
            <p className="text-[10px] text-muted-foreground">{completedTopics.length}/{totalTopics} topics · {progressPct}%</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggleFocusMode} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Focus mode"><Focus className="w-3.5 h-3.5" /></button>
          <button onClick={() => setConfirmEnd(true)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="End session"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {readiness > 0 && (
          <button onClick={() => setReadinessExpanded(!readinessExpanded)} className="w-full text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Exam Readiness</span>
              <span className={`text-sm font-bold ${readinessColor}`}>{readiness}%</span>
            </div>
            <Progress value={readiness} className="h-1.5 mt-1" />
            <AnimatePresence>
              {readinessExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-1.5 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Topics done: {completedTopics.length}/{totalTopics}</p>
                  {strongTopics.length > 0 && <p className="text-[10px] text-emerald-600">Strong: {strongTopics.join(", ")}</p>}
                  {weakTopics.length > 0 && <p className="text-[10px] text-amber-600">Review: {weakTopics.join(", ")}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        )}
        {streak >= 2 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 w-fit">
            <Flame className="w-3 h-3 text-amber-500" />
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{streak}-day streak</span>
          </div>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Topics</p>
          <div className="space-y-0.5">
            {session.topicOutline?.map((topic, i) => {
              const isDone = topic.status === "done";
              const isActive = topic.status === "active";
              const isWeak = weakTopics.some(w => topic.name.toLowerCase().includes(w.toLowerCase()));
              const cp = session.checkpointScores?.find(c => c.afterTopic === i);
              return (
                <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${isActive ? "bg-primary/10 border-l-2 border-primary" : isDone ? "opacity-80" : "opacity-40"}`}>
                  <span className={`text-[10px] w-4 text-center flex-shrink-0 ${isDone ? "text-emerald-600" : isActive ? "text-primary font-bold" : "text-muted-foreground"}`}>{isDone ? "✓" : isActive ? "→" : "○"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`truncate ${isActive ? "font-semibold text-foreground" : "text-foreground/80"}`}>{topic.name}</p>
                    {cp && <p className="text-[9px] text-muted-foreground">{cp.score}/{cp.total} checkpoint</p>}
                  </div>
                  {isWeak && <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
        {session.checkpointScores && session.checkpointScores.length > 0 && (
          <div>
            <button onClick={() => setCheckpointExpanded(!checkpointExpanded)} className="flex items-center justify-between w-full text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Checkpoints ({session.checkpointScores.length})
              {checkpointExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <AnimatePresence>
              {checkpointExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-1">
                  {session.checkpointScores.map((cp, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-muted/50">
                      <span className="text-muted-foreground">After Topic {cp.afterTopic + 1}</span>
                      <span className="font-semibold">{cp.score}/{cp.total}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {weakTopics.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Needs Review</p>
            <div className="flex flex-wrap gap-1">
              {weakTopics.map((topic, i) => (
                <button key={i} onClick={() => onSendMessage?.(`Re-teach me ${topic} from a different angle`)} className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">{topic}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 px-3 py-2.5 border-t border-border flex-shrink-0">
        <button onClick={() => onSendMessage?.("[GENERATE_SESSION_NOTES]")} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors text-foreground"><Download className="w-3 h-3" />Session Notes</button>
        <button onClick={() => setConfirmEnd(true)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors">End Session</button>
      </div>
      <AnimatePresence>
        {confirmEnd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-50">
            <AlertCircle className="w-8 h-8 text-destructive mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">End this session?</p>
            <p className="text-xs text-muted-foreground text-center mb-4">Progress is saved. You can resume anytime.</p>
            <div className="flex gap-2 w-full max-w-[200px]">
              <button onClick={() => setConfirmEnd(false)} className="flex-1 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors">Keep going</button>
              <button onClick={() => { setConfirmEnd(false); onEndSession(); }} className="flex-1 py-2 rounded-lg text-sm bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity">End session</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-40 md:hidden bg-card border-b border-border px-3 py-2 cursor-pointer" onClick={() => setMobileOpen(!mobileOpen)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs font-semibold text-foreground truncate">{activeTopic?.name ?? "Teach Me"}</span>
            </div>
            <span className="text-xs font-bold text-muted-foreground flex-shrink-0">Topic {activeTopicIndex + 1}/{totalTopics}</span>
          </div>
          <Progress value={progressPct} className="h-1 mt-1" />
        </div>
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
              <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }} className="fixed top-0 right-0 bottom-0 z-50 w-[85vw] max-w-[340px] bg-background border-l border-border md:hidden flex flex-col overflow-hidden">
                <div className="relative flex-1 overflow-hidden">{panelBody}</div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-[300px] flex-shrink-0 border-l border-border bg-card/50 relative overflow-hidden">
      {panelBody}
    </aside>
  );
};
