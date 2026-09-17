'use client';
import { useAppStore } from '@/lib/store';
import { StaffView } from '@/components/pawz/StaffView';
export default function SchedulePage() {
  const { staffSchedules } = useAppStore();
  return <StaffView staffList={staffSchedules} />;
}
