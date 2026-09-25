import { useState, useEffect } from 'react';

export interface ArtifactSubmissionRow {
  id: string;
  learner_user_id: string;
  learner_name: string | null;
  assignment_id: string;
  assignment_title: string | null;
  enrollment_id: string | null;
  course_id: string | null;
  course_title: string | null;
  status: string;
  submitted_at: string | null;
  is_late: boolean | null;
}

export interface GradeBookRow {
  id: string;
  learner_user_id: string;
  course_id: string;
  course_title: string | null;
  category: string;
  item_name: string;
  score: string | null;
  max_score: string | null;
  weight: string | null;
  is_ai_graded: boolean | null;
  is_released: boolean | null;
  created_at: string | null;
}

export interface QuizAttemptRow {
  id: string;
  learner_user_id: string;
  quiz_id: string;
  enrollment_id: string | null;
  attempt_number: number | null;
  started_at: string | null;
  submitted_at: string | null;
  score: string | null;
  max_score: string | null;
  percentage: string | null;
  is_passed: boolean | null;
  status: string;
}

export function useAssessments() {
  const [submissions, setSubmissions] = useState<ArtifactSubmissionRow[]>([]);
  const [gradeBook, setGradeBook] = useState<GradeBookRow[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAssessments() {
      try {
        const response = await fetch('/api/admin/lms-assessment');
        if (!response.ok) throw new Error('Failed to fetch assessments');
        const data = await response.json();
        setSubmissions(data.submissions || []);
        setGradeBook(data.gradeBook || []);
        setQuizAttempts(data.quizAttempts || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssessments();
  }, []);

  return { submissions, gradeBook, quizAttempts, isLoading, error };
}
