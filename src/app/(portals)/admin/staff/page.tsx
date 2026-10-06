'use client';
import { useAppStore } from '@/lib/store';
import { StaffView } from '@/components/pawz/StaffView';
export default function StaffPage() {
  const { staffSchedules } = useAppStore();
  return <StaffView staffList={staffSchedules} />;
}
