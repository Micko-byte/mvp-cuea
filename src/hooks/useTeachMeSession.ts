import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TeachMeSession, TopicItem, CheckpointScore } from '@/types/teachMe';

function mapRow(data: any): TeachMeSession {
  const outline = (data.topic_outline as TopicItem[]) || [];
  const completedTopics = (data.completed_topics as number[]) || [];
  const currentIndex = data.current_topic_index ?? 0;
  
  // Ensure every topic has a status — DB might store without it
  const enrichedOutline = outline.map((t, i) => ({
    ...t,
    index: t.index ?? i,
    status: t.status || (
      completedTopics.includes(t.index ?? i) ? 'done' 
      : (t.index ?? i) === currentIndex ? 'active' 
      : (t.index ?? i) < currentIndex ? 'done'
      : 'locked'
    ),
  }));

  return {
    id: data.id,
    userId: data.user_id,
    threadId: data.thread_id,
    unitName: data.unit_name,
    topicOutline: enrichedOutline,
    currentTopicIndex: currentIndex,
    completedTopics: completedTopics,
    eli5Triggers: data.eli5_triggers,
    checkpointScores: data.checkpoint_scores as CheckpointScore[],
    focusMode: data.focus_mode,
    status: data.status as 'active' | 'completed',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    metadata: data.metadata || {},
    exam_readiness_score: data.exam_readiness_score ?? 0,
    streak_days: data.streak_days ?? 0,
    session_recap: data.session_recap ?? null,
    predicted_q_score: data.predicted_q_score ?? null,
    weak_topics: (data.weak_topics as string[]) ?? [],
    strong_topics: (data.strong_topics as string[]) ?? [],
  };
}

