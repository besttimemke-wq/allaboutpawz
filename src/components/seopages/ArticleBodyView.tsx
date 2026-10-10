'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronRight, 
  MapPin, 
  ChevronDown, 
  Clock, 
  UserCheck, 
  CheckCircle2 
} from 'lucide-react';
import { GuidePageData } from '@/lib/seopages/types';

interface ArticleBodyViewProps {
  data: GuidePageData;
  onBookCity?: (city: string) => void;
}

export const ArticleBodyView: React.FC<ArticleBodyViewProps> = ({ 
  data, 
  onBookCity 
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeTocId, setActiveTocId] = useState<string>(data.tableOfContents[0]?.id || '');
  const isProductCategory = data.archetype === 'product_category';

  const getCityPath = (city: string) => {
    const clean = city.toLowerCase();
    if (clean.includes('memphis')) return '/grooming/memphis-tn';
    if (clean.includes('bartlett')) return '/grooming/bartlett-tn';
    if (clean.includes('collierville')) return '/grooming/collierville-tn';
    if (clean.includes('arlington')) return '/grooming/arlington-tn';
    if (clean.includes('millington')) return '/grooming/millington-tn';
    return '/grooming/shelby-county';
  };

  return (
    <section className="my-16 scroll-mt-24" id="guide-content">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Sticky Table of Contents (Left Rail - 100% Square) */}
        <aside className="lg:col-span-4 hidden lg:block">
          <div className="sticky top-28 bg-[#FBFBFA] border border-stone-300 p-6 rounded-none">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-4 pb-3 border-b border-stone-300">
              Guide Outline & Sections
            </div>

            <nav className="space-y-1 text-xs">
              {data.tableOfContents.map((toc) => (
                <a
                  key={toc.id}
                  href={`#${toc.id}`}
                  onClick={() => setActiveTocId(toc.id)}
                  className={`block py-2 px-3 transition-colors leading-snug rounded-none border border-transparent ${
                    activeTocId === toc.id
                      ? 'bg-stone-900 text-white font-bold border-stone-900'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100 hover:border-stone-200'
                  }`}
                >
                  {toc.label}
                </a>
              ))}
            </nav>

            {/* Author & Reviewer Stamp */}
            <div className="mt-6 pt-5 border-t border-stone-300 text-xs space-y-2 text-stone-600">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-stone-900 shrink-0" />
                <span><strong>Author:</strong> {data.author.name}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-500 pt-1">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{data.lastUpdated} · {data.readTime}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Longform Editorial Content (Right Rail) */}
        <article className="lg:col-span-8 space-y-12">
          
          {/* Executive Intro Summary (Square Callout) */}
          <div className="bg-[#F8F7F4] border-l-4 border-stone-900 p-6 sm:p-7 rounded-none border-y border-r border-stone-300">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              {isProductCategory ? 'Category Overview' : 'Clinical & Salon Overview'}
            </h3>
            <p className="text-base sm:text-lg text-stone-900 leading-relaxed font-normal">
              {data.introSummary}
            </p>
          </div>

          {/* Deep Content Sections */}
          {data.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28 pt-6 border-t border-stone-300 first:border-t-0 first:pt-0"
            >
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight mb-4">
                {section.title}
              </h2>

              <p className="text-base text-stone-700 leading-relaxed mb-6">
                {section.content}
              </p>

              {/* Tips Checklist (Square) */}
              {section.tips && (
                <div className="my-6 bg-white border border-stone-300 p-6 rounded-none shadow-xs">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-4">
                    {isProductCategory ? 'Selection Tips' : 'Recommended Salon Protocol'}
                  </h4>
                  <ul className="space-y-3 text-sm text-stone-700">
                    {section.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-stone-900 shrink-0 mt-2 rounded-none"></span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Callout Box: White canvas with crisp orange border, square geometry */}
              {section.callout && (
                <div className="my-6 p-6 bg-white border-2 border-orange-500 text-stone-900 text-sm leading-relaxed rounded-none shadow-xs">
                  <div className="font-bold mb-1.5 text-xs uppercase tracking-wider text-orange-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-none inline-block"></span>
                    <span>{section.callout.type === 'pro-tip' ? 'Master Protocol' : 'Veterinary Consultation'}: {section.callout.title}</span>
                  </div>
                  <p className="text-stone-800">{section.callout.text}</p>
                </div>
              )}

              {/* Structured Comparison Data Table (Square) */}
              {section.tableData && (
                <div className="my-6 overflow-x-auto border border-stone-300 rounded-none shadow-xs">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#F8F7F4] text-stone-900 font-bold border-b border-stone-300">
                      <tr>
                        {section.tableData.headers.map((h, idx) => (
                          <th key={idx} className="py-3.5 px-4 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {section.tableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-stone-50 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className={`py-3.5 px-4 text-stone-700 ${cIdx === 0 ? 'font-bold text-stone-950' : ''}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}

          {isProductCategory && data.relatedArticles && data.relatedArticles.length > 0 && (
            <section id="related-categories" className="pt-8 border-t border-stone-300">
              <h2 className="text-2xl font-black text-stone-950 tracking-tight mb-5">
                Related {data.pillar} Categories
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.relatedArticles.map((article) => (
                  <Link
                    key={article.path}
                    href={article.path}
                    className="border border-stone-300 p-4 flex items-center justify-between gap-3 text-sm font-semibold text-stone-900 hover:border-orange-600 hover:text-orange-700 transition-colors"
                  >
                    <span>{article.title}</span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Related Supplies & Equipment Grid (Square Cards) */}
          {!isProductCategory && (
          <section id="recommended-gear" className="pt-8 border-t border-stone-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-stone-950 tracking-tight">
                  Recommended Equipment & Mid-South Supplies
                </h2>
                <p className="text-sm text-stone-600 mt-1">
                  Professional equipment proven to maintain health between salon visits
                </p>
              </div>
              <Link 
                href="/feeding-and-watering"
                className="hidden sm:flex items-center gap-1 text-xs font-bold text-stone-900 hover:text-orange-600 transition-colors"
              >
                <span>View Full Catalog</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.relatedProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-stone-300 p-5 flex flex-col justify-between hover:border-stone-500 transition-colors rounded-none shadow-xs"
                >
                  <div>
                    <h4 className="text-sm font-bold text-stone-950 mb-1 leading-snug">
                      {product.name}
                    </h4>
                    <p className="text-xs text-stone-500 mb-2 font-mono">
                      {product.category}
                    </p>
                    <p className="text-xs text-stone-600 mb-4 line-clamp-3">
                      {product.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between pt-3 border-t border-stone-100 mb-3">
                      <span className="text-base font-black text-stone-950">
                        {product.price}
                      </span>
                    </div>

                    <Link 
                      href="/feeding-and-watering"
                      className="w-full py-2.5 bg-stone-900 hover:bg-[#FF6200] text-white text-xs font-bold transition-colors flex items-center justify-center rounded-none"
                    >
                      Shop Product
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
          )}

          {/* Local Mid-South Cities Showcase (Square) */}
          {!isProductCategory && <section id="local-service-areas" className="pt-8 border-t border-stone-300">
            <div className="bg-[#1C1917] text-white p-8 lg:p-10 rounded-none border border-stone-800">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span>Mid-South Salon Coverage</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">
                Serving Pets Across Greater Memphis & Shelby County
              </h3>
              <p className="text-sm text-stone-300 mb-6 max-w-xl leading-relaxed">
                Whether you live near Midtown, Germantown, Bartlett, Collierville, or Arlington, All About Pawz offers full salon appointments and concierge pet care.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.localServiceAreas.map((city, idx) => (
                  <Link
                    key={idx}
                    href={getCityPath(city)}
                    className="p-3 bg-stone-800/80 hover:bg-[#FF6200] text-stone-200 hover:text-white text-xs font-bold flex items-center justify-between transition-colors border border-stone-700 cursor-pointer rounded-none"
                  >
                    <span>{city}, TN</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
          }

          {/* FAQ Accordion Section (Square Accordion Items) */}
          <section id="faq" className="pt-8 border-t border-stone-300">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              {isProductCategory ? 'Product Category Questions' : 'Veterinary & Salon Questions'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight mb-6">
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              {data.faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-stone-300 bg-white rounded-none"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-base text-stone-950 hover:text-orange-600 transition-colors cursor-pointer rounded-none"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-orange-500' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 text-sm text-stone-700 leading-relaxed border-t border-stone-200 pt-4 rounded-none">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

        </article>

      </div>
    </section>
  );
};
