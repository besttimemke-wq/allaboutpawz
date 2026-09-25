import { useState, useEffect } from 'react';

export interface EscalationRow {
  id: string;
  session_id: string | null;
  learner_user_id: string;
  learner_name: string | null;
  escalation_type: string;
  priority: string;
  assigned_to: string | null;
  assigned_role: string | null;
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string | null;
}

export interface NavigatorCaseloadRow {
  id: string;
  navigator_user_id: string;
  learner_user_id: string;
  learner_name: string | null;
  assigned_at: string | null;
  status: string;
  closed_at: string | null;
  closed_reason: string | null;
}

export function useSupport() {
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [caseloads, setCaseloads] = useState<NavigatorCaseloadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSupport() {
      try {
        const response = await fetch('/api/admin/lms-support');
        if (!response.ok) throw new Error('Failed to fetch support queue');
        const data = await response.json();
        setEscalations(data.escalations || []);
        setCaseloads(data.caseloads || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSupport();
  }, []);

  return { escalations, caseloads, isLoading, error };
}
