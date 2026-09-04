"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft, PawPrint, CalendarCheck, Scissors, Sparkle, Note, Dog as DogIcon,
} from "@phosphor-icons/react"

type Dog = {
  id: string; name: string; breedId: string | null; sex: string | null
  birthDate: string | null; weightLbs: string | null; color: string | null
  markings: string | null; customerId: string | null; createdAt: string
}
type GroomingProfile = {
  id: string; coatTypeId: string | null; coatTextureId: string | null
  coatLengthId: string | null; coatConditionId: string | null; sheddingLevel: string | null
  currentHaircutStyleId: string | null; currentBodyLengthId: string | null
  temperament: string | null; nailHandling: string | null; faceHandling: string | null
  feetHandling: string | null; earHandling: string | null; dryerHandling: string | null
  clipperHandling: string | null; handlingNotes: string | null; groomingNotes: string | null; ownerNotes: string | null
}
type Booking = { id: string; service: string; date: string; time: string; status: string; groomerId: string | null }

export default function DogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [dog, setDog] = useState<Dog | null>(null)
  const [profile, setProfile] = useState<GroomingProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [breeds, setBreeds] = useState<any[]>([])
  const [lookups, setLookups] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let alive = true
    Promise.all([
      fetch(`/api/cms/dogs/${id}`).then((r) => r.json()),
      fetch(`/api/cms/dog_grooming_profiles`).then((r) => r.json()).catch(() => []),
      fetch(`/api/cms/bookings`).then((r) => r.json()).catch(() => []),
      fetch(`/api/cms/dog_breeds`).then((r) => r.json()).catch(() => []),
      fetch(`/api/cms/coat_types`).then((r) => r.json()).catch(() => []),
      fetch(`/api/cms/coat_textures`).then((r) => r.json()).catch(() => []),
      fetch(`/api/cms/coat_lengths`).then((r) => r.json()).catch(() => []),
      fetch(`/api/cms/coat_conditions`).then((r) => r.json()).catch(() => []),
      fetch(`/api/cms/haircut_styles`).then((r) => r.json()).catch(() => []),
      fetch(`/api/cms/clip_lengths`).then((r) => r.json()).catch(() => []),
      fetch(`/api/cms/appointment_grooming_requests`).then((r) => r.json()).catch(() => []),
    ]).then(([d, profiles, allBookings, allBreeds, coatTypes, coatTextures, coatLengths, coatConditions, haircutStyles, clipLengths, groomingReqs]) => {
      if (!alive) return
      setDog(d)
      const dogProfile = (profiles as GroomingProfile[]).find((p) => p.dogId === id)
      setProfile(dogProfile || null)
      setBookings((allBookings as Booking[]).filter((b: any) => b.dogId === id))
      setBreeds(allBreeds)
      setLookups({ coat_types: coatTypes, coat_textures: coatTextures, coat_lengths: coatLengths, coat_conditions: coatConditions, haircut_styles: haircutStyles, clip_lengths: clipLengths })
    }).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [id])

  if (loading) return <div className="py-20 text-center text-zinc-400">Loading dog…</div>
  if (!dog) return notFound()

  const breed = breeds.find((b) => b.id === dog.breedId)
  const lookupName = (table: string, id: string | null) => {
    if (!id) return "—"
    const item = lookups[table]?.find((x) => x.id === id)
    return item?.name || "—"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={dog.customerId ? `/admin/customers/${dog.customerId}` : "/admin/customers"} className="flex items-center gap-1 text-[11px] font-bold tracking-[0.1em] text-zinc-400 hover:text-black">
          <ArrowLeft size={14} weight="bold" /> Back
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-black/10 pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Dog Profile</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-zinc-900">{dog.name}</h1>
        <p className="mt-1 text-[12px] text-zinc-400">
          {breed?.name || "Unknown breed"} {dog.sex ? `· ${dog.sex}` : ""} {dog.weightLbs ? `· ${dog.weightLbs} lbs` : ""}
        </p>
      </div>

      {/* Basic Info */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-black/10 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
            <DogIcon size={14} weight="fill" /> Basic Information
          </h3>
          <dl className="space-y-3 text-[13px]">
            <Row label="Breed" value={breed?.name || "—"} />
            {breed?.akcGroup && <Row label="AKC Group" value={breed.akcGroup} />}
            {breed?.sizeCategory && <Row label="Size Category" value={breed.sizeCategory} />}
            {breed?.coatType && <Row label="Typical Coat" value={breed.coatType} />}
            <Row label="Sex" value={dog.sex || "—"} />
            <Row label="Birth Date" value={dog.birthDate || "—"} />
            <Row label="Weight" value={dog.weightLbs ? `${dog.weightLbs} lbs` : "—"} />
            <Row label="Color" value={dog.color || "—"} />
            <Row label="Markings" value={dog.markings || "—"} />
            <Row label="Registered" value={new Date(dog.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
          </dl>
        </div>

        {/* Grooming Profile */}
        <div className="rounded-lg border border-black/10 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
            <Sparkle size={14} weight="fill" /> Coat & Grooming Profile
          </h3>
          {profile ? (
            <dl className="space-y-3 text-[13px]">
              <Row label="Coat Type" value={lookupName("coat_types", profile.coatTypeId)} />
              <Row label="Coat Texture" value={lookupName("coat_textures", profile.coatTextureId)} />
              <Row label="Coat Length" value={lookupName("coat_lengths", profile.coatLengthId)} />
              <Row label="Coat Condition" value={lookupName("coat_conditions", profile.coatConditionId)} />
              <Row label="Shedding Level" value={profile.sheddingLevel || "—"} />
              <Row label="Current Haircut" value={lookupName("haircut_styles", profile.currentHaircutStyleId)} />
              <Row label="Current Body Length" value={lookupName("clip_lengths", profile.currentBodyLengthId)} />
            </dl>
          ) : (
            <p className="py-6 text-center text-[12px] text-zinc-400">No grooming profile yet. It will be created when the owner books an appointment.</p>
          )}
        </div>

        {/* Handling Info */}
        <div className="rounded-lg border border-black/10 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
            <PawPrint size={14} weight="fill" /> Handling & Behavior
          </h3>
          {profile ? (
            <dl className="space-y-3 text-[13px]">
              <Row label="Temperament" value={profile.temperament || "—"} />
              <Row label="Nail Handling" value={profile.nailHandling || "—"} />
              <Row label="Face Handling" value={profile.faceHandling || "—"} />
              <Row label="Feet Handling" value={profile.feetHandling || "—"} />
              <Row label="Ear Handling" value={profile.earHandling || "—"} />
              <Row label="Dryer" value={profile.dryerHandling || "—"} />
              <Row label="Clippers" value={profile.clipperHandling || "—"} />
            </dl>
          ) : <p className="py-6 text-center text-[12px] text-zinc-400">No handling data yet.</p>}
        </div>

        {/* Notes */}
        <div className="rounded-lg border border-black/10 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
            <Note size={14} weight="fill" /> Notes
          </h3>
          {profile ? (
            <dl className="space-y-3 text-[13px]">
              {profile.handlingNotes && <Row label="Handling Notes" value={profile.handlingNotes} />}
              {profile.groomingNotes && <Row label="Grooming Notes" value={profile.groomingNotes} />}
              {profile.ownerNotes && <Row label="Owner Notes" value={profile.ownerNotes} />}
              {!profile.handlingNotes && !profile.groomingNotes && !profile.ownerNotes && <p className="py-6 text-center text-[12px] text-zinc-400">No notes yet.</p>}
            </dl>
          ) : <p className="py-6 text-center text-[12px] text-zinc-400">No notes yet.</p>}
        </div>
      </div>

      {/* Appointment History */}
      <div className="rounded-lg border border-black/10 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
          <CalendarCheck size={14} weight="fill" /> Appointment History ({bookings.length})
        </h3>
        {bookings.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-zinc-400">No appointments yet.</p>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between border-b border-black/5 pb-2 text-[12px]">
                <div>
                  <p className="font-semibold text-zinc-900">{b.service}</p>
                  <p className="text-zinc-400">{b.date} {b.time}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${b.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" : b.status === "COMPLETED" ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500"}`}>{b.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="text-right text-[13px] text-zinc-900">{value}</dd>
    </div>
  )
}
