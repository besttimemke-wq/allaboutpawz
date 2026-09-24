'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface NotificationRow {
  id: string;
  notification_type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  action_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface TimelineMessage {
  id: string;
  text: string;
  from: 'salon' | 'customer';
  at: string;
  type?: string;
}

const TYPE_LABEL: Record<string, string> = {
  booking_cancellation: 'Appointment cancelled',
  message: 'Message',
};

export default function CustomerMessagesPage() {
  const { currentUser } = useAppStore();
  const [messages, setMessages] = useState<TimelineMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load the customer's messages from Supabase (user_notifications —
  // cancellation notices, system events, and chat both directions).
  useEffect(() => {
    fetch('/api/customer/notifications')
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => {
        const rows: NotificationRow[] = d.notifications || [];
        setMessages(
          rows
            .slice()
            .reverse()
            .map((n) => ({
              id: n.id,
              text: n.body || n.title,
              from: n.metadata?.from === 'customer' ? 'customer' : 'salon',
              at: n.created_at,
              type: n.notification_type,
            })),
        );
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/customer/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: `local-${Date.now()}`, text, from: 'customer', at: new Date().toISOString(), type: 'message' },
        ]);
        setDraft('');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 bg-background p-6 md:p-8">
      <div>
        <h1 className="font-bar text-2xl font-semibold tracking-tight text-foreground">
          Messages
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Chat with the salon concierge about appointments, billing, and pet care.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        {/* Chat header */}
        <div className="bg-muted/40 border-b border-border px-4 py-3 flex items-center gap-3">
          <div className="size-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
            <MessageSquare className="size-4" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">Salon Concierge</p>
            <p className="text-[11px] text-success">Online</p>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <div className="flex justify-start">
            <div className="max-w-[70%] bg-muted rounded-lg px-4 py-2.5 text-[13px] text-foreground">
              Hi {currentUser?.name?.split(' ')[0] || 'there'}! Welcome to All About Pawz. How can we help you today?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[70%] bg-muted rounded-lg px-4 py-2.5 text-[13px] text-foreground">
              You can ask about appointments, pricing, your pet&apos;s grooming history, or billing questions.
            </div>
          </div>

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[70%] bg-muted rounded-lg px-4 py-2.5 text-[13px] text-muted-foreground">
                Loading your messages…
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn('flex', m.from === 'customer' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[70%] rounded-lg px-4 py-2.5 text-[13px]',
                  m.from === 'customer'
                    ? 'bg-primary text-primary-foreground'
                    : m.type && m.type !== 'message'
                      ? 'bg-warning/10 text-foreground border border-warning/20'
                      : 'bg-muted text-foreground',
                )}
              >
                {m.type && m.type !== 'message' && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-warning mb-1">
                    {TYPE_LABEL[m.type] || m.type}
                  </p>
                )}
                <p>{m.text}</p>
                <p className={cn('text-[10px] mt-1 tabular-nums', m.from === 'customer' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {m.at ? new Date(m.at).toLocaleString() : ''}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border p-3 flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder="Type a message..."
            className="flex-1 h-9 bg-background border border-input rounded-md px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="inline-flex items-center justify-center size-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
