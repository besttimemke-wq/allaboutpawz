import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";

// GET /api/dogs - List dogs, optionally filtered by customerId
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    const dogs = await repo.list("dogs").catch(() => []);
    if (customerId) {
      const filtered = dogs.filter((d: any) => d.customerId === customerId);
      return NextResponse.json({ dogs: filtered });
    }
    return NextResponse.json({ dogs });
  } catch (error: any) {
    console.error("[api/dogs GET]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch dogs" }, { status: 500 });
  }
}

// POST /api/dogs - Create or update a dog record in Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      customerId,
      name,
      breed,
      breedName,
      size,
      weight,
      weightLbs,
      age,
      sex,
      birthDate,
      color,
      markings,
      coatType,
      notes,
      specialHandling,
      photoUrl,
    } = body;

    if (id) {
      const updated = await repo.update("dogs", id, {
        ...(customerId && { customerId }),
        ...(name && { name }),
        ...(breed && { breed }),
        ...(breedName && { breedName }),
        ...(size && { size }),
        ...(weight && { weight }),
        ...(weightLbs && { weightLbs }),
        ...(age && { age }),
        ...(sex && { sex }),
        ...(birthDate && { birthDate }),
        ...(color && { color }),
        ...(markings && { markings }),
        ...(coatType && { coatType }),
        ...(notes !== undefined && { notes }),
        ...(specialHandling !== undefined && { specialHandling }),
        ...(photoUrl && { photoUrl }),
      });
      return NextResponse.json(updated);
    }

    if (!name) {
      return NextResponse.json({ error: "Pet name is required" }, { status: 400 });
    }

    const created = await repo.create("dogs", {
      customerId: customerId || null,
      name,
      breed: breed || breedName || "Mixed Breed",
      breedName: breedName || breed || "Mixed Breed",
      size: size || "MEDIUM",
      weight: weight || weightLbs || "25 lbs",
      weightLbs: weightLbs || weight || "25",
      age: age || "2 yrs",
      sex: sex || "Unknown",
      birthDate: birthDate || null,
      color: color || "",
      markings: markings || "",
      coatType: coatType || "Short",
      notes: notes || "",
      specialHandling: specialHandling || "",
      photoUrl: photoUrl || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("[api/dogs POST]", error);
    return NextResponse.json({ error: error.message || "Failed to save dog" }, { status: 500 });
  }
}
