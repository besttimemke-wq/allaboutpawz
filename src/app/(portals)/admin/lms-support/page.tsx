'use client';
import { useRouter } from 'next/navigation';
import type { DawgNavSection } from '@/lib/types';

export default function LmssupportPage() {
  const router = useRouter();
  const navigate = (s: DawgNavSection) => router.push(`/admin/${s}`);
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Support</h1>
        <p className="text-[13px] text-muted-foreground mt-1">LMS admin — Support management.</p>
      </div>
      <div className="border border-border rounded-xl p-12 text-center">
        <p className="text-[14px] font-medium text-foreground">No data yet</p>
        <p className="text-[13px] text-muted-foreground mt-1">This module will be wired to the lms.support tables.</p>
      </div>
    </div>
  );
}
