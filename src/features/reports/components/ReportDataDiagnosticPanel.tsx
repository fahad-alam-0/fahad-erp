import React, { useState, useEffect } from 'react';
import { DateRangeKey } from '../types/reports.types';
import { reportsService, DateRangeBounds } from '../services/reportsService';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Bug, RefreshCw } from 'lucide-react';

interface ReportDataDiagnosticPanelProps {
  dateRangeKey: DateRangeKey;
  customStart?: string;
  customEnd?: string;
}

export const ReportDataDiagnosticPanel: React.FC<ReportDataDiagnosticPanelProps> = ({
  dateRangeKey,
  customStart,
  customEnd,
}) => {
  const [bounds, setBounds] = useState<DateRangeBounds | null>(null);
  const [salesCount, setSalesCount] = useState<number>(0);
  const [salesRevenue, setSalesRevenue] = useState<number>(0);
  const [snapsCount, setSnapsCount] = useState<number>(0);
  const [snapsRevenue, setSnapsRevenue] = useState<number>(0);
  const [ownerShare, setOwnerShare] = useState<number>(0);
  const [techShare, setTechShare] = useState<number>(0);
  const [posPaymentsCount, setPosPaymentsCount] = useState<number>(0);
  const [repairPaymentsCount, setRepairPaymentsCount] = useState<number>(0);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostic = async () => {
    try {
      setIsLoading(true);
      const b = reportsService.getDateRangeBounds(dateRangeKey, customStart, customEnd);
      setBounds(b);

      const [sRes, pPayRes, snapRes, rPayRes, prodRes] = await Promise.all([
        supabase.from('sales').select('total_amount').gte('created_at', b.startInclusive).lt('created_at', b.endExclusive),
        supabase.from('sale_payments').select('amount').gte('created_at', b.startInclusive).lt('created_at', b.endExclusive),
        (supabase.from('repair_profit_snapshots') as any).select('service_revenue, owner_share, technician_share').gte('calculated_at', b.startInclusive).lt('calculated_at', b.endExclusive),
        supabase.from('repair_payments').select('amount').gte('created_at', b.startInclusive).lt('created_at', b.endExclusive),
        supabase.from('products').select('id').eq('is_active', true),
      ]);

      const sData = sRes.data || [];
      setSalesCount(sData.length);
      setSalesRevenue(sData.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0));

      setPosPaymentsCount((pPayRes.data || []).length);

      const snData = snapRes.data || [];
      setSnapsCount(snData.length);
      setSnapsRevenue(snData.reduce((sum: number, sn: any) => sum + Number(sn.service_revenue || 0), 0));
      setOwnerShare(snData.reduce((sum: number, sn: any) => sum + Number(sn.owner_share || 0), 0));
      setTechShare(snData.reduce((sum: number, sn: any) => sum + Number(sn.technician_share || 0), 0));

      setRepairPaymentsCount((rPayRes.data || []).length);
      setProductsCount((prodRes.data || []).length);
    } catch (err) {
      console.error('Diagnostic run failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, [dateRangeKey, customStart, customEnd]);

  if (!bounds) return null;

  return (
    <Card className="border-amber-500/40 bg-amber-500/5 my-4 overflow-hidden">
      <CardHeader className="p-3 border-b border-amber-500/20 flex flex-row items-center justify-between bg-amber-500/10">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-500" />
          <span>Report Data Validation Panel (Developer Trace)</span>
        </CardTitle>
        <button
          onClick={runDiagnostic}
          disabled={isLoading}
          className="text-xs font-semibold px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 rounded flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Re-run Trace</span>
        </button>
      </CardHeader>

      <CardContent className="p-3 text-[11px] font-mono space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-amber-500/20 pb-2">
          <div>
            <span className="text-muted-foreground">Selected Range: </span>
            <span className="font-bold text-foreground">{bounds.periodLabel}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Timezone: </span>
            <span className="font-bold text-emerald-600">Asia/Kolkata (+05:30)</span>
          </div>
          <div>
            <span className="text-muted-foreground">startInclusive: </span>
            <span className="text-foreground">{bounds.startInclusive}</span>
          </div>
          <div>
            <span className="text-muted-foreground">endExclusive: </span>
            <span className="text-foreground">{bounds.endExclusive}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="p-2 rounded bg-background/50 border border-border">
            <p className="text-[10px] text-muted-foreground font-bold">SALES QUERY</p>
            <p className="font-bold text-foreground">{salesCount} rows</p>
            <p className="text-emerald-600 font-bold">{salesRevenue.toLocaleString('en-IN')}</p>
          </div>

          <div className="p-2 rounded bg-background/50 border border-border">
            <p className="text-[10px] text-muted-foreground font-bold">PROFIT SNAPSHOTS</p>
            <p className="font-bold text-foreground">{snapsCount} rows</p>
            <p className="text-emerald-600 font-bold">{snapsRevenue.toLocaleString('en-IN')}</p>
          </div>

          <div className="p-2 rounded bg-background/50 border border-border">
            <p className="text-[10px] text-muted-foreground font-bold">PROFIT SHARES</p>
            <p className="text-foreground font-bold">Owner: {ownerShare.toLocaleString('en-IN')}</p>
            <p className="text-foreground font-bold">Tech: {techShare.toLocaleString('en-IN')}</p>
          </div>

          <div className="p-2 rounded bg-background/50 border border-border">
            <p className="text-[10px] text-muted-foreground font-bold">PAYMENTS & PRODUCTS</p>
            <p className="text-foreground">POS Pay: {posPaymentsCount} rows</p>
            <p className="text-foreground">Repair Pay: {repairPaymentsCount} rows</p>
            <p className="text-foreground">Active Prods: {productsCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
