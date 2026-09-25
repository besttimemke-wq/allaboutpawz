import { useState, useEffect } from 'react';

export interface Course {
  id: string;
  code: string | null;
  title: string;
  slug: string;
  category: string | null;
  difficulty_level: string | null;
  is_published: boolean;
  total_clock_hours: string | null;
  total_estimated_hours: string | null;
  course_type: string;
  program_level: number | null;
  state_board_approved: boolean;
  pathway_name: string | null;
  created_at: string;
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const response = await fetch('/api/admin/lms-curriculum');
        if (!response.ok) throw new Error('Failed to fetch courses');
        const data = await response.json();
        setCourses(data.courses || data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCourses();
  }, []);

  return { courses, isLoading, error };
}
