'use client';

import React, { useState } from 'react';
import { GuidePageData } from '@/lib/seopages/types';
import { TopNav } from '@/components/seopages/TopNav';
import { HeroBanner } from '@/components/seopages/HeroBanner';
import { IncentivesRow } from '@/components/seopages/IncentivesRow';
import { WhyFeaturesCol } from '@/components/seopages/WhyFeaturesCol';
import { ArticleBodyView } from '@/components/seopages/ArticleBodyView';
import { BookingModal } from '@/components/seopages/BookingModal';
import { Footer } from '@/components/seopages/Footer';

interface SeoPageTemplateProps {
  data: GuidePageData;
}

export const SeoPageTemplate: React.FC<SeoPageTemplateProps> = ({ data }) => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(data.serviceCity || 'Memphis, TN');
  const isProductCategory = data.archetype === 'product_category';

  const handleBookCity = (city: string) => {
    setSelectedCity(city);
    setIsBookingModalOpen(true);
  };

  // Structured Data schemas for this specific page
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': data.metaTitle,
    'description': data.metaDescription,
    'image': [data.heroImageUrl],
    'datePublished': '2026-01-15T08:00:00+08:00',
    'dateModified': '2026-10-07T12:00:00+08:00',
    'author': {
      '@type': 'Person',
      'name': data.author.name,
      'jobTitle': data.author.role,
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'All About Pawz',
      'url': 'https://www.aapawz.com',
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': data.canonicalUrl,
    },
  };

  const categorySegments = data.path.split('/').filter(Boolean);
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.aapawz.com' },
      ...(data.archetype === 'product_category'
        ? categorySegments.slice(0, -1).map((segment, index) => ({
            '@type': 'ListItem',
            'position': index + 2,
            'name': index === 0 ? data.pillar : segment.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
            'item': `https://www.aapawz.com/${categorySegments.slice(0, index + 1).join('/')}`,
          }))
        : []),
      {
        '@type': 'ListItem',
        'position': data.archetype === 'product_category' ? categorySegments.length + 1 : 2,
        'name': data.heroTitle,
        'item': data.canonicalUrl,
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': data.faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white" id="top">
      
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Top Navigation */}
      <TopNav onBookClick={() => setIsBookingModalOpen(true)} />

      {/* Main Website Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 w-full">
        
        {/* Amazon-styled Hero Section (Screenshot 3) */}
        <HeroBanner
          data={data}
          onBookClick={() => {
            if (isProductCategory) {
              document.getElementById('guide-content')?.scrollIntoView({ behavior: 'smooth' });
            } else {
              setIsBookingModalOpen(true);
            }
          }}
        />

        {/* Amazon-styled 3-Card Incentives / Care Standards Row (Screenshot 1) */}
        <IncentivesRow
          data={data}
          onExploreClick={() => {
            const el = document.getElementById('guide-content');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Amazon-styled "Why Choose All About Pawz" 2-Column Section (Screenshot 2) */}
        {!isProductCategory && (
          <WhyFeaturesCol
            data={data}
            onLearnMore={() => setIsBookingModalOpen(true)}
          />
        )}

        {/* Longform Editorial Guide: TOC, Step-by-Step, Comparison Table, Supplies, FAQs */}
        <ArticleBodyView
          data={data}
          onBookCity={handleBookCity}
        />

      </main>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        defaultCity={selectedCity}
        guideTitle={data.heroTitle}
      />

      {/* Footer */}
      <Footer />

    </div>
  );
};
