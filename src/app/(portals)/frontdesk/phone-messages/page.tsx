'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, PhoneCall, CheckCircle2 } from 'lucide-react';

// ============================================================================
// Front Desk — Phone Messages. The message pad: who called, what they need,
// whether it's handled. Every message the desk takes lives here until it is
// closed out — nothing falls through the cracks between shifts.
// ============================================================================

interface Msg {
  id: string;
  from: string;
  phone: string;
  note: string;
  time: string;
  done: boolean;
}

const INITIAL: Msg[] = [
  { id: 'm1', from: 'Garcia, A.', phone: '(214) 555-0118', note: 'Wants to reschedule Rocky to Thursday afternoon.', time: '9:42 AM', done: false },
  { id: 'm2', from: 'Patterson, K.', phone: '(469) 555-2231', note: 'Asking about nail trim pricing for a senior cat.', time: '10:15 AM', done: false },
  { id: 'm3', from: 'Unknown', phone: '(972) 555-8890', note: 'Hung up — sounded like a wrong number.', time: '11:03 AM', done: true },
];

export default function FrontDeskPhoneMessagesPage() {
  const [msgs, setMsgs] = useState<Msg[]>(INITIAL);

  const toggle = (id: string) =>
    setMsgs((m) => m.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));

  const add = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const from = String(fd.get('from') || '').trim();
    const phone = String(fd.get('phone') || '').trim();
    const note = String(fd.get('note') || '').trim();
    if (!from || !note) return;
    setMsgs((m) => [
      { id: `m${Date.now()}`, from, phone, note, time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), done: false },
      ...m,
    ]);
    e.currentTarget.reset();
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Phone Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {msgs.filter((m) => !m.done).length} open · {msgs.filter((m) => m.done).length} handled
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="size-4 text-muted-foreground" /> Message pad
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {msgs.map((m) => (
                <div key={m.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                  <div className="min-w-[200px] flex-1">
                    <p className={`text-[13px] font-medium ${m.done ? 'line-through text-muted-foreground' : ''}`}>
                      {m.from} <span className="text-muted-foreground font-normal">· {m.phone || 'no number'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.note}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.time}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toggle(m.id)}
                  >
                    {m.done ? (
                      <>
                        <CheckCircle2 className="size-3.5 mr-1 text-emerald-600" /> Reopen
                      </>
                    ) : (
                      'Mark handled'
                    )}
                  </Button>
                </div>
              ))}
              {msgs.length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-8 text-center">No messages yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" /> Take a message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="pm-from">Caller</Label>
                <Input id="pm-from" name="from" placeholder="Garcia, A." required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pm-phone">Phone</Label>
                <Input id="pm-phone" name="phone" type="tel" placeholder="(214) 555-0000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pm-note">Message</Label>
                <Input id="pm-note" name="note" placeholder="What do they need?" required />
              </div>
              <Button type="submit" size="sm" className="w-full">
                Save message
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
