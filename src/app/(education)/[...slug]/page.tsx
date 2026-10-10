import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGuideDataBySlug, getAllSlugs, getProductCategoryPaths, PRODUCT_CATEGORIES } from '@/lib/seopages/taxonomy-data';
import { CategoryNode } from '@/lib/seopages/types';
import { SeoPageTemplate } from '@/components/seopages/SeoPageTemplate';

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

const ANIMAL_CATEGORY_SLUGS = new Set(['fish-and-aquatics', 'bird', 'reptile', 'small-animal']);

// MERGE GUARD (not in the owner's repo): getGuideDataBySlug falls through to
// a generic page for ANY slug — in his standalone app only his own
// generateStaticParams ever hit this route, so the fallback never fired. This
// merged catch-all sits at the site root, so it must serve ONLY his routes:
// a guide-directory/category slug (single segment) or a product-category
// tree path (multi segment) — everything else 404s below.
const KNOWN_SINGLE_SLUGS = new Set(getAllSlugs());
const KNOWN_CATEGORY_PATHS = new Set(getProductCategoryPaths());
// Legacy alias getGuideDataBySlug explicitly maps onto bowls-and-dishes.
const BOWLS_DISHES_ALIAS = 'bowls-dishes';

function isKnownEducationPath(segments: string[]): boolean {
  if (segments.length === 1) {
    return KNOWN_SINGLE_SLUGS.has(segments[0]) || segments[0] === BOWLS_DISHES_ALIAS;
  }
  return KNOWN_CATEGORY_PATHS.has(`/${segments.join('/')}`);
}

function collectAnimalPaths(node: CategoryNode, segments: string[], paths: { slug: string[] }[]) {
  paths.push({ slug: segments });
  node.children?.forEach((child) => collectAnimalPaths(child, [...segments, child.slug], paths));
}

export async function generateStaticParams() {
  const guideParams = getAllSlugs().map((slug) => ({ slug: [slug] }));
  const animalParams = PRODUCT_CATEGORIES
    .filter((category) => ANIMAL_CATEGORY_SLUGS.has(category.slug))
    .flatMap((category) => {
      const paths: { slug: string[] }[] = [];
      collectAnimalPaths(category, [category.slug], paths);
      return paths;
    });

  return [...guideParams, ...animalParams.filter((params) => params.slug.length > 1)];
}

async function getPageData(params: PageProps['params']) {
  const { slug } = await params;
  if (!isKnownEducationPath(slug)) notFound();
  const data = getGuideDataBySlug(slug[slug.length - 1], slug);

  if (!data) notFound();
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getPageData(params);

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: { canonical: data.canonicalUrl },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: data.canonicalUrl,
      siteName: 'All About Pawz',
      images: [{
        url: data.heroImageUrl,
        width: 1200,
        height: 675,
        alt: data.heroImageAlt,
      }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: data.metaTitle,
      description: data.metaDescription,
      images: [data.heroImageUrl],
    },
    keywords: [data.targetKeyword, ...data.secondaryKeywords],
  };
}

export default async function GuidePage({ params }: PageProps) {
  const data = await getPageData(params);
  return <SeoPageTemplate data={data} />;
}