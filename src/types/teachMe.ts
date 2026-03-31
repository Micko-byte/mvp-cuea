export interface TopicItem {
  index: number;
  name: string;
  status: 'locked' | 'active' | 'done' | 'skipped' | 'reinforced';
  checkPassed?: boolean;
  eli5Used?: boolean;
  depthLevel?: 'light' | 'medium' | 'deep';
  examPriority?: 'high' | 'medium' | 'low';
  strengthLevel?: number; // 1-5 from student_memory
  daysSinceLastSeen?: number;
  reviewDue?: boolean;
}

export interface CheckpointScore {
  afterTopic: number;
  score: number;
  total: number;
  passed: boolean;
  // Diagnostic fields
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
}
