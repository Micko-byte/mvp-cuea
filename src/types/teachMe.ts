export interface TopicItem {
  index: number;
  name: string;
  status: 'locked' | 'active' | 'done';
  checkPassed?: boolean;
  eli5Used?: boolean;
}

export interface CheckpointScore {
  afterTopic: number;
  score: number;
  total: number;
  passed: boolean;
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
}