export function useTeachMeSession() {
  const [session, setSession] = useState<TeachMeSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [memoryTopics, setMemoryTopics] = useState<any[]>([]);

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

  const upsertStudentMemory = useCallback(async (topicName: string, unitName: string, strength: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
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
      await supabase.from('student_memory').update({
        strength_level: strength,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('student_memory').insert({
        user_id: user.id,
        content: topicName,
        subject: unitName,
        memory_type: 'topic',
        strength_level: strength,
        last_seen_at: new Date().toISOString(),
      });
    }
  }, []);

  const getSpacedReviewTopics = useCallback((memories: any[]) => {
    const now = new Date();
    return memories.filter((m: any) => {
      const daysSince = m.last_seen_at
        ? Math.floor((now.getTime() - new Date(m.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return (m.strength_level || 0) <= 3 && daysSince > 3;
    });
  }, []);

  const createSession = useCallback(async (
    threadId: string, unitName: string, topicOutline: TopicItem[]
  ) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return null; }
    const memories = await fetchStudentMemory(unitName);
    const enrichedOutline = topicOutline.map((topic) => {
      const mem = memories.find((m: any) => m.content?.toLowerCase() === topic.name?.toLowerCase());
      if (mem) {
        const daysSince = mem.last_seen_at
          ? Math.floor((Date.now() - new Date(mem.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        return { ...topic, strengthLevel: mem.strength_level || 0, daysSinceLastSeen: daysSince, reviewDue: (mem.strength_level || 0) <= 3 && daysSince > 3 };
      }
      return topic;
    });
    const { data, error } = await supabase
      .from('teach_me_sessions' as any)
      .insert({
        user_id: user.id, thread_id: threadId, unit_name: unitName,
        topic_outline: enrichedOutline as any, current_topic_index: 0,
        completed_topics: [] as any, eli5_triggers: 0,
        checkpoint_scores: [] as any, focus_mode: false, status: 'active',
        metadata: {} as any, exam_readiness_score: 0, streak_days: 0,
        weak_topics: [] as any, strong_topics: [] as any,
      })
      .select().single();
    setLoading(false);
    if (error || !data) return null;
    const mapped = mapRow(data);
    setSession(mapped);
    return mapped;
  }, [fetchStudentMemory]);

  const updateTopicProgress = useCallback(async (
    sessionId: string, topicIndex: number,
    status: 'active' | 'done' | 'skipped' | 'reinforced', eli5Used?: boolean
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
    const { error } = await supabase.from('teach_me_sessions' as any).update({
      topic_outline: updatedOutline as any, completed_topics: completedTopics as any,
      current_topic_index: newCurrentIndex, eli5_triggers: eli5Triggers,
      updated_at: new Date().toISOString(),
    }).eq('id', sessionId);
    if (!error) {
      setSession(prev => prev ? { ...prev, topicOutline: updatedOutline as TopicItem[], completedTopics, currentTopicIndex: newCurrentIndex, eli5Triggers } : null);
    }
  }, [session]);

  const addCheckpointScore = useCallback(async (sessionId: string, score: CheckpointScore) => {
    if (!session) return;
    const updated = [...session.checkpointScores, score];
    // Accumulate strong/weak topics
    const newStrong = [...new Set([...(session as any).strong_topics || [], ...(score.strong ? [score.strong] : [])])];
    const newWeak = [...new Set([...(session as any).weak_topics || [], ...(score.weak ? [score.weak] : [])])];
    await supabase.from('teach_me_sessions' as any).update({
      checkpoint_scores: updated as any, updated_at: new Date().toISOString(),
      strong_topics: newStrong as any, weak_topics: newWeak as any,
    }).eq('id', sessionId);
    setSession(prev => prev ? { ...prev, checkpointScores: updated, strong_topics: newStrong, weak_topics: newWeak } : null);
  }, [session]);

  const updateReadiness = useCallback(async (sessionId: string, score: number) => {
    await supabase.from('teach_me_sessions' as any).update({
      exam_readiness_score: score, updated_at: new Date().toISOString(),
    }).eq('id', sessionId);
    setSession(prev => prev ? { ...prev, exam_readiness_score: score } : null);
  }, []);

  const updateStreak = useCallback(async (sessionId: string, action: 'extend' | 'break' | 'start') => {
    if (!session) return;
    const current = (session as any).streak_days || 0;
    const newStreak = action === 'break' ? 0 : action === 'start' ? 1 : current + 1;
    await supabase.from('teach_me_sessions' as any).update({
      streak_days: newStreak, updated_at: new Date().toISOString(),
    }).eq('id', sessionId);
    setSession(prev => prev ? { ...prev, streak_days: newStreak } : null);
  }, [session]);

  const saveRecap = useCallback(async (sessionId: string, recap: any) => {
    await supabase.from('teach_me_sessions' as any).update({
      session_recap: recap as any, updated_at: new Date().toISOString(),
    }).eq('id', sessionId);
    setSession(prev => prev ? { ...prev, session_recap: recap } : null);
  }, []);

  const updatePredictedQScore = useCallback(async (sessionId: string, score: number) => {
    await supabase.from('teach_me_sessions' as any).update({
      predicted_q_score: score, updated_at: new Date().toISOString(),
    }).eq('id', sessionId);
    setSession(prev => prev ? { ...prev, predicted_q_score: score } : null);
  }, []);

  const updateMetadata = useCallback(async (sessionId: string, newMeta: Record<string, any>) => {
    if (!session) return;
    const merged = { ...(session.metadata || {}), ...newMeta };
    await supabase.from('teach_me_sessions' as any).update({ metadata: merged as any, updated_at: new Date().toISOString() }).eq('id', sessionId);
    setSession(prev => prev ? { ...prev, metadata: merged } : null);
  }, [session]);

  const toggleFocusMode = useCallback(async (sessionId: string) => {
    if (!session) return;
    const newVal = !session.focusMode;
    await supabase.from('teach_me_sessions' as any).update({ focus_mode: newVal, updated_at: new Date().toISOString() }).eq('id', sessionId);
    setSession(prev => prev ? { ...prev, focusMode: newVal } : null);
  }, [session]);

  const markComplete = useCallback(async (sessionId: string) => {
    await supabase.from('teach_me_sessions' as any).update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', sessionId);
    setSession(prev => prev ? { ...prev, status: 'completed' } : null);
  }, []);

  const endSession = useCallback(() => { setSession(null); }, []);

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
    await fetchStudentMemory(mapped.unitName);
    return mapped;
  }, [fetchStudentMemory]);

  return {
    session, loading, memoryTopics,
    createSession, updateTopicProgress, addCheckpointScore,
    updateMetadata, toggleFocusMode, markComplete, endSession,
    loadSession, upsertStudentMemory, getSpacedReviewTopics, fetchStudentMemory,
    updateReadiness, updateStreak, saveRecap, updatePredictedQScore,
  };
}
