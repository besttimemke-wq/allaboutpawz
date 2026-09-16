'use client';
import { useAppStore } from '@/lib/store';
import { GroomingRecordsView } from '@/components/pawz/GroomingRecordsView';
export default function GroomerGroomingRecordsPage() {
  const { groomingRecords } = useAppStore();
  return <GroomingRecordsView records={groomingRecords} />;
}
