'use client';
import React from 'react';
import { useRevenueAnalytics } from '@/hooks/useAnalyticsData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, Users, AlertTriangle, Loader2 } from 'lucide-react';

export default function RevenuePage() {
  const { data, isLoading } = useRevenueAnalytics('30');
  const d = data as any;
  const trends = d?.trends ?? [];
  const paymentMethods = d?.paymentMethods ?? [];
  const retention = d?.customerRetention;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Revenue Analytics</h1><p className="text-[13px] text-muted-foreground mt-1">Revenue trends, payment method distribution, and customer retention metrics.</p></div>
      {isLoading ? <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading revenue analytics…</span></div>
      : <>
        {retention && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{label:'Total Customers',value:retention.total_customers,icon:Users},{label:'Avg LTV',value:`$${Number(retention.avg_lifetime_value).toFixed(0)}`,icon:DollarSign},{label:'Avg Rebook Rate',value:`${Number(retention.avg_rebook_rate).toFixed(1)}%`,icon:TrendingUp},{label:'At Risk',value:retention.at_risk_customers,icon:AlertTriangle}].map(c => (
              <Card key={c.label}><CardContent className="pt-4 pb-4"><div className="flex items-center gap-2 mb-1"><c.icon className="size-3.5 text-muted-foreground" /><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p></div><p className="text-xl font-bold">{c.value}</p></CardContent></Card>
            ))}
          </div>
        )}
        <Card><CardHeader><CardTitle className="text-[15px]">Revenue Trend (Last 30 Days)</CardTitle></CardHeader><CardContent>
          {trends.length === 0 ? <p className="text-[13px] text-muted-foreground py-4">No revenue data in the selected range.</p>
          : <div className="flex items-end gap-1 h-32">{trends.map((t: any, i: number) => <div key={i} className="flex-1 bg-foreground/20 rounded-t" style={{ height: `${Math.max(5, (t.revenue / Math.max(...trends.map((x: any) => x.revenue))) * 100)}%` }} title={`${t.date}: $${t.revenue.toFixed(2)}`} />)}</div>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-[15px]">Payment Method Distribution</CardTitle></CardHeader><CardContent className="p-0">
          {paymentMethods.length === 0 ? <p className="text-[13px] text-muted-foreground py-4 px-4">No payment data.</p>
          : <Table><TableHeader><TableRow><TableHead>Method</TableHead><TableHead>Type</TableHead><TableHead>Total Amount</TableHead><TableHead>Count</TableHead></TableRow></TableHeader><TableBody>
            {paymentMethods.map((pm: any) => (<TableRow key={pm.method_name}><TableCell className="font-medium">{pm.method_name}</TableCell><TableCell><Badge variant="outline">{pm.method_type}</Badge></TableCell><TableCell className="font-semibold tabular-nums">${pm.total_amount.toFixed(2)}</TableCell><TableCell className="tabular-nums">{pm.count}</TableCell></TableRow>))}
          </TableBody></Table>}
        </CardContent></Card>
      </>}
    </div>
  );
}
