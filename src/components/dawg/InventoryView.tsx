'use client';

import React from 'react';
import Link from 'next/link';
import { Package, Tag, Star, ArrowRight, Store } from 'lucide-react';

/**
 * Commerce Control Center — the gateway from the DAWG shell to the real
 * shop management pages. The live catalog (products, categories, reviews,
 * Stripe sync) is managed through the dedicated admin routes below; this
 * view links them together so nothing is hiding behind a URL.
 */
export const InventoryView: React.FC = () => {
  const cards = [
    {
      href: '/admin/products',
      icon: Package,
      title: 'Shop Products',
      body: 'Create, edit, price and publish products. Every save syncs to the storefront and Stripe — images live in Supabase Storage.',
      cta: 'MANAGE PRODUCTS',
    },
    {
      href: '/admin/categories',
      icon: Tag,
      title: 'Product Categories',
      body: 'The 88-category taxonomy behind the shop\'s departments, menus and filters — see where every product lives.',
      cta: 'BROWSE CATEGORIES',
    },
    {
      href: '/admin/reviews',
      icon: Star,
      title: 'Product Reviews',
      body: 'Approve, hide or delete customer reviews. Approved reviews appear on the product pages with verified badges.',
      cta: 'MODERATE REVIEWS',
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <span>Commerce Control Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            The live shop catalog — products, categories, reviews and Stripe sync — is managed here.
          </p>
        </div>
        <Link
          href="/shop"
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <Store className="w-4 h-4" />
          <span>View Live Shop</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ href, icon: Icon, title, body, cta }) => (
          <Link
            key={href}
            href={href}
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-200 hover:shadow-sm transition-all flex flex-col"
          >
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-indigo-600" />
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h2 className="mt-4 text-sm font-bold text-slate-900">{title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 flex-1">{body}</p>
            <span className="mt-4 text-[10px] font-bold tracking-[0.12em] text-indigo-600">
              {cta}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
