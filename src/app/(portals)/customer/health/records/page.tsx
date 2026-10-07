'use client';

// ============================================================================
// Customer Portal — Health Records (My Pet Health tree).
//
// Each pet's health records in ONE place, wired to
// /api/customer/pets/records: the dog's vaccination-record PHOTOS (the same
// dogs.vaccinationPhotoUrls column the admin CRM reads), their COMPLETED
// grooms (the same bookings registry the appointments page reads), and a
// snapshot of the facts on file (breed, birthday + age, weight + size tier).
//
// Vaccination records are photos only — the salon verifies them at check-in.
// Uploads POST multipart to /api/customer/pets/vaccinations; removals confirm
// via AlertDialog then DELETE the single URL. Auth gating lives in the
// layout; a mid-visit 401 shows the sign-in card (same as My Pets).
//
// Design: salon tokens — cream surfaces, ink text, gold accents, white cards
// with border-ink/10. Playfair headings via inline var(--font-display) (the
// .pawz-theme scope forces Hanken on h1–h5, so a class alone is not enough
// inside the portal).
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Cake,
  CalendarDays,
  Dog as DogIcon,
  ImagePlus,
  Loader2,
  PawPrint,
  Scale,
  Scissors,
  Syringe,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Types — the /api/customer/pets/records contract
// ---------------------------------------------------------------------------
interface DogInfo {
  id: string;
  name: string;
  breedName: string | null;
  birthday: string | null;
  weightLbs: string | number | null;
  sizeTier: string | null;
  photoUrl: string | null;
}

interface GroomEntry {
  id: string;
  date: string | null;
  time: string | null;
  service: string | null;
  notes: string;
  totalCents: number;
}

interface PetRecord {
  dog: DogInfo;
  vaccinations: string[];
  grooms: GroomEntry[];
}

// ---------------------------------------------------------------------------
// Small helpers (the same conventions as the My Pets page)
// ---------------------------------------------------------------------------
const displayFont = { fontFamily: 'var(--font-display)' } as const;

const SIZE_LABEL: Record<string, string> = {
  SMALL: 'Small',
  MEDIUM: 'Medium',
  LARGE: 'Large',
  XLARGE: 'X-Large',
};

const prettyBirthday = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const prettyGroomDate = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** "3 yr 2 mo" / "7 months old" — the salon's age convention (the email
 *  senders compute age with the same math). */
const ageLabel = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const months = (Date.now() - d.getTime()) / (30.44 * 24 * 3600 * 1000);
  if (months < 0) return null;
  if (months < 12) return `${Math.max(0, Math.round(months))} months old`;
  const years = Math.floor(months / 12);
  const rem = Math.round(months % 12);
  return rem > 0 ? `${years} yr ${rem} mo` : `${years} years old`;
};

