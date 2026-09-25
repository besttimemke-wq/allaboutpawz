'use client';
import React from 'react';
import { useExecutiveOverview } from '@/hooks/useAnalyticsData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, Users, TrendingUp, ShoppingBag, CreditCard, UserCheck, Package, Loader2 } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: kpis, isLoading } = useExecutiveOverview();
  const k = kpis as any;

  const cards = [
    { label: 'Total Revenue', value: k ? `$${Number(k.total_revenue).toFixed(2)}` : '—', icon: DollarSign, color: '#227665' },
    { label: 'Appointments', value: k?.total_appointments ?? '—', icon: Calendar, color: '#547590' },
    { label: 'Active Customers', value: k?.active_customers ?? '—', icon: Users, color: '#187b65' },
    { label: 'Avg Ticket', value: k ? `$${Number(k.average_ticket).toFixed(2)}` : '—', icon: TrendingUp, color: '#956e29' },
    { label: 'Orders', value: k?.total_orders ?? '—', icon: ShoppingBag, color: '#7761a6' },
    { label: 'Payments', value: k?.total_payments ?? '—', icon: CreditCard, color: '#b46545' },
    { label: 'Active Staff', value: k?.active_staff ?? '—', icon: UserCheck, color: '#547590' },
    { label: 'Inventory Moves', value: k?.inventory_movements ?? '—', icon: Package, color: '#187b65' },
  ];

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics & BI</h1><p className="text-[13px] text-muted-foreground mt-1">Executive dashboard with real-time KPIs across all business domains.</p></div>
        {k && <Badge variant="secondary" className="gap-1.5"><TrendingUp className="size-3" />Completion Rate: {k.completion_rate}%</Badge>}
      </div>
      {isLoading ? <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading KPIs…</span></div>
      : <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label}><CardContent className="pt-4 pb-4"><div className="flex items-center justify-between mb-2"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p><c.icon className="size-3.5" style={{ color: c.color }} /></div><p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p></CardContent></Card>
        ))}
      </div>}
      <Card><CardContent className="pt-4 pb-4"><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-muted-foreground">Multi-Domain Aggregation</p><Badge variant="outline">SQL SUM/COUNT/AVG</Badge></div><p className="text-[12px] text-muted-foreground mt-2">All KPIs computed server-side via PostgreSQL aggregations across commerce_orders, crm_appointments, crm_customers, crm_staff, and erp_inventory_movements. No client-side computation.</p></CardContent></Card>
    </div>
  );
}
