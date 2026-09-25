import { useState, useEffect } from 'react';

export interface LmsDashboardStats {
  courses: number;
  enrollments: number;
  sessions: number;
  pathways: number;
  messages: number;
  ragChunks: number;
}

export function useLmsDashboard() {
  const [stats, setStats] = useState<LmsDashboardStats>({
    courses: 0,
    enrollments: 0,
    sessions: 0,
    pathways: 0,
    messages: 0,
    ragChunks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/admin/lms-dashboard');
        if (!response.ok) throw new Error('Failed to fetch LMS dashboard stats');
        const data = await response.json();
        setStats(
          data.stats || {
            courses: 0,
            enrollments: 0,
            sessions: 0,
            pathways: 0,
            messages: 0,
            ragChunks: 0,
          },
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return { stats, isLoading, error };
}
