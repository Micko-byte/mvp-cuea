import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TeachMeSession, TopicItem, CheckpointScore } from '@/types/teachMe';

function mapRow(data: any): TeachMeSession {
  return {
    id: data.id,
    userId: data.user_id,
    threadId: data.thread_id,
    unitName: data.unit_name,
    topicOutline: data.topic_outline as TopicItem[],
    currentTopicIndex: data.current_topic_index,
    completedTopics: data.completed_topics as number[],
    eli5Triggers: data.eli5_triggers,
    checkpointScores: data.checkpoint_scores as CheckpointScore[],
    focusMode: data.focus_mode,
    status: data.status as 'active' | 'completed',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function useTeachMeSession() {
  const [session, setSession] = useState<TeachMeSession | null>(null);
  const [loading, setLoading] = useState(false);

  const createSession = useCallback(async (
    threadId: string,
    unitName: string,
    topicOutline: TopicItem[]
  ) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return null; }

    const { data, error } = await supabase
      .from('teach_me_sessions' as any)
      .insert({
        user_id: user.id,
        thread_id: threadId,
        unit_name: unitName,
        topic_outline: topicOutline as any,
        current_topic_index: 0,
        completed_topics: [] as any,
        eli5_triggers: 0,
        checkpoint_scores: [] as any,
        focus_mode: false,
        status: 'active',
      })
      .select()
      .single();

    setLoading(false);
    if (error || !data) return null;

    const mapped = mapRow(data);
    setSession(mapped);
    return mapped;
  }, []);

  const updateTopicProgress = useCallback(async (
    sessionId: string,
    topicIndex: number,
    status: 'active' | 'done',
    eli5Used?: boolean
  ) => {
    if (!session) return;

    const updatedOutline = session.topicOutline.map((t) => {
      if (t.index === topicIndex) return { ...t, status, eli5Used: eli5Used ?? t.eli5Used };
      if (t.index === topicIndex + 1 && status === 'done') return { ...t, status: 'active' as const };
      return t;
    });

    const completedTopics = status === 'done'
      ? [...new Set([...session.completedTopics, topicIndex])]
      : session.completedTopics;

    const eli5Triggers = eli5Used ? session.eli5Triggers + 1 : session.eli5Triggers;
    const newCurrentIndex = status === 'done' ? topicIndex + 1 : topicIndex;

    const { error } = await supabase
      .from('teach_me_sessions' as any)
      .update({
        topic_outline: updatedOutline as any,
        completed_topics: completedTopics as any,
        current_topic_index: newCurrentIndex,
        eli5_triggers: eli5Triggers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (!error) {
      setSession(prev => prev ? {
        ...prev,
        topicOutline: updatedOutline as TopicItem[],
        completedTopics,
        currentTopicIndex: newCurrentIndex,
        eli5Triggers,
      } : null);
    }
  }, [session]);

  const addCheckpointScore = useCallback(async (
    sessionId: string,
    score: CheckpointScore
  ) => {
    if (!session) return;
    const updated = [...session.checkpointScores, score];
    await supabase
      .from('teach_me_sessions' as any)
      .update({ checkpoint_scores: updated as any, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    setSession(prev => prev ? { ...prev, checkpointScores: updated } : null);
  }, [session]);

  const toggleFocusMode = useCallback(async (sessionId: string) => {
    if (!session) return;
    const newVal = !session.focusMode;
    await supabase
      .from('teach_me_sessions' as any)
      .update({ focus_mode: newVal, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    setSession(prev => prev ? { ...prev, focusMode: newVal } : null);
  }, [session]);

  const markComplete = useCallback(async (sessionId: string) => {
    await supabase
      .from('teach_me_sessions' as any)
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    setSession(prev => prev ? { ...prev, status: 'completed' } : null);
  }, []);

  const endSession = useCallback(() => {
    setSession(null);
  }, []);

  const loadSession = useCallback(async (threadId: string) => {
    const { data } = await supabase
      .from('teach_me_sessions' as any)
      .select('*')
      .eq('thread_id', threadId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;
    const mapped = mapRow(data);
    setSession(mapped);
    return mapped;
  }, []);

  return {
    session,
    loading,
    createSession,
    updateTopicProgress,
    addCheckpointScore,
    toggleFocusMode,
    markComplete,
    endSession,
    loadSession,
  };
}
