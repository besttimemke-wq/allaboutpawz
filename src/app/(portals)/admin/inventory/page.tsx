'use client';

import React, { useState } from 'react';
import { InventoryView } from '@/components/pawz/InventoryView';
import ProductsPage from '@/app/(portals)/admin/products/page';
import CategoriesPage from '@/app/(portals)/admin/categories/page';
import BrandsPage from '@/app/(portals)/admin/brands/page';
import FiltersPage from '@/app/(portals)/admin/filters/page';
import PromotionsPage from '@/app/(portals)/admin/promotions/page';
import { cn } from '@/lib/utils';
import { Package, Boxes, Tags, Tag, Filter, Percent, ClipboardList } from 'lucide-react';

type Tab = 'inventory' | 'products' | 'categories' | 'brands' | 'filters' | 'promotions';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'inventory', label: 'Stock Levels', icon: ClipboardList },
  { id: 'products', label: 'Products', icon: Boxes },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'brands', label: 'Brands', icon: Tag },
  { id: 'filters', label: 'Filters', icon: Filter },
  { id: 'promotions', label: 'Promotions', icon: Percent },
];

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('inventory');

  return (
    <div className="flex flex-col w-full bg-background text-foreground min-h-full">
      {/* Tab header — the single home for all catalog management.
          A shipper sees Shipping Station (in the sidebar); they don't see
          this page. Only admins/staff with inventory access land here. */}
      <div className="border-b border-border bg-card px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Package className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Products & Inventory
          </h1>
        </div>
        <p className="text-[13px] text-muted-foreground mb-3">
          Manage your catalog, stock levels, categories, brands, filters, and promotions.
        </p>
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar -mb-px">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors duration-150 cursor-pointer',
                  active
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab body */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'inventory' && <InventoryView />}
        {tab === 'products' && <ProductsPage />}
        {tab === 'categories' && <CategoriesPage />}
        {tab === 'brands' && <BrandsPage />}
        {tab === 'filters' && <FiltersPage />}
        {tab === 'promotions' && <PromotionsPage />}
      </div>
    </div>
  );
}
