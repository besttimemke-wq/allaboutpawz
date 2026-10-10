import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGuideDataBySlug } from '@/lib/seopages/taxonomy-data';
import { SeoPageTemplate } from '@/components/seopages/SeoPageTemplate';

const BEDS_FURNITURE_SUBCATEGORIES = [
  'stairs-and-steps',
  'sofas-and-chairs',
  'furniture-style-crates',
  'beds',
  'bed-pillows',
  'bed-mats',
  'bed-liners',
  'bed-covers',
  'bed-blankets',
];

interface PageProps {
  params: Promise<{
    subcategory: string;
  }>;
}

export async function generateStaticParams() {
  return BEDS_FURNITURE_SUBCATEGORIES.map((subcategory) => ({
    subcategory,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subcategory } = await params;
  const data = getGuideDataBySlug(subcategory);

  if (!data) {
    return {
      title: 'Guide Not Found | All About Pawz',
      description: 'The requested furniture guide could not be found.',
    };
  }

  const canonical = `https://www.aapawz.com/beds-and-furniture/${subcategory}`;

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: {
      canonical,
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: canonical,
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

export default async function BedsAndFurnitureSubcategoryPage({ params }: PageProps) {
  const { subcategory } = await params;
  const data = getGuideDataBySlug(subcategory);

  if (!data) {
    notFound();
  }

  return <SeoPageTemplate data={data} />;
}
