import type { Metadata } from 'next';
import Link from 'next/link';
import { GUIDES_DIRECTORY, PRODUCT_CATEGORIES } from '@/lib/seopages/taxonomy-data';
import { CategoryNode } from '@/lib/seopages/types';
import { TopNav } from '@/components/seopages/TopNav';
import { Footer } from '@/components/seopages/Footer';
import { 
  ChevronRight, 
  FileText, 
  BookOpen, 
  Folder
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Complete Pet Care & Grooming Guides Directory | All About Pawz',
  description: 'Explore our complete library of veterinary-reviewed pet care, breed grooming, canine nutrition, and health guides.',
  alternates: {
    canonical: 'https://www.aapawz.com/guides',
  },
};

function CategoryLinks({ nodes, parentPath }: { nodes: CategoryNode[]; parentPath: string }) {
  return (
    <ul className="space-y-1.5 text-xs text-stone-600">
      {nodes.map((node) => {
        const path = `${parentPath}/${node.slug}`;
        return (
          <li key={path}>
            <Link href={path} className="block py-1 hover:text-orange-600 transition-colors">
              {node.name}
            </Link>
            {node.children && <CategoryLinks nodes={node.children} parentPath={path} />}
          </li>
        );
      })}
    </ul>
  );
}

export default function GuidesDirectoryPage() {
  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white rounded-none">
      <TopNav />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-12 w-full">
        {/* Hub Header */}
        <div className="border-b border-stone-200 pb-10 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-white text-xs font-bold uppercase tracking-wider mb-4 rounded-none border border-stone-900">
            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
            <span>Master Knowledge Base</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-stone-950 tracking-tight mb-4">
            All About Pawz Guides & SEO Articles
          </h1>

          <p className="text-lg text-stone-600 max-w-3xl leading-relaxed">
            Browse our complete library of breed-specific grooming instructions, dietary calculators, life-stage nutrition plans, buying checklists, and local Mid-South pet services.
          </p>

          {/* Quick Anchor Bar (Square) */}
          <div className="flex flex-wrap items-center gap-2 mt-8 pt-6 border-t border-stone-100 text-xs font-bold">
            <a href="#feeding-and-watering" className="px-4 py-2 bg-stone-900 text-white hover:bg-[#FF6200] transition-colors rounded-none">
              Feeding & Watering (9 Pages)
            </a>
            <a href="#grooming" className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors rounded-none">
              Pillar 1: Grooming
            </a>
            <a href="#nutrition" className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors rounded-none">
              Pillar 2: Nutrition
            </a>
            <a href="#health" className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors rounded-none">
              Health & Wellness
            </a>
            <a href="#buying-guides" className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors rounded-none">
              Buying Guides
            </a>
            <a href="#local" className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-950 border border-orange-300 transition-colors rounded-none">
              Local Mid-South
            </a>
          </div>
        </div>

        {/* Feeding & Watering Dedicated Section */}
        <section id="feeding-and-watering" className="scroll-mt-28 mb-16 border-2 border-stone-900 p-8 bg-[#FAF9F6] rounded-none">
          <div className="flex items-center justify-between pb-4 border-b border-stone-300 mb-6">
            <div>
              <div className="text-xs font-bold text-orange-600 uppercase tracking-wider">Priority Pillar</div>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight">
                Feeding & Watering SEO Pages (9 Dedicated Routes)
              </h2>
            </div>
            <Link href="/feeding-and-watering" className="text-xs font-bold bg-[#FF6200] hover:bg-[#E65800] text-white px-4 py-2 transition-colors rounded-none">
              View Master Hub →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { name: 'Feeding & Watering Master Hub', slug: 'feeding-and-watering', desc: 'Clinical hydration & digestive standards' },
              { name: 'Water Bottles', slug: 'water-bottles', desc: 'Travel hydration & leak-proof trail bottles' },
              { name: 'Nursing Supplies', slug: 'nursing-supplies', desc: 'Neonatal orphan care & miracle nipples' },
              { name: 'Lick Mats', slug: 'lick-mats', desc: 'Calming enrichment & grooming bath distraction' },
              { name: 'Fountains', slug: 'fountains', desc: 'Continuous oxygenation & feline kidney care' },
              { name: 'Food Storage', slug: 'food-storage', desc: 'Airtight gamma vaults & fat rancidity defense' },
              { name: 'Feeding Mats', slug: 'feeding-mats', desc: 'Silicone raised lip spill guards for floors' },
              { name: 'Bowls & Dishes', slug: 'bowls-and-dishes', desc: 'Stainless steel, ceramic & anti-bloat mazes' },
              { name: 'Automatic Feeders', slug: 'automatic-feeders', desc: 'Desiccant-sealed battery-backed timed feeders' },
            ].map((item) => (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                className="bg-white border border-stone-300 hover:border-stone-900 p-4 transition-all flex flex-col justify-between rounded-none shadow-xs group"
              >
                <div>
                  <h4 className="text-sm font-bold text-stone-950 group-hover:text-orange-600 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-xs text-stone-500 mt-1">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400 group-hover:text-stone-900">
                  <span className="font-mono text-[11px]">/{item.slug}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Remaining Pillars Sections */}
        <div className="space-y-16">
          {GUIDES_DIRECTORY.map((pillar) => {
            const anchorId = pillar.anchor.replace('/guides#', '');

            return (
              <section key={pillar.pillar} id={anchorId} className="scroll-mt-28">
                <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight">
                      {pillar.pillar}
                    </h2>
                    <p className="text-xs font-mono text-stone-400 mt-0.5">
                      URL anchor: {pillar.anchor}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1 border border-stone-200 rounded-none">
                    {pillar.subcategories.reduce((acc, s) => acc + s.items.length, 0)} articles
                  </span>
                </div>

                <div className="space-y-8">
                  {pillar.subcategories.map((sub) => (
                    <div key={sub.name} className="bg-[#FAF9F6] border border-stone-300 p-6 sm:p-7 rounded-none">
                      <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Folder className="w-4 h-4 text-orange-500" />
                        <span>{sub.name}</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sub.items.map((item) => (
                          <Link
                            key={item.slug}
                            href={item.path}
                            className="bg-white hover:bg-orange-50/50 border border-stone-200 hover:border-stone-900 p-3.5 transition-all flex items-center justify-between group shadow-2xs rounded-none"
                          >
                            <div className="flex items-center gap-2.5 truncate mr-2">
                              <FileText className="w-4 h-4 text-stone-400 group-hover:text-orange-600 shrink-0" />
                              <span className="text-xs font-semibold text-stone-900 group-hover:text-orange-950 truncate">
                                {item.name}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-orange-600 shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Product Categories Section */}
          <section id="products" className="scroll-mt-28 pt-8 border-t border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight">
                  Product Categories & Supply Catalogs
                </h2>
                <p className="text-xs font-mono text-stone-400 mt-0.5">
                  {PRODUCT_CATEGORIES.length} Core Categories and all subcategories
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PRODUCT_CATEGORIES.map((cat) => (
                <div key={cat.slug} className="bg-white border border-stone-300 p-6 shadow-2xs flex flex-col justify-between rounded-none">
                  <div>
                    <Link
                      href={`/${cat.slug}`}
                      className="text-base font-black text-stone-950 hover:text-orange-600 transition-colors block mb-3 pb-2 border-b border-stone-100"
                    >
                      {cat.name}
                    </Link>

                    {cat.children && (
                      <CategoryLinks nodes={cat.children} parentPath={`/${cat.slug}`} />
                    )}
                  </div>

                  <Link
                    href={`/${cat.slug}`}
                    className="mt-6 pt-3 border-t border-stone-100 text-xs font-bold text-stone-900 hover:text-orange-600 flex items-center justify-between"
                  >
                    <span>View Category Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
