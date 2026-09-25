import { useState, useEffect } from 'react';

export interface AiTeachingSession {
  id: string;
  learner_user_id: string;
  learner_name: string | null;
  course_id: string;
  course_title: string | null;
  session_status: string;
  started_at: string | null;
  ended_at: string | null;
  total_turns: number | null;
  total_duration_seconds: number | null;
  delivery_mode: string | null;
  escalation_triggered: boolean | null;
  escalation_reason: string | null;
}

export function useAiTeachingSessions() {
  const [sessions, setSessions] = useState<AiTeachingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await fetch('/api/admin/lms-ai-teaching');
        if (!response.ok) throw new Error('Failed to fetch AI teaching sessions');
        const data = await response.json();
        setSessions(data.sessions || data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSessions();
  }, []);

  return { sessions, isLoading, error };
}
