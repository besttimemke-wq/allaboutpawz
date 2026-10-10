'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight, Menu, PawPrint, Search, X } from 'lucide-react';
import { ALL_GUIDE_ITEMS, GUIDES_DIRECTORY, PRODUCT_CATEGORIES } from '@/lib/seopages/taxonomy-data';
import { CategoryNode } from '@/lib/seopages/types';

interface MenuLink {
  title: string;
  path: string;
}

interface MenuSection {
  title: string;
  links: MenuLink[];
}

interface AnimalMenu {
  id: string;
  title: string;
  path: string;
  image?: string;
  imageAlt?: string;
  sections: MenuSection[];
}

interface TopNavProps {
  onBookClick?: () => void;
}

function getCategorySections(category: CategoryNode): MenuSection[] {
  if (!category.children?.length) return [];

  if (category.children.every((child) => !child.children?.length)) {
    return [{
      title: `${category.name} categories`,
      links: category.children.map((child) => ({
        title: child.name,
        path: `/${category.slug}/${child.slug}`,
      })),
    }];
  }

  return category.children.flatMap((child) => {
    const childPath = `/${category.slug}/${child.slug}`;
    if (!child.children?.length) {
      return [{ title: child.name, links: [{ title: child.name, path: childPath }] }];
    }

    return [{
      title: child.name,
      links: [
        { title: `All ${child.name}`, path: childPath },
        ...child.children.map((leaf) => ({
          title: leaf.name,
          path: `${childPath}/${leaf.slug}`,
        })),
      ],
    }];
  });
}

const CAT_GUIDE_PATTERN = /cat|kitten|persian|maine-coon|ragdoll|sphynx|bengal|british-shorthair|siamese|scottish-fold|russian-blue|domestic-shorthair/i;
const OTHER_PET_SLUGS = ['fish-and-aquatics', 'bird', 'reptile', 'small-animal'];

function getAnimalGuideSections(animal: 'dog' | 'cat'): MenuSection[] {
  return GUIDES_DIRECTORY.flatMap((pillar) => pillar.subcategories
    .filter((subcategory) => !(animal === 'dog' && subcategory.name.startsWith('Dog Breed Grooming')))
    .map((subcategory) => {
    const links = subcategory.items
      .filter((item) => animal === 'cat' ? CAT_GUIDE_PATTERN.test(`${item.name} ${item.slug}`) : !CAT_GUIDE_PATTERN.test(`${item.name} ${item.slug}`))
      .map((item) => ({ title: item.name, path: item.path }));
    return { title: subcategory.name, links };
    }).filter((section) => section.links.length > 0));
}

function getGeneralSupplySections(animal: 'dog' | 'cat'): MenuSection[] {
  const catSupplySlugs = new Set(['feeding-and-watering', 'grooming-essentials', 'beds-and-furniture', 'treats', 'wellness']);
  return PRODUCT_CATEGORIES
    .filter((category) => !OTHER_PET_SLUGS.includes(category.slug) && (animal === 'dog' || catSupplySlugs.has(category.slug)))
    .map((category) => ({
      title: category.name,
      links: [
        { title: `All ${category.name}`, path: `/${category.slug}` },
        ...getCategorySections(category).flatMap((section) => section.links),
      ],
    }));
}

function getAnimalMenus(): AnimalMenu[] {
  const dogMenu: AnimalMenu = {
    id: 'dog',
    title: 'Dogs',
    path: '/guides',
    image: '/seopages/images/hero_grooming_dog_1791411047518.jpg',
    imageAlt: 'A freshly groomed dog',
    sections: [
      ...getAnimalGuideSections('dog'),
      ...getGeneralSupplySections('dog'),
      { title: 'Dog breeds', links: [{ title: 'Browse all dog breeds', path: '/dog-breeds' }] },
    ],
  };
  const catMenu: AnimalMenu = {
    id: 'cat',
    title: 'Cats',
    path: '/guides',
    sections: [...getAnimalGuideSections('cat'), ...getGeneralSupplySections('cat')],
  };
  const otherPetMenus = PRODUCT_CATEGORIES
    .filter((category) => OTHER_PET_SLUGS.includes(category.slug))
    .map((category) => ({
      id: category.slug,
      title: category.slug === 'fish-and-aquatics' ? 'Fish' : category.name,
      path: `/${category.slug}`,
      sections: getCategorySections(category),
    }));

  return [dogMenu, ...otherPetMenus.filter((menu) => menu.id === 'reptile'), otherPetMenus.find((menu) => menu.id === 'bird')!, otherPetMenus.find((menu) => menu.id === 'small-animal')!, otherPetMenus.find((menu) => menu.id === 'fish-and-aquatics')!, catMenu];
}

