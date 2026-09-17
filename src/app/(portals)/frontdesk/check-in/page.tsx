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
import { UserCheck, Search, Dog, Phone, CalendarPlus, CheckCircle2 } from 'lucide-react';

// ============================================================================
// Front Desk — Check-In / Walk-In. The intake surface: find an existing
// client's appointment and check them in, or create a walk-in intake.
// Walk-ins feed the same enrollCustomer() identity path as purchases and
// bookings — one email, one login.
// ============================================================================

const ARRIVALS = [
  { id: 'r1', time: '9:30 AM', petName: 'Rocky', owner: 'Priya K.', service: 'Bath Only', groomer: 'Dana R.' },
  { id: 'r2', time: '10:00 AM', petName: 'Luna', owner: 'Tom H.', service: 'Full Groom + Teeth', groomer: 'Dana R.' },
  { id: 'r3', time: '10:30 AM', petName: 'Mochi', owner: 'Ava P.', service: 'Bath & Tidy', groomer: 'Sarah M.' },
];

export default function FrontDeskCheckInPage() {
  const [checkedIn, setCheckedIn] = useState<string[]>([]);
  const [walkInSaved, setWalkInSaved] = useState(false);

  const checkIn = (id: string) => setCheckedIn((c) => [...c, id]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Check-In / Walk-In</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Intake for today&apos;s arrivals and unscheduled walk-ins.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expected arrivals */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="size-4 text-muted-foreground" /> Expected arrivals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {ARRIVALS.map((r) => {
              const done = checkedIn.includes(r.id);
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3.5 py-3"
                >
                  <div>
                    <p className="text-[13px] font-medium">
                      {r.petName} <span className="text-muted-foreground">· {r.owner}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.time} · {r.service} · {r.groomer}
                    </p>
                  </div>
                  {done ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="size-4" /> Checked in
                    </span>
                  ) : (
                    <Button size="sm" className="h-8 text-xs" onClick={() => checkIn(r.id)}>
                      Check In
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Walk-in intake */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Dog className="size-4 text-muted-foreground" /> Walk-in intake
            </CardTitle>
          </CardHeader>
          <CardContent>
            {walkInSaved ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="size-10 text-emerald-500" />
                <p className="text-[13px] font-medium">Walk-in created</p>
                <p className="text-xs text-muted-foreground max-w-[280px]">
                  The client record was created and a portal invite was sent to their email — one
                  login across bookings and orders.
                </p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setWalkInSaved(false)}>
                  Add another
                </Button>
              </div>
            ) : (
              <form
                className="space-y-3.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  setWalkInSaved(true);
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="wi-first">Owner first name</Label>
                    <Input id="wi-first" placeholder="Jamie" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wi-last">Last name</Label>
                    <Input id="wi-last" placeholder="Ortiz" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wi-email">Email</Label>
                  <Input id="wi-email" type="email" placeholder="jamie@example.com" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wi-phone">Phone</Label>
                  <Input id="wi-phone" type="tel" placeholder="(214) 555-0000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="wi-pet">Pet name</Label>
                    <Input id="wi-pet" placeholder="Peanut" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wi-breed">Breed</Label>
                    <Input id="wi-breed" placeholder="Corgi" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="submit" size="sm" className="h-9">
                    <CalendarPlus className="size-4 mr-1.5" /> Create walk-in
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-9">
                    <Phone className="size-4 mr-1.5" /> Take a phone message instead
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Search className="size-3.5" /> Tip: search the customer directory to link a walk-in to an
        existing client instead of creating a duplicate.
      </p>
    </div>
  );
}
