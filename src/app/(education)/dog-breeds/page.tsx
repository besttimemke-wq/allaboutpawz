import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/seopages/Footer';
import { TopNav } from '@/components/seopages/TopNav';
import { GUIDES_DIRECTORY } from '@/lib/seopages/taxonomy-data';

const dogBreedGuides = GUIDES_DIRECTORY
  .flatMap((pillar) => pillar.subcategories)
  .filter((subcategory) => subcategory.name.startsWith('Dog Breed Grooming'))
  .flatMap((subcategory) => subcategory.items);

export const metadata: Metadata = {
  title: 'Dog Grooming Guides by Breed | All About Pawz',
  description: 'Choose your dog’s breed to find grooming guidance for coat care, brushing, bathing, and maintenance.',
  alternates: {
    canonical: 'https://www.aapawz.com/dog-breeds',
  },
};

export default function DogBreedsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-stone-900">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 border-b border-stone-200 pb-7">
          <p className="mb-2 text-xs font-bold uppercase text-stone-500">Dog grooming guides</p>
          <h1 className="text-3xl font-black text-stone-950 sm:text-4xl">Choose your dog’s breed</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600">
            Find breed-specific guidance for coat care, brushing, bathing, and routine grooming.
          </p>
        </div>

        <nav aria-label="Dog breed grooming guides" className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {dogBreedGuides.map((guide) => (
            <Link
              key={guide.slug}
              href={guide.path}
              className="flex min-h-12 items-center gap-3 border-b border-stone-200 py-3 text-sm font-semibold text-stone-800 transition-colors hover:text-orange-700"
            >
              <span>{guide.name.replace(/ Grooming Guide$| Grooming Standards$| Grooming$/i, '')}</span>
            </Link>
          ))}
        </nav>
      </main>
      <Footer />
    </div>
  );
}