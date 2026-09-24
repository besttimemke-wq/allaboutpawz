'use client';
import { useState, useEffect } from 'react';
import { GroomingRecordsView } from '@/components/pawz/GroomingRecordsView';
import { GroomingRecord } from '@/lib/types';

export default function GroomingRecordsPage() {
  const [records, setRecords] = useState<GroomingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/crm/grooming-records?limit=200')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.records) {
          setRecords(data.records.map((r: any) => ({
            id: r.id, petName: r.petName, breed: r.breed, petEmoji: r.petEmoji || '🐶',
            date: r.date, serviceName: r.serviceName, groomer: r.groomer,
            amount: r.amount, status: r.status, cutDetails: r.cutDetails, coatCondition: r.coatCondition,
          } as GroomingRecord)));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-[13px] text-muted-foreground">Loading grooming records…</div>;

  return <GroomingRecordsView records={records} />;
}
