'use client';
import React from 'react';
import { useOperationsAnalytics } from '@/hooks/useAnalyticsData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scissors, Package, Loader2, AlertTriangle } from 'lucide-react';

export default function OperationsPage() {
  const { data, isLoading } = useOperationsAnalytics();
  const d = data as any;
  const groomers = d?.groomerPerformance ?? [];
  const inv = d?.inventoryTurnover;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Operations Analytics</h1><p className="text-[13px] text-muted-foreground mt-1">Staff productivity, completion rates, and inventory turnover.</p></div>
      {isLoading ? <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading operations…</span></div>
      : <>
        {inv && (
          <div className="grid grid-cols-4 gap-4">
            {[{label:'Catalog Items',value:inv.total_items},{label:'Stock Movements',value:inv.total_movements},{label:'Stock Value',value:inv.total_stock_value},{label:'Low Stock Alerts',value:inv.low_stock_count}].map(c => (
              <Card key={c.label}><CardContent className="pt-4 pb-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p><p className="text-xl font-bold mt-1">{c.value}</p></CardContent></Card>
            ))}
          </div>
        )}
        <Card><CardHeader><CardTitle className="text-[15px] flex items-center gap-2"><Scissors className="size-4" /> Groomer Performance Leaderboard</CardTitle></CardHeader><CardContent className="p-0">
          {groomers.length === 0 ? <p className="text-[13px] text-muted-foreground py-4 px-4">No groomer data.</p>
          : <Table><TableHeader><TableRow><TableHead>Groomer</TableHead><TableHead>Appointments</TableHead><TableHead>Completed</TableHead><TableHead>Cancelled</TableHead><TableHead>No-Show</TableHead><TableHead>Revenue</TableHead><TableHead>Completion %</TableHead></TableRow></TableHeader><TableBody>
            {groomers.map((g: any) => (<TableRow key={g.staff_id}>
              <TableCell className="font-medium">{g.display_name}</TableCell>
              <TableCell className="tabular-nums">{g.appointment_count}</TableCell>
              <TableCell className="tabular-nums text-green-600">{g.completed_count}</TableCell>
              <TableCell className="tabular-nums text-red-600">{g.cancellation_count}</TableCell>
              <TableCell className="tabular-nums text-red-600">{g.no_show_count}</TableCell>
              <TableCell className="font-semibold tabular-nums">${g.total_revenue.toFixed(2)}</TableCell>
              <TableCell><Badge variant={g.completion_rate >= 75 ? 'default' : g.completion_rate >= 50 ? 'secondary' : 'destructive'}>{g.completion_rate.toFixed(0)}%</Badge></TableCell>
            </TableRow>))}
          </TableBody></Table>}
        </CardContent></Card>
        {inv && inv.low_stock_count > 0 && (
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-2 text-amber-600"><AlertTriangle className="size-4" /><span className="text-[13px] font-medium">{inv.low_stock_count} item(s) below reorder threshold (stock &lt; 10)</span></div></CardContent></Card>
        )}
      </>}
    </div>
  );
}
