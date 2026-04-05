export interface TopicItem {
  index: number;
  name: string;
  status: 'locked' | 'active' | 'done' | 'skipped' | 'reinforced';
  checkPassed?: boolean;
  eli5Used?: boolean;
  depthLevel?: 'light' | 'medium' | 'deep';
  examPriority?: 'high' | 'medium' | 'low';
  strengthLevel?: number;
  daysSinceLastSeen?: number;
  reviewDue?: boolean;
}

export interface CheckpointScore {
  afterTopic: number;
  score: number;
  total: number;
  passed: boolean;
  strong?: string;
  weak?: string;
  misconception?: string;
  fix?: string;
}

export interface SessionRecap {
  topicsDone: string[];
  weakTopics: string[];
  nextStart: string;
}

export interface TeachMeSession {
  id: string;
  userId: string;
  threadId: string;
  unitName: string;
  topicOutline: TopicItem[];
  currentTopicIndex: number;
  completedTopics: number[];
  eli5Triggers: number;
  checkpointScores: CheckpointScore[];
  focusMode: boolean;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  // New fields
  exam_readiness_score: number;
  streak_days: number;
  session_recap: SessionRecap | null;
  predicted_q_score: number | null;
  weak_topics: string[];
  strong_topics: string[];
}
