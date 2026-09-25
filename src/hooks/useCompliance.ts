import { useState, useEffect } from 'react';

export interface ComplianceDocumentRow {
  id: string;
  document_type: string;
  document_name: string;
  document_url: string;
  issued_by: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  status: string;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  target_entity_type: string;
  target_entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useCompliance() {
  const [documents, setDocuments] = useState<ComplianceDocumentRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompliance() {
      try {
        const response = await fetch('/api/admin/lms-compliance');
        if (!response.ok) throw new Error('Failed to fetch compliance records');
        const data = await response.json();
        setDocuments(data.documents || []);
        setAuditLog(data.auditLog || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCompliance();
  }, []);

  return { documents, auditLog, isLoading, error };
}
