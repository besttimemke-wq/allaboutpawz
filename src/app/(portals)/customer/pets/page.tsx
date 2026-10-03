'use client';

import { useCustomerAccount } from '@/hooks/useQueries';
import { PawPrint, Plus, Dog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function CustomerPetsPage() {
  const { data, isLoading: loading } = useCustomerAccount();
  const pets = data?.pets ?? data?.customer?.pets ?? [];

  if (loading) return <div className="p-8 text-[13px] text-muted-foreground">Loading your pets…</div>;

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-6 bg-background p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Pets</h1>
          <p className="text-[13px] text-muted-foreground mt-1">View your pet profiles and grooming history.</p>
        </div>
      </div>

      {pets.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <PawPrint className="size-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-[14px] font-medium text-foreground">No pets yet</p>
          <p className="text-[13px] text-muted-foreground mt-1">Your pets will appear here once you book a grooming appointment.</p>
          <Button asChild className="mt-4">
            <a href="/book">Book a grooming</a>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pets.map((pet) => (
            <div key={pet.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                  <Dog className="size-6" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-foreground">{pet.name || '—'}</p>
                  <p className="text-[12px] text-muted-foreground">{pet.breed || pet.species || '—'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {pet.special_handling && <Badge variant="secondary" className="text-[10px]">Special Handling</Badge>}
                {pet.senior && <Badge variant="secondary" className="text-[10px]">Senior</Badge>}
                {pet.puppy && <Badge variant="secondary" className="text-[10px]">Puppy</Badge>}
                {pet.aggressive && <Badge variant="destructive" className="text-[10px]">Aggressive</Badge>}
                {pet.nervous && <Badge variant="secondary" className="text-[10px]">Nervous</Badge>}
                {pet.medical_alert && <Badge variant="destructive" className="text-[10px]">Medical Alert</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
