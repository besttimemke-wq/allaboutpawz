import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGuideDataBySlug } from '@/lib/seopages/taxonomy-data';
import { SeoPageTemplate } from '@/components/seopages/SeoPageTemplate';

export const dynamic = 'force-static';

export async function generateMetadata(): Promise<Metadata> {
  const data = getGuideDataBySlug('beds-and-furniture');

  if (!data) {
    return {
      title: 'Beds & Furniture Guides | All About Pawz',
      description: 'Orthopedic pet beds, furniture-style crates, stairs, and loungers.',
    };
  }

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: {
      canonical: 'https://www.aapawz.com/beds-and-furniture',
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: 'https://www.aapawz.com/beds-and-furniture',
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

export default function BedsAndFurniturePage() {
  const data = getGuideDataBySlug('beds-and-furniture');

  if (!data) {
    notFound();
  }

  return <SeoPageTemplate data={data} />;
}
