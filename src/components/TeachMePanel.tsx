import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Eye, EyeOff, X, CheckCircle, Lock, AlertTriangle, RotateCcw, SkipForward, Brain, Zap, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { TeachMeSession, TopicItem, CheckpointScore } from '@/types/teachMe';
import { cn } from '@/lib/utils';

interface Props {
  session: TeachMeSession;
  onToggleFocusMode: () => void;
  onEndSession: () => void;
  onReviewTopic?: (topicName: string) => void;
}

function StrengthDots({ level }: { level?: number }) {
  const l = level || 0;
  return (
    <div className="flex gap-0.5 ml-auto shrink-0" title={`Strength: ${l}/5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            i <= l ? 'bg-emerald-500' : 'bg-muted-foreground/20'
          )}
        />
      ))}
    </div>
  );
}

function DiagnosticCard({ score }: { score: CheckpointScore }) {
  if (!score.strong && !score.weak) return null;
  return (
    <div className="mx-3 mb-1 p-2 rounded-lg bg-muted/50 border border-border text-xs space-y-1">
      {score.strong && (
        <div className="flex items-center gap-1">
          <span className="bg-emerald-500/20 text-emerald-600 px-1.5 py-0.5 rounded-full text-[10px] font-medium">✓ {score.strong}</span>
        </div>
      )}
      {score.weak && (
        <div className="flex items-center gap-1">
          <span className="bg-red-500/20 text-red-600 px-1.5 py-0.5 rounded-full text-[10px] font-medium">✗ {score.weak}</span>
        </div>
      )}
      {score.fix && (
        <p className="text-muted-foreground text-[10px] italic">💡 {score.fix}</p>
      )}
    </div>
  );
}

export function TeachMePanel({ session, onToggleFocusMode, onEndSession, onReviewTopic }: Props) {
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const doneCount = session.completedTopics.length;
  const total = session.topicOutline.length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const nextCheckpoint = 3 - (session.currentTopicIndex % 3);
  const skippedCount = session.topicOutline.filter(t => t.status === 'skipped').length;
  const reinforcedCount = session.topicOutline.filter(t => t.status === 'reinforced').length;
  const reviewDueCount = session.topicOutline.filter(t => t.reviewDue).length;

  // Find the most recent diagnostic checkpoint for each topic
  const getDiagnosticForTopic = (topicIndex: number): CheckpointScore | undefined => {
    return session.checkpointScores.find(cs => cs.afterTopic === topicIndex && (cs.strong || cs.weak));
  };

  const currentTopic = session.topicOutline[session.currentTopicIndex]?.name || 'Starting...';

  return (
    <motion.aside
      initial={{ x: 300, opacity: 0, y: 0 }}
      animate={{ x: 0, opacity: 1, y: 0 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        "teach-me-panel bg-card border-l border-border flex flex-col overflow-hidden shrink-0",
        "fixed bottom-0 inset-x-0 z-50 rounded-t-2xl border-t",
        "md:relative md:inset-auto md:z-auto md:h-full md:w-[300px] md:rounded-none md:border-t-0",
        mobileExpanded ? "h-[70vh]" : "h-auto"
      )}
    >
      {/* Mobile collapsed bar — always visible on mobile */}
      <div
        className="flex items-center gap-3 px-4 py-3 md:hidden cursor-pointer"
        onClick={() => setMobileExpanded(prev => !prev)}
      >
        <BookOpen className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-foreground truncate">{currentTopic}</span>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{doneCount}/{total}</span>
          </div>
          <Progress value={percent} className="h-1.5" />
        </div>
        {mobileExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Desktop header — always visible on desktop */}
      <div className="hidden md:flex p-4 border-b border-border items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-sm text-foreground">Teach Me Mode</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFocusMode}
          className="text-xs gap-1 h-7"
        >
          {session.focusMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {session.focusMode ? 'Focus: ON' : 'Focus: OFF'}
        </Button>
      </div>

      {/* Unit Card */}
      <div className="p-4 border-b border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current unit</p>
        <p className="font-display font-semibold text-foreground text-sm">{session.unitName}</p>
        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
          <span>{total} topics</span>
          {skippedCount > 0 && <span>• {skippedCount} skipped</span>}
          {reinforcedCount > 0 && <span>• {reinforcedCount} reinforced</span>}
        </div>
        {reviewDueCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            <span>{reviewDueCount} topic{reviewDueCount > 1 ? 's' : ''} due for review</span>
          </div>
        )}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progress</span>
            <span>{doneCount} of {total} done</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      </div>

      {/* Topic List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {session.topicOutline.map((topic: TopicItem) => {
          const diagnostic = getDiagnosticForTopic(topic.index);
          return (
            <div key={topic.index}>
              <div
                className={cn(
                  'flex items-start gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm',
                  topic.status === 'active' && 'bg-primary/10',
                  topic.status === 'done' && 'opacity-70',
                  topic.status === 'skipped' && 'opacity-50',
                  topic.status === 'reinforced' && 'bg-amber-500/5',
                  topic.status === 'locked' && 'opacity-40'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                  topic.status === 'done' && 'bg-emerald-500/20 text-emerald-600',
                  topic.status === 'skipped' && 'bg-blue-500/20 text-blue-600',
                  topic.status === 'reinforced' && 'bg-amber-500/20 text-amber-600',
                  topic.status === 'active' && 'bg-primary/20 text-primary',
                  topic.status === 'locked' && 'bg-muted text-muted-foreground'
                )}>
                  {topic.status === 'done' ? <CheckCircle className="w-3 h-3" /> :
                   topic.status === 'skipped' ? <SkipForward className="w-3 h-3" /> :
                   topic.status === 'reinforced' ? <RotateCcw className="w-3 h-3" /> :
                   topic.status === 'locked' ? <Lock className="w-2.5 h-2.5" /> :
                   topic.index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    'text-sm leading-snug block',
                    topic.status === 'active' ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    {topic.name}
                  </span>
                  {topic.examPriority && (
                    <span className={cn(
                      'text-[9px] font-medium uppercase tracking-wider',
                      topic.examPriority === 'high' && 'text-red-500',
                      topic.examPriority === 'medium' && 'text-amber-500',
                      topic.examPriority === 'low' && 'text-muted-foreground',
                    )}>
                      {topic.examPriority === 'high' ? '⚡ HIGH PRIORITY' :
                       topic.examPriority === 'medium' ? '📌 MEDIUM' : ''}
                    </span>
                  )}
                  {topic.depthLevel && (
                    <span className="text-[9px] text-muted-foreground ml-1">
                      ({topic.depthLevel})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {topic.eli5Used && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">ELI5</span>
                  )}
                  {topic.reviewDue && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">Review</span>
                  )}
                  {topic.strengthLevel !== undefined && topic.strengthLevel > 0 && (
                    <StrengthDots level={topic.strengthLevel} />
                  )}
                </div>
              </div>
              {/* Diagnostic card for weak topics */}
              {diagnostic && diagnostic.weak && (
                <div className="ml-8 mt-1 mb-1">
                  <DiagnosticCard score={diagnostic} />
                  {onReviewTopic && (
                    <button
                      onClick={() => onReviewTopic(diagnostic.weak!)}
                      className="text-[10px] text-primary hover:underline ml-2 mt-0.5"
                    >
                      Review this topic →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Checkpoint Notice */}
      {nextCheckpoint <= 3 && nextCheckpoint > 0 && session.currentTopicIndex > 0 && session.status === 'active' && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Checkpoint in {nextCheckpoint} topic{nextCheckpoint > 1 ? 's' : ''} — a diagnostic quiz is coming up.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-3 border-t border-border">
        {[
          { value: `${percent}%`, label: 'Complete' },
          { value: `${doneCount}/${total}`, label: 'Topics done' },
          { value: String(session.eli5Triggers), label: 'ELI5 used' },
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* End Session */}
      <div className="p-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={onEndSession}
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <X className="w-3 h-3 mr-1.5" /> End session
        </Button>
      </div>
    </motion.aside>
  );
}
