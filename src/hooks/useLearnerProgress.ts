import { useState, useEffect } from 'react';

export interface LessonProgressRow {
  id: string;
  learner_user_id: string;
  learner_name: string | null;
  enrollment_id: string;
  lesson_id: string;
  course_id: string | null;
  course_title: string | null;
  status: string;
  progress_percentage: string | null;
  time_spent_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string | null;
}

export interface ModuleProgressRow {
  id: string;
  learner_user_id: string;
  enrollment_id: string;
  module_id: string;
  status: string;
  lessons_total: number | null;
  lessons_completed: number | null;
  progress_percentage: string | null;
  last_accessed_at: string | null;
}

export function useLearnerProgress() {
  const [lessonProgress, setLessonProgress] = useState<LessonProgressRow[]>([]);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgressRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const response = await fetch('/api/admin/lms-progress');
        if (!response.ok) throw new Error('Failed to fetch learner progress');
        const data = await response.json();
        setLessonProgress(data.lessonProgress || []);
        setModuleProgress(data.moduleProgress || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProgress();
  }, []);

  return { lessonProgress, moduleProgress, isLoading, error };
}
