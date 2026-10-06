'use client';

// Communication Preferences — My Profile tree. Rendered as a preference
// center; persistence lands with the salon's SMS system. NO fake success.
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';
import { CheckSquareRow } from '@/components/pawz/PortalCheckRow';

const PREFS = [
  { id: 'appt-email', label: 'Appointment reminders by email', default: true },
  { id: 'appt-sms', label: 'Appointment reminders by SMS', default: true },
  { id: 'promo', label: 'Promotions & offers', default: false },
  { id: 'newsletter', label: 'Newsletter', default: false },
];

export default function CommunicationPreferencesPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(PREFS.map((p) => [p.id, p.default])),
  );
  return (
    <PortalEmptyState
      icon={Bell}
      title="Communication Preferences"
      description="Choose how the salon reaches you."
    >
      <div className="mt-8 w-full max-w-md space-y-3 text-left">
        {PREFS.map((p) => (
          <CheckSquareRow
            key={p.id}
            label={p.label}
            checked={prefs[p.id]}
            onToggle={() => setPrefs((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
          />
        ))}
      </div>
      <p className="mt-6 text-[12px] leading-relaxed text-ink-soft">
        Preferences take effect with the salon&apos;s SMS system — email reminders are active today.
      </p>
    </PortalEmptyState>
  );
}
