import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGuideDataBySlug } from '@/lib/seopages/taxonomy-data';
import { SeoPageTemplate } from '@/components/seopages/SeoPageTemplate';

export const dynamic = 'force-static';

export async function generateMetadata(): Promise<Metadata> {
  const data = getGuideDataBySlug('collars-harnesses-and-leashes');

  if (!data) {
    return {
      title: 'Collars, Harnesses & Leashes Guides | All About Pawz',
      description: 'Activity trackers, location trackers, ID tags, muzzles, leashes, harnesses, and collars.',
    };
  }

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: {
      canonical: 'https://www.aapawz.com/collars-harnesses-and-leashes',
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: 'https://www.aapawz.com/collars-harnesses-and-leashes',
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

export default function CollarsHarnessesLeashesPage() {
  const data = getGuideDataBySlug('collars-harnesses-and-leashes');

  if (!data) {
    notFound();
  }

  return <SeoPageTemplate data={data} />;
}
