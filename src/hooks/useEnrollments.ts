import { useState, useEffect } from 'react';

export interface Enrollment {
  id: string;
  learner_user_id: string;
  learner_name: string | null;
  course_id: string;
  course_title: string | null;
  course_code: string | null;
  status: string;
  delivery_mode: string;
  enrolled_at: string | null;
  completed_at: string | null;
  dropped_at: string | null;
  progress_percentage: string | null;
  last_activity_at: string | null;
}

export function useEnrollments() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEnrollments() {
      try {
        const response = await fetch('/api/admin/lms-enrollment');
        if (!response.ok) throw new Error('Failed to fetch enrollments');
        const data = await response.json();
        setEnrollments(data.enrollments || data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEnrollments();
  }, []);

  return { enrollments, isLoading, error };
}
