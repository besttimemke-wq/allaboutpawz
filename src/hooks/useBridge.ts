import { useState, useEffect } from 'react';

export interface BridgeSyncLogRow {
  id: string;
  sync_type: string;
  sync_status: string;
  records_processed: number | null;
  records_succeeded: number | null;
  records_failed: number | null;
  started_by: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface CommerceSyncQueueRow {
  id: string;
  sync_direction: string;
  entity_type: string;
  entity_id: string | null;
  sync_status: string;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

export function useBridge() {
  const [syncLog, setSyncLog] = useState<BridgeSyncLogRow[]>([]);
  const [commerceQueue, setCommerceQueue] = useState<CommerceSyncQueueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBridge() {
      try {
        const response = await fetch('/api/admin/lms-bridge');
        if (!response.ok) throw new Error('Failed to fetch platform bridge log');
        const data = await response.json();
        setSyncLog(data.syncLog || []);
        setCommerceQueue(data.commerceQueue || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBridge();
  }, []);

  return { syncLog, commerceQueue, isLoading, error };
}
