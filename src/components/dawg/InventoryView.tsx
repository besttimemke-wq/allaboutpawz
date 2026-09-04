'use client';

import React from 'react';
import { INVENTORY_PRODUCTS } from '@/lib/dawg-mock-data';
import { Package, AlertTriangle, Plus, Search, CheckCircle2 } from 'lucide-react';

export const InventoryView: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6 ">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <span>Products & Salon Supplies Inventory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track shampoo gallons, facial scrubs, retail dog treats, and grooming blade stock.
          </p>
        </div>

        <button className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs">
          <Plus className="w-4 h-4" />
          <span>Restock Item</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Item Name & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Reorder Level</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INVENTORY_PRODUCTS.map((item) => {
                const currentStock = item.stock ?? item.inStock ?? 0;
                const minStock = item.minStock ?? item.reorderPoint ?? 5;
                const isLow = currentStock <= minStock;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{item.sku}</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {currentStock} units
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      Min {minStock} units
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Low Stock</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>In Stock</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition-colors">
                        Reorder
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
