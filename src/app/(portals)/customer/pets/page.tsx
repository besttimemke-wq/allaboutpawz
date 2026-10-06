'use client';

// ============================================================================
// Customer Portal — My Pets.
//
// The customer's own pet registry, wired to /api/customer/pets (Task 35-a):
// the SAME dogs records the booking flow offers as chips and the groomers
// see before every visit — one registry, no copies. Adding a pet here is a
// POST (name / breed / birthday / weight); the server derives the size tier
// and links the dog to the signed-in customer.
//
// Auth gating lives in the layout; a mid-visit 401 shows a sign-in card.
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
  ImagePlus,
  Loader2,
  PawPrint,
  Pencil,
  Plus,
  Scale,
  Syringe,
  Trash2,
  X,
} from 'lucide-react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  birthDate: string | null;
  weightLbs: string | number | null;
  size: string | null;
  photoUrl: string | null;
  vaccinationNotes?: string | null;
  vaccinationPhotoUrls?: string[];
}

/** A past visit for the history column (from /api/customer/appointments). */
interface HistoryBooking {
  id: string;
  dogId: string | null;
  date: string | null;
  time?: string | null;
  service: string | null;
  signalLabel?: string;
  status?: string;
}

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

const petWeight = (p: Pet): number | null => {
  const n = parseFloat(String(p.weightLbs ?? ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export default function CustomerPetsPage() {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  // Loading is DERIVED (pets !== resolved) — never set synchronously inside
  // an effect body (React 19 rule, same convention as booking-flow StepTime).
  const loading = pets === null && !unauthorized && !pageError;

  const load = useCallback(() => {
    fetch('/api/customer/pets')
      .then(async (r) => {
        if (r.status === 401) {
          setUnauthorized(true);
          return null;
        }
        if (!r.ok) {
          setPageError('Could not load your pets right now.');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setPets(Array.isArray(d.pets) ? d.pets : []);
        setPageError(null);
      })
      .catch(() => setPageError('Could not load your pets right now.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Add / Edit pet dialog (spec §8.3 — the same form both ways) ---------
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [form, setForm] = useState({ name: '', breedName: '', birthDate: '', weightLbs: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ---- Remove confirm (spec §8.3 Remove) -----------------------------------
  const [removingPet, setRemovingPet] = useState<Pet | null>(null);
  const [removing, setRemoving] = useState(false);

  const openAdd = () => {
    setEditingPet(null);
    setForm({ name: '', breedName: '', birthDate: '', weightLbs: '' });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (pet: Pet) => {
    setEditingPet(pet);
    setForm({
      name: pet.name || '',
      breedName: pet.breed || '',
      birthDate: pet.birthDate || '',
      weightLbs: pet.weightLbs != null ? String(pet.weightLbs) : '',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const submit = async () => {
    const name = form.name.trim();
    const breedName = form.breedName.trim();
    const weight = parseFloat(form.weightLbs);

    if (!name) {
      setFormError('Pet name is required.');
      return;
    }
    if (!breedName) {
      setFormError('Breed is required — "rescue mix" works too.');
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0 || weight > 300) {
      setFormError('Enter a weight in pounds (1–300).');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const editing = editingPet != null;
      const res = await fetch('/api/customer/pets', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editing ? { id: editingPet!.id } : {}),
          name,
          breedName,
          birthDate: form.birthDate || null,
          weightLbs: weight,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(d?.error || (editing ? 'Could not save these changes — please try again.' : 'Could not add this pet — please try again.'));
        return;
      }
      setDialogOpen(false);
      load();
    } catch {
      setFormError('Network problem — please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!removingPet) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/customer/pets?id=${encodeURIComponent(removingPet.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRemovingPet(null);
        load();
      }
    } catch {
      /* best-effort: the confirm dialog stays open on failure */
    } finally {
      setRemoving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Grooming history — the SAME bookings registry the appointments page reads,
  // grouped per dog so every pet card carries its visit history.
  // ---------------------------------------------------------------------------
  const [historyByDog, setHistoryByDog] = useState<Record<string, HistoryBooking[]>>({});

  useEffect(() => {
    fetch('/api/customer/appointments')
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const past: HistoryBooking[] = Array.isArray(d.past) ? d.past : [];
        const map: Record<string, HistoryBooking[]> = {};
        for (const b of past) {
          if (!b.dogId) continue;
          (map[b.dogId] ||= []).push(b);
        }
        for (const k of Object.keys(map)) {
          map[k].sort((x, y) => String(y.date ?? '').localeCompare(String(x.date ?? '')));
        }
        setHistoryByDog(map);
      })
      .catch(() => { /* history is supplementary — never blocks the page */ });
  }, []);

  // ---------------------------------------------------------------------------
  // Vaccination records — upload photos, remove a photo, save notes. Writes go
  // to the same dogs columns the admin CRM reads (one registry, no copies).
  // ---------------------------------------------------------------------------
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [vaxError, setVaxError] = useState<{ petId: string; message: string } | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingNotesFor, setSavingNotesFor] = useState<string | null>(null);

  const uploadVax = async (pet: Pet, files: File[]) => {
    setUploadingFor(pet.id);
    setVaxError(null);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('id', pet.id);
        const res = await fetch('/api/customer/pets/vaccinations', { method: 'POST', body: fd });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setVaxError({ petId: pet.id, message: d?.error || 'Upload failed — please try again.' });
          return;
        }
      }
      load();
    } catch {
      setVaxError({ petId: pet.id, message: 'Network problem — please try again.' });
    } finally {
      setUploadingFor(null);
    }
  };

  const removeVax = async (pet: Pet, url: string) => {
    setUploadingFor(pet.id);
    setVaxError(null);
    try {
      const res = await fetch(
        `/api/customer/pets/vaccinations?id=${encodeURIComponent(pet.id)}&url=${encodeURIComponent(url)}`,
        { method: 'DELETE' },
      );
      if (res.ok) load();
    } catch {
      /* best-effort — the card just keeps the photo */
    } finally {
      setUploadingFor(null);
    }
  };

  const saveNotes = async (pet: Pet) => {
    setSavingNotesFor(pet.id);
    setVaxError(null);
    try {
      const res = await fetch('/api/customer/pets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pet.id, vaccinationNotes: notesDraft[pet.id] ?? '' }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVaxError({ petId: pet.id, message: d?.error || 'Could not save notes — please try again.' });
        return;
      }
      load();
    } catch {
      setVaxError({ petId: pet.id, message: 'Network problem — please try again.' });
    } finally {
      setSavingNotesFor(null);
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
            Sign in to see your pets
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
            Your session has expired. Sign in again to manage your pup&apos;s
            records.
          </p>
          <Button
            asChild
            className="mt-5 h-10 rounded-lg bg-ink px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-white hover:bg-ink-soft"
          >
            <Link href="/access-customer">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const petList = pets ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 style={displayFont} className="text-[28px] leading-tight text-ink">
            My Pets
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            The salon&apos;s records for your family — groomers see these before
            every visit.
          </p>
        </div>
        {petList.length > 0 && (
          <Button
            onClick={openAdd}
            className="h-10 rounded-lg bg-ink px-4 text-[12px] font-bold text-white hover:bg-ink-soft"
          >
            <Plus className="size-3.5" />
            Add a pet
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : pageError ? (
        <div className="rounded-xl border border-ink/10 bg-white p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto size-7 text-gold-deep" />
          <p className="mt-3 text-[14px] font-medium text-ink">{pageError}</p>
          <Button
            variant="outline"
            onClick={() => {
              setPageError(null);
              load();
            }}
            className="mt-4 h-10 rounded-lg border-ink/20 text-[12px] font-semibold text-ink"
          >
            Try again
          </Button>
        </div>
      ) : petList.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-ink/10 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-cream">
            <PawPrint className="size-7 text-gold-deep" />
          </div>
          <h2 style={displayFont} className="mt-4 text-[20px] text-ink">
            No pets yet — add your first pup
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-soft">
            One record per pup. Add them once and the booking flow (and your
            groomer) will know exactly who&apos;s coming.
          </p>
          <Button
            onClick={openAdd}
            className="mt-5 h-11 rounded-lg bg-ink px-6 text-[12px] font-bold uppercase tracking-[0.12em] text-white hover:bg-ink-soft"
          >
            <Plus className="size-3.5" />
            Add your first pup
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {petList.map((pet) => {
            const weight = petWeight(pet);
            const birthday = prettyBirthday(pet.birthDate);
            const sizeChip = SIZE_LABEL[String(pet.size ?? '')] ?? null;
            const history = historyByDog[pet.id] ?? [];
            const vaxPhotos = pet.vaccinationPhotoUrls ?? [];
            const notesValue = notesDraft[pet.id] ?? pet.vaccinationNotes ?? '';
            const notesUnchanged = (notesDraft[pet.id] ?? '') === (pet.vaccinationNotes ?? '');

            return (
              <article
                key={pet.id}
                className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Header — identity + quick facts */}
                <div className="flex items-start gap-4 p-5">
                  {pet.photoUrl ? (
                    <img
                      src={pet.photoUrl}
                      alt={`${pet.name}, a ${pet.breed || 'dog'}`}
                      className="size-16 shrink-0 rounded-full border border-ink/10 object-cover"
                    />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-cream">
                      <PawPrint className="size-7 text-gold-deep" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 style={displayFont} className="truncate text-[19px] leading-tight text-ink">
                      {pet.name}
                    </h2>
                    <p className="mt-0.5 truncate text-[13px] text-ink-soft">
                      {pet.breed || 'Breed on file'}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {sizeChip && (
                        <span className="rounded-full border border-gold/40 bg-gold-light/20 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-gold-deep">
                          {sizeChip}
                        </span>
                      )}
                      {weight !== null && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-cream px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">
                          <Scale className="size-3" />
                          {weight} lbs
                        </span>
                      )}
                      {birthday && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-cream px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">
                          <Cake className="size-3" />
                          Born {birthday}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Edit | Remove — spec §8.3: the pet record is the
                      customer's own; writes go straight to the salon's
                      registry (the same dogs rows the CRM reads). */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(pet)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-gold-deep transition-colors hover:text-ink"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemovingPet(pet)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-red-600 transition-colors hover:text-red-700"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  </div>
                </div>

                {/* Records — the same fields the admin CRM carries for this
                    dog: vaccination photos + notes on one side, visit history
                    on the other. One registry, both sides of the counter. */}
                <div className="grid divide-y divide-ink/10 border-t border-ink/10 md:grid-cols-2 md:divide-x md:divide-y-0">
                  <section className="p-5" aria-label={`${pet.name} vaccination records`}>
                    <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                      <Syringe className="size-3.5 text-gold-deep" aria-hidden="true" />
                      Vaccination records
                      {vaxPhotos.length > 0 && (
                        <span className="rounded-full bg-cream px-1.5 py-0.5 text-[9.5px] font-semibold text-ink-soft">
                          {vaxPhotos.length}
                        </span>
                      )}
                    </h3>

                    {vaxPhotos.length > 0 ? (
                      <ul className="mt-3 grid grid-cols-3 gap-2">
                        {vaxPhotos.map((u) => (
                          <li key={u} className="relative">
                            <a href={u} target="_blank" rel="noreferrer" aria-label={`Open ${pet.name}'s vaccination record image`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={u}
                                alt={`${pet.name} vaccination record`}
                                className="h-20 w-full rounded-md border border-ink/10 object-cover transition-opacity hover:opacity-90"
                              />
                            </a>
                            <button
                              type="button"
                              onClick={() => removeVax(pet, u)}
                              disabled={uploadingFor === pet.id}
                              aria-label="Remove this vaccination record"
                              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-ink/70 text-white transition-colors hover:bg-red-600"
                            >
                              <X className="size-3" strokeWidth={2.5} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                        No vaccination photos on file yet. Upload rabies, DHPP, or
                        bordetella certificates so check-in is instant — your
                        groomer sees them before every visit.
                      </p>
                    )}

                    <label
                      className={`mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gold/50 bg-cream px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-gold-deep transition-colors hover:border-gold-deep hover:bg-gold-light/30 ${
                        uploadingFor === pet.id ? 'pointer-events-none opacity-60' : ''
                      }`}
                    >
                      {uploadingFor === pet.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="size-3.5" />
                      )}
                      {uploadingFor === pet.id ? 'Uploading…' : 'Upload records'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          e.target.value = '';
                          if (files.length > 0) uploadVax(pet, files);
                        }}
                      />
                    </label>

                    {vaxError?.petId === pet.id && (
                      <p className="mt-2 text-[11px] font-medium text-red-600">{vaxError.message}</p>
                    )}

                    <div className="mt-3">
                      <Label
                        htmlFor={`vax-notes-${pet.id}`}
                        className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft"
                      >
                        Vaccination notes
                      </Label>
                      <textarea
                        id={`vax-notes-${pet.id}`}
                        value={notesValue}
                        onChange={(e) => setNotesDraft((m) => ({ ...m, [pet.id]: e.target.value }))}
                        placeholder="e.g. Rabies due March 2027 — Dr. Nguyen, Pacific Vet"
                        rows={2}
                        className="mt-1 w-full rounded-md border border-ink/15 bg-white p-2 text-[12px] text-ink placeholder:text-ink-soft/60 focus:border-gold-deep focus:outline-none"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={notesUnchanged || savingNotesFor === pet.id}
                        onClick={() => saveNotes(pet)}
                        className="mt-1.5 h-8 rounded-md border-ink/20 px-3 text-[11px] font-semibold text-ink"
                      >
                        {savingNotesFor === pet.id && <Loader2 className="size-3 animate-spin" />}
                        Save notes
                      </Button>
                    </div>
                  </section>

                  <section className="p-5" aria-label={`${pet.name} grooming history`}>
                    <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                      <CalendarDays className="size-3.5 text-gold-deep" aria-hidden="true" />
                      Grooming history
                      {history.length > 0 && (
                        <span className="rounded-full bg-cream px-1.5 py-0.5 text-[9.5px] font-semibold text-ink-soft">
                          {history.length}
                        </span>
                      )}
                    </h3>

                    {history.length > 0 ? (
                      <ul className="mt-3 max-h-44 space-y-2.5 overflow-y-auto custom-scrollbar pr-1">
                        {history.map((b) => (
                          <li key={b.id} className="flex items-baseline justify-between gap-3 text-[12px]">
                            <span className="shrink-0 text-ink-soft">
                              {b.date || '—'}
                              {b.time ? ` · ${b.time}` : ''}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-right font-semibold text-ink">
                              {b.service || 'Groom'}
                            </span>
                            <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-soft/70">
                              {b.signalLabel || b.status || ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                        No visits yet — {pet.name}&apos;s completed grooms will appear
                        here.
                      </p>
                    )}

                    <Link
                      href="/customer/appointments"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gold-deep underline-offset-2 hover:underline"
                    >
                      View all appointments
                    </Link>
                  </section>
                </div>
              </article>
            );
          })}

          {/* Add-a-pet card */}
          <button
            type="button"
            onClick={openAdd}
            className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gold/50 bg-cream/50 p-5 text-center transition-colors hover:border-gold-deep hover:bg-cream"
          >
            <span className="flex size-10 items-center justify-center rounded-full border border-gold/40 bg-white">
              <Plus className="size-5 text-gold-deep" />
            </span>
            <span className="text-[13.5px] font-semibold text-ink">Add a pet</span>
            <span className="text-[12px] text-ink-soft">
              Name, breed, birthday, weight — that&apos;s it.
            </span>
          </button>
        </div>
      )}

      {/* ------------------- Add / Edit pet modal ------------------- */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o && !saving) setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={displayFont} className="text-[20px] text-ink">
              {editingPet ? `Edit ${editingPet.name}` : 'Add a pet'}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              {editingPet
                ? 'Changes save straight to the salon’s registry — your groomer sees the update before the next visit.'
                : 'One record per pup — groomers see this before every visit. The size tier (which sets pricing) comes from the weight.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="pet-name"
                className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
              >
                Pet&apos;s name
              </Label>
              <Input
                id="pet-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Bella"
                className="h-11 rounded-md border-ink/15 text-[13.5px] text-ink focus-visible:ring-gold-deep"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="pet-breed"
                className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
              >
                Breed
              </Label>
              <Input
                id="pet-breed"
                value={form.breedName}
                onChange={(e) => setForm((f) => ({ ...f, breedName: e.target.value }))}
                placeholder="Goldendoodle, Lab, rescue mix…"
                className="h-11 rounded-md border-ink/15 text-[13.5px] text-ink focus-visible:ring-gold-deep"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="pet-birthday"
                  className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
                >
                  Birthday{' '}
                  <span className="font-normal normal-case tracking-normal text-ink-soft/60">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="pet-birthday"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                  className="h-11 rounded-md border-ink/15 text-[13.5px] text-ink focus-visible:ring-gold-deep"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="pet-weight"
                  className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
                >
                  Weight (lbs)
                </Label>
                <Input
                  id="pet-weight"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="300"
                  step="0.5"
                  value={form.weightLbs}
                  onChange={(e) => setForm((f) => ({ ...f, weightLbs: e.target.value }))}
                  placeholder="28"
                  className="h-11 rounded-md border-ink/15 text-[13.5px] text-ink focus-visible:ring-gold-deep"
                />
              </div>
            </div>

            {formError && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-[12.5px] font-medium text-red-700">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="h-10 rounded-lg border-ink/20 text-[12px] font-semibold text-ink"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={saving}
              className="h-10 rounded-lg bg-ink text-[12px] font-bold text-white hover:bg-ink-soft"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {editingPet ? 'Save changes' : 'Add pet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------- Remove confirm (spec §8.3) ------------------- */}
      <AlertDialog
        open={removingPet != null}
        onOpenChange={(o) => { if (!o && !removing) setRemovingPet(null); }}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle style={displayFont} className="text-[19px] text-ink">
              Remove {removingPet?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed">
              This removes the salon&apos;s record for {removingPet?.name} — groomers
              will no longer see this profile. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={removing}
              className="h-10 rounded-lg border-ink/20 text-[12px] font-semibold text-ink"
            >
              Keep pet
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmRemove(); }}
              disabled={removing}
              className="h-10 rounded-lg bg-red-600 text-[12px] font-bold text-white hover:bg-red-700"
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
