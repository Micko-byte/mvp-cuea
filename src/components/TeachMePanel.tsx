import { motion } from 'framer-motion';
import { BookOpen, Eye, EyeOff, X, Zap, CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { TeachMeSession, TopicItem } from '@/types/teachMe';
import { cn } from '@/lib/utils';

interface Props {
  session: TeachMeSession;
  onToggleFocusMode: () => void;
  onEndSession: () => void;
}

export function TeachMePanel({ session, onToggleFocusMode, onEndSession }: Props) {
  const doneCount = session.completedTopics.length;
  const total = session.topicOutline.length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const nextCheckpoint = 3 - (session.currentTopicIndex % 3);

  return (
    <motion.aside
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="teach-me-panel w-[300px] h-full bg-card border-l border-border flex flex-col overflow-hidden shrink-0"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
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
        <p className="text-xs text-muted-foreground mt-1">{total} topics</p>
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
        {session.topicOutline.map((topic: TopicItem) => (
          <div
            key={topic.index}
            className={cn(
              'flex items-start gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm',
              topic.status === 'active' && 'bg-primary/10',
              topic.status === 'done' && 'opacity-70',
              topic.status === 'locked' && 'opacity-40'
            )}
          >
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
              topic.status === 'done' && 'bg-emerald-500/20 text-emerald-600',
              topic.status === 'active' && 'bg-primary/20 text-primary',
              topic.status === 'locked' && 'bg-muted text-muted-foreground'
            )}>
              {topic.status === 'done' ? <CheckCircle className="w-3 h-3" /> :
               topic.status === 'locked' ? <Lock className="w-2.5 h-2.5" /> :
               topic.index + 1}
            </div>
            <span className={cn(
              'text-sm leading-snug',
              topic.status === 'active' ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {topic.name}
            </span>
            {topic.eli5Used && (
              <span className="ml-auto shrink-0 text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">ELI5</span>
            )}
          </div>
        ))}
      </div>

      {/* Checkpoint Notice */}
      {nextCheckpoint <= 3 && nextCheckpoint > 0 && session.currentTopicIndex > 0 && session.status === 'active' && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Checkpoint in {nextCheckpoint} topic{nextCheckpoint > 1 ? 's' : ''} — a 5-question recap quiz is coming up.
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