const ANIMAL_MENUS = getAnimalMenus();

export const UnifiedTopNav: React.FC<TopNavProps> = ({ onBookClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeAnimalId, setActiveAnimalId] = useState(ANIMAL_MENUS[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();

  const activeAnimal = ANIMAL_MENUS.find((animal) => animal.id === activeAnimalId) || ANIMAL_MENUS[0];
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return ALL_GUIDE_ITEMS
      .filter((item) => item.name.toLowerCase().includes(query) || item.group.toLowerCase().includes(query))
      .slice(0, 8);
  }, [searchQuery]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const selectSearchResult = (path: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    router.push(path);
  };

  return (
    <header ref={navRef} className="sticky top-0 z-50 border-b border-stone-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6 lg:flex-nowrap lg:px-8">
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-2 text-stone-950">
          <PawPrint className="h-5 w-5 text-orange-600" />
          <span className="text-lg font-extrabold">All About Pawz</span>
        </Link>

        <div className="relative order-last w-full flex-1 lg:order-none lg:mx-8 lg:max-w-xl">
          <div className="flex h-10 items-center border border-stone-300 bg-stone-50 px-3 focus-within:border-stone-600 focus-within:bg-white">
            <Search className="mr-2 h-4 w-4 shrink-0 text-stone-500" />
            <input
              type="search"
              aria-label="Search guides and supplies"
              placeholder="Search guides and supplies"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-500"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="ml-2 text-stone-500 hover:text-stone-900"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto border border-stone-300 bg-white p-2 shadow-xl">
              <p className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Guides and categories</p>
              {searchResults.map((item) => (
                <button
                  key={`${item.url}-${item.group}`}
                  type="button"
                  onClick={() => selectSearchResult(item.url)}
                  className="flex w-full items-center justify-between gap-3 border-t border-stone-100 px-3 py-2.5 text-left text-xs hover:bg-stone-50"
                >
                  <span className="font-semibold text-stone-900">{item.name}</span>
                  <span className="shrink-0 text-stone-500">{item.group}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onBookClick ? onBookClick() : router.push('/grooming/memphis-tn')}
          className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 bg-stone-900 px-3.5 text-xs font-bold text-white transition-colors hover:bg-orange-700 sm:px-4"
        >
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">Book appointment</span>
          <span className="sm:hidden">Book</span>
        </button>
      </div>

      {isSearchOpen && (
        <button
          type="button"
          aria-label="Close search results"
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => setIsSearchOpen(false)}
        />
      )}

      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/45 p-0 sm:p-5" onClick={() => setIsMenuOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="All About Pawz navigation"
            onClick={(event) => event.stopPropagation()}
            className="grid h-full w-full max-w-6xl grid-rows-[minmax(220px,40vh)_minmax(0,1fr)] overflow-hidden bg-white shadow-2xl sm:h-[min(820px,92vh)] sm:grid-cols-[250px_1fr] sm:grid-rows-[1fr]"
          >
            <aside className="flex min-h-0 flex-col border-b border-stone-200 bg-[#f5f4f0] sm:border-b-0 sm:border-r">
              <div className="flex items-center justify-between border-b border-stone-200 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-[10px] font-bold uppercase text-stone-500">Browse by animal</p>
                  <h2 className="mt-0.5 text-lg font-black text-stone-950">Shop by animal</h2>
                </div>
                <div className="flex items-center gap-1">
                  <Link href="/guides" onClick={() => setIsMenuOpen(false)} className="hidden text-[10px] font-bold text-stone-600 hover:text-orange-700 sm:inline">
                    All guides
                  </Link>
                  <button
                    type="button"
                    aria-label="Close navigation menu"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex h-9 w-9 items-center justify-center text-stone-600 hover:bg-white hover:text-stone-950"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <nav aria-label="Pet types" className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-3 sm:flex sm:flex-col sm:gap-1 sm:p-3">
                {ANIMAL_MENUS.map((animal) => (
                  <button
                    key={animal.id}
                    type="button"
                    aria-current={animal.id === activeAnimalId ? 'true' : undefined}
                    onMouseEnter={() => setActiveAnimalId(animal.id)}
                    onFocus={() => setActiveAnimalId(animal.id)}
                    onClick={() => setActiveAnimalId(animal.id)}
                    className={`flex min-h-[76px] flex-col items-start justify-between border p-3 text-left transition-colors sm:min-h-12 sm:flex-row sm:items-center ${
                      animal.id === activeAnimalId
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-800 hover:border-stone-400 hover:bg-white'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs font-bold">
                      <PawPrint className={`h-4 w-4 ${animal.id === activeAnimalId ? 'text-orange-300' : 'text-orange-700'}`} />
                      {animal.title}
                    </span>
                    <ChevronRight className="hidden h-3.5 w-3.5 opacity-60 sm:block" />
                  </button>
                ))}
              </nav>
            </aside>

            <div className="flex min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 sm:px-8 sm:py-5">
                <div>
                  <p className="text-[10px] font-bold uppercase text-orange-700">Pet care library</p>
                  <h2 className="mt-1 text-xl font-black text-stone-950 sm:text-2xl">{activeAnimal?.title}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={activeAnimal?.path || '/guides'}
                    onClick={() => setIsMenuOpen(false)}
                    className="hidden text-xs font-bold text-stone-700 hover:text-orange-700 sm:inline-flex"
                  >
                    View all guides
                  </Link>
                  <button
                    type="button"
                    aria-label="Close navigation menu"
                    onClick={() => setIsMenuOpen(false)}
                    className="hidden h-9 w-9 items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-950 sm:flex"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
                {activeAnimal?.image && (
                  <div className="mb-6 grid grid-cols-[1fr_112px] items-center gap-4 border-b border-stone-200 pb-5 sm:grid-cols-[1fr_160px]">
                    <div>
                      <p className="text-sm font-bold text-stone-900">Care for dogs, at every stage.</p>
                      <p className="mt-1 max-w-md text-xs leading-relaxed text-stone-600">Browse breed grooming, nutrition, health, and supply guides selected for dog owners.</p>
                    </div>
                    <Image
                      src={activeAnimal.image}
                      alt={activeAnimal.imageAlt || ''}
                      width={320}
                      height={210}
                      className="h-20 w-28 object-cover sm:h-24 sm:w-40"
                      sizes="(max-width: 640px) 112px, 160px"
                    />
                  </div>
                )}

                {activeAnimal?.sections.length ? (
                  <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                    {activeAnimal.sections.map((section) => (
                      <section key={section.title}>
                        <h3 className="mb-2 border-b border-stone-200 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          {section.title}
                        </h3>
                        <ul>
                          {section.links.map((item) => (
                            <li key={`${item.path}-${item.title}`}>
                              <Link
                                href={item.path}
                                onClick={() => setIsMenuOpen(false)}
                                className="group flex min-h-9 items-center justify-between gap-2 border-b border-stone-100 py-2 text-xs font-medium text-stone-700 transition-colors hover:text-orange-700"
                              >
                                <span>{item.title}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className="max-w-lg text-sm leading-relaxed text-stone-600">
                    Browse the {activeAnimal?.title.toLowerCase()} overview and its related care information.
                  </p>
                )}
              </div>

            </div>
          </section>
        </div>
      )}
    </header>
  );
};