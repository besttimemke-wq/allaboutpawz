import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGuideDataBySlug } from '@/lib/seopages/taxonomy-data';
import { SeoPageTemplate } from '@/components/seopages/SeoPageTemplate';

export const dynamic = 'force-static';

export async function generateMetadata(): Promise<Metadata> {
  const data = getGuideDataBySlug('grooming-essentials');

  if (!data) {
    return {
      title: 'Grooming Essentials: Needed for Home Care | All About Pawz',
      description: 'Veterinary-grade home pet grooming essentials, styptic powders, safety shears, clippers, and coat care standards.',
    };
  }

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: {
      canonical: 'https://www.aapawz.com/grooming-essentials',
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: 'https://www.aapawz.com/grooming-essentials',
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

export default function GroomingEssentialsParentPage() {
  const data = getGuideDataBySlug('grooming-essentials');

  if (!data) {
    notFound();
  }

  return <SeoPageTemplate data={data} />;
}