const petWeight = (d: DogInfo): number | null => {
  const n = parseFloat(String(d.weightLbs ?? ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** "$1,234.56" from cents — amounts always render from the API's data. */
const formatCents = (cents: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export default function HealthRecordsPage() {
  const [records, setRecords] = useState<PetRecord[] | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [activeDogId, setActiveDogId] = useState<string | null>(null);

  // Loading is DERIVED (records !== resolved) — never set synchronously inside
  // an effect body (React 19 rule, same convention as the My Pets page).
  const loading = records === null && !unauthorized && !pageError;

  const load = useCallback(() => {
    fetch('/api/customer/pets/records')
      .then(async (r) => {
        if (r.status === 401) {
          setUnauthorized(true);
          return null;
        }
        if (!r.ok) {
          setPageError('Could not load your records right now.');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        const list: PetRecord[] = Array.isArray(d.records) ? d.records : [];
        setRecords(list);
        // Keep the selected pup selected across refreshes (uploads/removals);
        // fall back to the first pet when the selection is gone.
        setActiveDogId((cur) =>
          cur && list.some((r) => r.dog.id === cur) ? cur : (list[0]?.dog.id ?? null),
        );
        setPageError(null);
      })
      .catch(() => setPageError('Could not load your records right now.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Vaccination records: upload / remove (same routes as My Pets) -----
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ dogId: string; message: string } | null>(null);

  const uploadVax = async (rec: PetRecord, file: File) => {
    if (!/^image\//.test(file.type || '')) {
      setActionError({ dogId: rec.dog.id, message: 'Vaccination records must be image files.' });
      return;
    }
    setUploadingFor(rec.dog.id);
    setActionError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('id', rec.dog.id);
      const res = await fetch('/api/customer/pets/vaccinations', { method: 'POST', body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError({ dogId: rec.dog.id, message: d?.error || 'Upload failed — please try again.' });
        return;
      }
      load();
    } catch {
      setActionError({ dogId: rec.dog.id, message: 'Network problem — please try again.' });
    } finally {
      setUploadingFor(null);
    }
  };

  // ---- Remove confirm (AlertDialog) + full-photo viewer (Dialog) ----------
  const [deleting, setDeleting] = useState<{ dogId: string; url: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const confirmRemove = async () => {
    if (!deleting) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      const res = await fetch(
        `/api/customer/pets/vaccinations?id=${encodeURIComponent(deleting.dogId)}&url=${encodeURIComponent(deleting.url)}`,
        { method: 'DELETE' },
      );
      if (res.ok) {
        setDeleting(null);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        setRemoveError(d?.error || 'Could not remove the record — please try again.');
      }
    } catch {
      setRemoveError('Network problem — please try again.');
    } finally {
      setRemoving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 401 — session expired mid-visit (the layout gate normally handles this)
  // ---------------------------------------------------------------------------
  if (unauthorized) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6 md:p-8">
        <div className="rounded-xl border border-ink/10 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-cream">
            <PawPrint className="size-7 text-gold-deep" />
          </div>
          <h1 style={displayFont} className="mt-4 text-[24px] text-ink">
            Sign in to see your pet&apos;s health records
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
            Your session has expired. Sign in again to see vaccination records,
            completed grooms, and every pup&apos;s snapshot.
          </p>
          <Button
            asChild
            className="mt-5 h-11 rounded-lg bg-ink px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-white hover:bg-ink-soft"
          >
            <Link href="/access-customer">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const recordList = records ?? [];
  // The pet whose records are on screen (the selector switches; a single pet
  // renders directly with no selector).
  const active = recordList.find((r) => r.dog.id === activeDogId) ?? recordList[0] ?? null;
  const deletingDogName =
    recordList.find((r) => r.dog.id === deleting?.dogId)?.dog.name ?? 'your pet';
  const viewerDogName =
    recordList.find((r) => r.vaccinations.some((u) => u === viewerUrl))?.dog.name ?? 'your pet';

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-8">
      {/* Page header */}
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-gold-deep">
          My Pet Health
        </p>
        <h1 style={displayFont} className="mt-1.5 text-[28px] leading-tight text-ink">
          Health Records
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Every pup&apos;s story in one place — vaccination records, completed
          grooms, and the facts on file.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="flex gap-2">
            <Skeleton className="h-11 w-36 rounded-full" />
            <Skeleton className="h-11 w-36 rounded-full" />
          </div>
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : pageError ? (
        /* Error banner with retry */
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-red-600" aria-hidden="true" />
            <p className="text-[13px] leading-relaxed text-red-800">{pageError}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setPageError(null);
              setRecords(null);
              load();
            }}
            className="h-11 rounded-lg border-red-300 bg-white text-[12px] font-semibold text-red-700 hover:bg-red-50"
          >
            Try again
          </Button>
        </div>
      ) : recordList.length === 0 ? (
        /* No pets yet — the records live with the pets */
        <div className="rounded-xl border border-ink/10 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-cream">
            <PawPrint className="size-7 text-gold-deep" />
          </div>
          <h2 style={displayFont} className="mt-4 text-[20px] text-ink">
            No health records yet — add your first pup
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-soft">
            One record per pup. Add a pet and their vaccination records, completed
            grooms, and snapshot will live here.
          </p>
          <Button
            asChild
            className="mt-5 h-11 rounded-lg bg-ink px-6 text-[12px] font-bold uppercase tracking-[0.12em] text-white hover:bg-ink-soft"
          >
            <Link href="/customer/pets">Add a pet</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Pet selector — chips with name + photo (multi-pet only) */}
          {recordList.length > 1 && (
            <div role="tablist" aria-label="Choose a pet" className="flex flex-wrap gap-2">
              {recordList.map((r) => {
                const isActive = r.dog.id === active?.dog.id;
                const total = r.vaccinations.length + r.grooms.length;
                return (
                  <button
                    key={r.dog.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveDogId(r.dog.id)}
                    className={cn(
                      'inline-flex h-11 items-center gap-2.5 rounded-full border px-4 text-[13px] font-semibold transition-colors',
                      isActive
                        ? 'border-ink bg-ink text-white'
                        : 'border-ink/15 bg-white text-ink hover:border-gold-deep hover:text-gold-deep',
                    )}
                  >
                    {r.dog.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.dog.photoUrl}
                        alt=""
                        className="size-6 rounded-full border border-ink/10 object-cover"
                      />
                    ) : (
                      <PawPrint
                        className={cn('size-4', isActive ? 'text-gold' : 'text-gold-deep')}
                        aria-hidden="true"
                      />
                    )}
                    <span className="max-w-32 truncate">{r.dog.name}</span>
                    {total > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                          isActive ? 'bg-white/15 text-white' : 'bg-cream text-ink-soft',
                        )}
                      >
                        {total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {active && (
            <div className="space-y-4">
              {/* Pet identity strip — whose records are on screen */}
              <div className="flex items-center gap-4 rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
                {active.dog.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={active.dog.photoUrl}
                    alt={`${active.dog.name}, a ${active.dog.breedName || 'dog'}`}
                    className="size-14 shrink-0 rounded-full border border-ink/10 object-cover"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-cream">
                    <PawPrint className="size-6 text-gold-deep" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 style={displayFont} className="truncate text-[19px] leading-tight text-ink">
                    {active.dog.name}&apos;s records
                  </h2>
                  <p className="mt-0.5 truncate text-[13px] text-ink-soft">
                    {active.dog.breedName || 'Breed on file'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-ink/10 bg-cream px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">
                      {active.vaccinations.length}{' '}
                      {active.vaccinations.length === 1 ? 'record photo' : 'record photos'}
                    </span>
                    <span className="rounded-full border border-ink/10 bg-cream px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">
                      {active.grooms.length}{' '}
                      {active.grooms.length === 1 ? 'completed groom' : 'completed grooms'}
                    </span>
                  </div>
                </div>
              </div>

              {/* (a) Vaccination records — photo gallery + upload tile */}
              <section
                aria-label={`${active.dog.name} vaccination records`}
                className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                    <Syringe className="size-3.5 text-gold-deep" aria-hidden="true" />
                    Vaccination records
                    {active.vaccinations.length > 0 && (
                      <span className="rounded-full bg-cream px-1.5 py-0.5 text-[9.5px] font-semibold text-ink-soft">
                        {active.vaccinations.length}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] italic text-ink-soft/80">
                    Photos only — the salon verifies at check-in.
                  </p>
                </div>

                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {active.vaccinations.map((u) => (
                    <li key={u} className="relative">
                      <button
                        type="button"
                        onClick={() => setViewerUrl(u)}
                        aria-label={`View ${active.dog.name}'s vaccination record photo`}
                        className="block w-full overflow-hidden rounded-md border border-ink/10 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={u}
                          alt={`${active.dog.name} vaccination record photo`}
                          className="h-24 w-full bg-cream-deep/40 object-cover sm:h-28"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting({ dogId: active.dog.id, url: u })}
                        disabled={uploadingFor === active.dog.id}
                        aria-label={`Remove ${active.dog.name}'s vaccination record photo`}
                        className="absolute right-1.5 top-1.5 z-10 flex size-8 items-center justify-center rounded-full bg-ink/70 text-white transition-colors hover:bg-red-600 after:absolute after:-inset-2 after:content-['']"
                      >
                        <Trash2 className="size-3.5" strokeWidth={2.5} />
                      </button>
                    </li>
                  ))}

                  {/* Upload tile — dashed, images only */}
                  <li>
                    <label
                      className={cn(
                        'flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gold/50 bg-cream/50 text-center transition-colors hover:border-gold-deep hover:bg-cream sm:h-28',
                        uploadingFor === active.dog.id && 'pointer-events-none opacity-60',
                      )}
                    >
                      {uploadingFor === active.dog.id ? (
                        <Loader2 className="size-5 animate-spin text-gold-deep" aria-hidden="true" />
                      ) : (
                        <ImagePlus className="size-5 text-gold-deep" aria-hidden="true" />
                      )}
                      <span className="px-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-gold-deep">
                        {uploadingFor === active.dog.id ? 'Uploading…' : 'Upload record photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        aria-label={`Upload a vaccination record photo for ${active.dog.name}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          e.target.value = '';
                          if (file) uploadVax(active, file);
                        }}
                      />
                    </label>
                  </li>
                </ul>

                {active.vaccinations.length === 0 && (
                  <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
                    No vaccination photos on file yet. Upload rabies, DHPP, or bordetella
                    certificates so check-in is instant — your groomer sees them before
                    every visit.
                  </p>
                )}

                {actionError?.dogId === active.dog.id && (
                  <p className="mt-2 text-[11.5px] font-medium text-red-600" role="alert">
                    {actionError.message}
                  </p>
                )}
              </section>

              {/* (b) Grooming history — completed appointments, newest first */}
              <section
                aria-label={`${active.dog.name} grooming history`}
                className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm"
              >
                <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                  <Scissors className="size-3.5 text-gold-deep" aria-hidden="true" />
                  Grooming history
                  {active.grooms.length > 0 && (
                    <span className="rounded-full bg-cream px-1.5 py-0.5 text-[9.5px] font-semibold text-ink-soft">
                      {active.grooms.length}
                    </span>
                  )}
                </h3>

                {active.grooms.length > 0 ? (
                  <ul className="mt-4 divide-y divide-ink/5">
                    {active.grooms.map((g) => (
                      <li key={g.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-ink">
                              {g.service || 'Groom'}
                            </p>
                            <p className="mt-0.5 text-[12px] text-ink-soft">
                              {prettyGroomDate(g.date) || '—'}
                              {g.time ? ` · ${g.time}` : ''}
                            </p>
                          </div>
                          {g.totalCents > 0 && (
                            <p className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                              {formatCents(g.totalCents)}
                            </p>
                          )}
                        </div>
                        {g.notes && (
                          <p className="mt-1.5 text-[11.5px] italic leading-relaxed text-ink-soft">
                            {g.notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4 rounded-lg bg-cream/60 p-5 text-center">
                    <CalendarDays
                      className="mx-auto size-5 text-gold-deep"
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-[13px] font-medium text-ink">
                      No completed grooms yet — book your first visit.
                    </p>
                    <Button
                      asChild
                      className="mt-3 h-11 rounded-lg bg-ink px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-white hover:bg-ink-soft"
                    >
                      <Link href="/book/appointment">Book an appointment</Link>
                    </Button>
                  </div>
                )}
              </section>

              {/* (c) Pet snapshot — the facts on file */}
              <section
                aria-label={`${active.dog.name} snapshot`}
                className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm"
              >
                <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                  <DogIcon className="size-3.5 text-gold-deep" aria-hidden="true" />
                  Pet snapshot
                </h3>

                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-cream/60 p-3.5">
                    <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                      <DogIcon className="size-3 text-gold-deep" aria-hidden="true" />
                      Breed
                    </dt>
                    <dd className="mt-1 text-[13.5px] font-medium text-ink">
                      {active.dog.breedName || 'On file at the salon'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-cream/60 p-3.5">
                    <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                      <Cake className="size-3 text-gold-deep" aria-hidden="true" />
                      Birthday
                    </dt>
                    <dd className="mt-1 text-[13.5px] font-medium text-ink">
                      {prettyBirthday(active.dog.birthday) || 'Not on file'}
                      {ageLabel(active.dog.birthday) && (
                        <span className="ml-1.5 text-[11.5px] font-normal text-ink-soft">
                          ({ageLabel(active.dog.birthday)})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-cream/60 p-3.5">
                    <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                      <Scale className="size-3 text-gold-deep" aria-hidden="true" />
                      Weight
                    </dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-1.5 text-[13.5px] font-medium text-ink">
                      {petWeight(active.dog) !== null ? (
                        <>
                          {petWeight(active.dog)} lbs
                          {SIZE_LABEL[String(active.dog.sizeTier ?? '')] && (
                            <span className="rounded-full border border-gold/40 bg-gold-light/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-deep">
                              {SIZE_LABEL[String(active.dog.sizeTier)]}
                            </span>
                          )}
                        </>
                      ) : (
                        'Not on file'
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          )}
        </>
      )}

      {/* ------------------- Full photo viewer ------------------- */}
      <Dialog open={viewerUrl != null} onOpenChange={(o) => { if (!o) setViewerUrl(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle style={displayFont} className="text-[20px] text-ink">
              Vaccination record — {viewerDogName}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              The photo on file with the salon. The seller verifies records at
              check-in.
            </DialogDescription>
          </DialogHeader>
          {viewerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viewerUrl}
              alt={`${viewerDogName} vaccination record photo`}
              className="max-h-[70vh] w-full rounded-lg border border-ink/10 bg-cream-deep/40 object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------- Remove record confirm ------------------- */}
      <AlertDialog
        open={deleting != null}
        onOpenChange={(o) => { if (!o && !removing) { setDeleting(null); setRemoveError(null); } }}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle style={displayFont} className="text-[19px] text-ink">
              Remove this record photo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed">
              This removes the photo from {deletingDogName}&apos;s vaccination records —
              the salon will no longer see it at check-in. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removeError && (
            <p className="text-[12px] font-medium text-red-600" role="alert">
              {removeError}
            </p>
          )}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={removing}
              className="h-11 rounded-lg border-ink/20 text-[12px] font-semibold text-ink"
            >
              Keep photo
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmRemove(); }}
              disabled={removing}
              className="h-11 rounded-lg bg-red-600 text-[12px] font-bold text-white hover:bg-red-700"
            >
              {removing && <Loader2 className="size-3.5 animate-spin" />}
              Yes, remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
