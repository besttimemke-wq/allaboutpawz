'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Download, ShieldCheck } from 'lucide-react';

// ============================================================================
// Learning Center — Certificates. The credentials this account has earned
// (safety certifications, grooming modules). Certifications the salon
// displays to clients are marked verified.
// ============================================================================

interface Certificate {
  id: string;
  title: string;
  course: string;
  issuedOn: string;
  credentialId: string;
  verified: boolean;
}

const CERTS: Certificate[] = [
  { id: 'ct1', title: 'Safe Handling Certification', course: 'Safe Handling & Bite Prevention', issuedOn: 'Apr 22, 2025', credentialId: 'AAP-SH-2025-0422', verified: true },
  { id: 'ct2', title: 'Bathing & Drying Certificate', course: 'Bathing & Drying Fundamentals', issuedOn: 'Apr 28, 2025', credentialId: 'AAP-BD-2025-0428', verified: false },
];

export default function CertificatesPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Credentials earned through the Aapawz Academy.
        </p>
      </div>

      {CERTS.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No certificates yet — complete a course that issues one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CERTS.map((c) => (
            <Card key={c.id} className="border-border/60">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Award className="size-6 text-amber-500" />
                  {c.verified && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">
                      <ShieldCheck className="size-3 mr-1" /> Verified
                    </Badge>
                  )}
                </div>
                <p className="text-[13px] font-semibold leading-snug">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {c.course}
                  <br />
                  Issued {c.issuedOn} · ID {c.credentialId}
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="size-4 mr-1.5" /> Download PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
