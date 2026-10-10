import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { permanentRedirect } from 'next/navigation';
import { getGuideDataBySlug, getAllSlugs, GUIDES_DIRECTORY } from '@/lib/seopages/taxonomy-data';
import { SeoPageTemplate } from '@/components/seopages/SeoPageTemplate';

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

// Every slug the owner's data layer resolves (guide-directory items + all
// product-category slugs) — the allowlist for this route.
const KNOWN_GUIDE_SLUGS = new Set(getAllSlugs());

export async function generateStaticParams() {
  const allSlugs = getAllSlugs();
  const paramsList: { slug: string[] }[] = [];

  // 1. Direct single-slug routes under /guides/[slug]
  for (const slug of allSlugs) {
    paramsList.push({ slug: [slug] });
  }

  // 2. Category routes matching upstream structure (/guides/grooming/[slug], etc.)
  for (const pillar of GUIDES_DIRECTORY) {
    let catSegment = 'grooming';
    if (pillar.pillar === 'Nutrition') catSegment = 'nutrition';
    else if (pillar.pillar === 'Health & Wellness') catSegment = 'health';
    else if (pillar.pillar === 'Buying Guides') catSegment = 'buying-guides';
    else if (pillar.pillar === 'Local Services') catSegment = 'local';

    for (const sub of pillar.subcategories) {
      for (const item of sub.items) {
        paramsList.push({ slug: [catSegment, item.slug] });
      }
    }
  }

  return paramsList;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    return {
      title: 'Guide Not Found | All About Pawz',
      description: 'The requested pet care guide could not be found.',
    };
  }

  const targetSlug = slug[slug.length - 1];

  if (!KNOWN_GUIDE_SLUGS.has(targetSlug)) {
    return {
      title: 'Guide Not Found | All About Pawz',
      description: 'The requested pet care guide could not be found.',
    };
  }

  const data = getGuideDataBySlug(targetSlug);

  if (!data) {
    return {
      title: 'Guide Not Found | All About Pawz',
      description: 'The requested pet care guide could not be found.',
    };
  }

  const canonicalPath = `/guides/${slug.join('/')}`;
  const canonicalUrl = `https://www.aapawz.com${canonicalPath}`;

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: canonicalUrl,
      siteName: 'All About Pawz',
      images: [
        {
          url: data.heroImageUrl,
          width: 1200,
          height: 675,
          alt: data.heroImageAlt,
        },
      ],
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

export default async function GuideDynamicPage({ params }: PageProps) {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    notFound();
  }

  const targetSlug = slug[slug.length - 1];
  // MERGE GUARD (not in the owner's repo): getGuideDataBySlug never returns
  // null (it falls through to a generic page for any slug). This route took
  // over the old /guides/grooming/[slug] URLs, so unknown slugs redirect to
  // the /guides hub instead of rendering a junk page — the old pages 404'd
  // there, and the owner's redirect rule for legacy guide URLs is "else
  // /guides".
  if (!KNOWN_GUIDE_SLUGS.has(targetSlug)) {
    permanentRedirect('/guides');
  }

  const data = getGuideDataBySlug(targetSlug);

  if (!data) {
    notFound();
  }

  // Pass dynamic canonical path to template
  const canonicalPath = `/guides/${slug.join('/')}`;
  const modifiedData = {
    ...data,
    canonicalUrl: `https://www.aapawz.com${canonicalPath}`,
  };

  return <SeoPageTemplate data={modifiedData} />;
}
