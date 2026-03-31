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
    metadata: data.metadata || {},
  };
}

export function useTeachMeSession() {
  const [session, setSession] = useState<TeachMeSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [memoryTopics, setMemoryTopics] = useState<any[]>([]);

  // Fetch student memory for a unit to enable spaced repetition & strength awareness
  const fetchStudentMemory = useCallback(async (unitName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('student_memory')
      .select('*')
      .eq('user_id', user.id)
      .eq('subject', unitName)
      .order('updated_at', { ascending: false });

    const memories = data || [];
    setMemoryTopics(memories);
    return memories;
  }, []);

  // Upsert student memory after MEMORY_UPDATE tag
  const upsertStudentMemory = useCallback(async (topicName: string, unitName: string, strength: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if memory exists
    const { data: existing } = await supabase
      .from('student_memory')
      .select('id')
      .eq('user_id', user.id)
      .eq('content', topicName)
      .eq('subject', unitName)
      .eq('memory_type', 'topic')
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from('student_memory')
        .update({
          strength_level: strength,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('student_memory')
        .insert({
          user_id: user.id,
          content: topicName,
          subject: unitName,
          memory_type: 'topic',
          strength_level: strength,
          last_seen_at: new Date().toISOString(),
        });
    }
  }, []);

  // Get topics due for spaced review
  const getSpacedReviewTopics = useCallback((memories: any[]) => {
    const now = new Date();
    return memories.filter((m: any) => {
      const daysSince = m.last_seen_at
        ? Math.floor((now.getTime() - new Date(m.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      const strength = m.strength_level || 0;
      // Due for review: strength ≤ 3 AND last seen > 3 days
      return strength <= 3 && daysSince > 3;
    });
  }, []);

  const createSession = useCallback(async (
    threadId: string,
    unitName: string,
    topicOutline: TopicItem[]
  ) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return null; }

    // Fetch memory for enrichment
    const memories = await fetchStudentMemory(unitName);

    // Enrich outline with strength data from memory
    const enrichedOutline = topicOutline.map((topic) => {
      const mem = memories.find((m: any) => m.content?.toLowerCase() === topic.name?.toLowerCase());
      if (mem) {
        const daysSince = mem.last_seen_at
          ? Math.floor((Date.now() - new Date(mem.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        return {
          ...topic,
          strengthLevel: mem.strength_level || 0,
          daysSinceLastSeen: daysSince,
          reviewDue: (mem.strength_level || 0) <= 3 && daysSince > 3,
        };
      }
      return topic;
    });

    const { data, error } = await supabase
      .from('teach_me_sessions' as any)
      .insert({
        user_id: user.id,
        thread_id: threadId,
        unit_name: unitName,
        topic_outline: enrichedOutline as any,
        current_topic_index: 0,
        completed_topics: [] as any,
        eli5_triggers: 0,
        checkpoint_scores: [] as any,
        focus_mode: false,
        status: 'active',
        metadata: {} as any,
      })
      .select()
      .single();

    setLoading(false);
    if (error || !data) return null;

    const mapped = mapRow(data);
    setSession(mapped);
    return mapped;
  }, [fetchStudentMemory]);

  const updateTopicProgress = useCallback(async (
    sessionId: string,
    topicIndex: number,
    status: 'active' | 'done' | 'skipped' | 'reinforced',
    eli5Used?: boolean
  ) => {
    if (!session) return;

    const updatedOutline = session.topicOutline.map((t) => {
      if (t.index === topicIndex) return { ...t, status, eli5Used: eli5Used ?? t.eli5Used };
      if (t.index === topicIndex + 1 && (status === 'done' || status === 'skipped')) return { ...t, status: 'active' as const };
      return t;
    });

    const completedTopics = (status === 'done' || status === 'skipped')
      ? [...new Set([...session.completedTopics, topicIndex])]
      : session.completedTopics;

    const eli5Triggers = eli5Used ? session.eli5Triggers + 1 : session.eli5Triggers;
    const newCurrentIndex = (status === 'done' || status === 'skipped') ? topicIndex + 1 : topicIndex;

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

  const updateMetadata = useCallback(async (sessionId: string, newMeta: Record<string, any>) => {
    if (!session) return;
    const merged = { ...(session.metadata || {}), ...newMeta };
    await supabase
      .from('teach_me_sessions' as any)
      .update({ metadata: merged as any, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    setSession(prev => prev ? { ...prev, metadata: merged } : null);
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

    // Also load memory for this unit
    await fetchStudentMemory(mapped.unitName);

    return mapped;
  }, [fetchStudentMemory]);

  return {
    session,
    loading,
    memoryTopics,
    createSession,
    updateTopicProgress,
    addCheckpointScore,
    updateMetadata,
    toggleFocusMode,
    markComplete,
    endSession,
    loadSession,
    upsertStudentMemory,
    getSpacedReviewTopics,
    fetchStudentMemory,
  };
}
