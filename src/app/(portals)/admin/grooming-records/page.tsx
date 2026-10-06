'use client';
import { useAppStore } from '@/lib/store';
import { GroomingRecordsView } from '@/components/pawz/GroomingRecordsView';
export default function GroomingRecordsPage() {
  const { groomingRecords } = useAppStore();
  return <GroomingRecordsView records={groomingRecords} />;
}
