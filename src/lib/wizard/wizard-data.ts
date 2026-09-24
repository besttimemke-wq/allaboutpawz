import { getResource } from "@/lib/site-data"
import type { WizardLookups } from "@/components/site/islands/booking-wizard-v2"

type Breed = { id: string; name: string; sizeCategory?: string; coatType?: string; akcGroup?: string }
type PricingPackage = { id: string; name: string; smallPrice?: string; mediumPrice?: string; largePrice?: string; xlargePrice?: string; description?: string | null }
type Groomer = { id: string; name: string; role: string; bio?: string; active?: boolean }

// ---------------------------------------------------------------------------
// Everything the booking wizard needs, fetched server-side. Shared by the
// two wizard routes — /book/appointment and /book/consultation. The book
// page itself (/book) is a pure marketing page and fetches nothing.
// ---------------------------------------------------------------------------

export async function getWizardData() {
  const [
    breeds, packages, staff,
    coatTypes, coatTextures, coatLengths, coatConditions, sheddingLevels,
    haircutStyles, clipLengths,
    bodyStyles, legStyles, faceStyles, headStyles, earStyles, tailStyles, feetStyles,
    sanitaryOptions, nailServices, pawPadServices, earServices, teethServices, desheddingServices, coatTechniques,
  ] = await Promise.all([
    getResource<Breed>("dog_breeds"),
    getResource<PricingPackage>("packages"),
    getResource<Groomer>("staff"),
    getResource("coat_types"),
    getResource("coat_textures"),
    getResource("coat_lengths"),
    getResource("coat_conditions"),
    getResource("shedding_levels"),
    getResource("haircut_styles"),
    getResource("clip_lengths"),
    getResource("body_styles"),
    getResource("leg_styles"),
    getResource("face_styles"),
    getResource("head_styles"),
    getResource("ear_styles"),
    getResource("tail_styles"),
    getResource("feet_styles"),
    getResource("sanitary_options"),
    getResource("nail_services"),
    getResource("paw_pad_services"),
    getResource("ear_services"),
    getResource("teeth_services"),
    getResource("deshedding_services"),
    getResource("coat_techniques"),
  ])

  // Map pricing packages → service cards (price uses mediumPrice as a single representative price).
  const bookableServices = (packages || []).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.mediumPrice || p.smallPrice || "—",
    durationMinutes: 120,
    description: p.description || undefined,
  }))

  const activeGroomers = (staff || []).filter((g) => g.active !== false && g.name)

  const lookups: WizardLookups = {
    coatTypes: norm(coatTypes),
    coatTextures: norm(coatTextures),
    coatLengths: norm(coatLengths),
    coatConditions: norm(coatConditions),
    sheddingLevels: norm(sheddingLevels),
    haircutStyles: norm(haircutStyles),
    clipLengths: norm(clipLengths),
    bodyStyles: norm(bodyStyles),
    legStyles: norm(legStyles),
    faceStyles: norm(faceStyles),
    headStyles: norm(headStyles),
    earStyles: norm(earStyles),
    tailStyles: norm(tailStyles),
    feetStyles: norm(feetStyles),
    sanitaryOptions: norm(sanitaryOptions),
    nailServices: norm(nailServices),
    pawPadServices: norm(pawPadServices),
    earServices: norm(earServices),
    teethServices: norm(teethServices),
    desheddingServices: norm(desheddingServices),
    coatTechniques: norm(coatTechniques),
  }

  return { breeds: breeds || [], services: bookableServices, groomers: activeGroomers, lookups }
}

// Normalize a Supabase/Prisma row → {id, name, ...rest}. Some lookup tables
// use `label` instead of `name`; fall back gracefully.
function norm(rows: any[] | null | undefined): { id: string; name: string; [k: string]: any }[] {
  if (!rows) return []
  return rows
    .filter((r) => r && (r.id || r.uuid) && (r.name || r.label || r.title))
    .map((r) => ({
      id: r.id || r.uuid,
      name: r.name || r.label || r.title,
      ...r,
    }))
}
