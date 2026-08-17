import React, { useState } from 'react';
import { DateRangeKey } from '../types/reports.types';
import { reportsService } from '../services/reportsService';
import { businessReportExportService, DetailedReportData } from '../services/businessReportExportService';
import { ReportDataDiagnosticPanel } from './ReportDataDiagnosticPanel';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  AlertCircle,
  Loader2,
  Eye,
  X,
} from 'lucide-react';

interface BusinessReportGeneratorWidgetProps {
  userRole?: string;
  selectedRange?: DateRangeKey;
}

export const BusinessReportGeneratorWidget: React.FC<BusinessReportGeneratorWidgetProps> = ({ userRole = 'OWNER', selectedRange }) => {
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>(selectedRange || 'THIS_MONTH');

  React.useEffect(() => {
    if (selectedRange) {
      setDateRangeKey(selectedRange);
    }
  }, [selectedRange]);
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [format, setFormat] = useState<'EXCEL' | 'PDF'>('EXCEL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<DetailedReportData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Strict role protection: STAFF and TECHNICIAN are barred from viewing/downloading owner reports
  if (userRole === 'STAFF' || userRole === 'TECHNICIAN') {
    return null;
  }

  const quickRanges: { key: DateRangeKey; label: string }[] = [
    { key: 'TODAY', label: 'Today' },
    { key: 'YESTERDAY', label: 'Yesterday' },
    { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
    { key: 'LAST_10_DAYS', label: 'Last 10 Days' },
    { key: 'LAST_30_DAYS', label: 'Last 30 Days' },
    { key: 'THIS_MONTH', label: 'This Month' },
    { key: 'LAST_MONTH', label: 'Last Month' },
    { key: 'CUSTOM', label: 'Custom Date Range' },
  ];

  const getBounds = () => {
    setValidationError(null);
    try {
      return reportsService.getDateRangeBounds(dateRangeKey, customStartDate, customEndDate);
    } catch (err: any) {
      setValidationError(err.message || 'Invalid date range.');
      return null;
    }
  };

  const handleDownload = async () => {
    const bounds = getBounds();
    if (!bounds) return;

    try {
      setIsGenerating(true);
      const data = await businessReportExportService.fetchReportData(bounds);

      if (format === 'EXCEL') {
        businessReportExportService.exportToExcel(data);
      } else {
        businessReportExportService.exportToPDF(data);
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      setValidationError(err.message || 'Failed to generate business report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    const bounds = getBounds();
    if (!bounds) return;

    try {
      setIsPreviewLoading(true);
      setValidationError(null);
      const data = await businessReportExportService.fetchReportData(bounds);
      setPreviewData(data);
      setIsPreviewOpen(true);
    } catch (err: any) {
      console.error('Error fetching preview:', err);
      setValidationError(err.message || 'Failed to load report preview.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-md overflow-hidden my-4">
      <CardHeader className="p-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <span>Business Report Generator</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Generate and download comprehensive Excel (.xlsx) or PDF (.pdf) financial reports for any selected period.
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
          OWNER EXCLUSIVE
        </span>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {validationError && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 1. Reporting Period Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>1. Select Reporting Period</span>
          </label>

          <div className="flex flex-wrap gap-1.5">
            {quickRanges.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDateRangeKey(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all pressable ${
                  dateRangeKey === opt.key
                    ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground border border-border/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {dateRangeKey === 'CUSTOM' && (
            <div className="p-3 bg-muted/20 border border-border rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-2 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">From Date:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">To Date:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Temporary Developer Diagnostic Trace Panel */}
        <ReportDataDiagnosticPanel
          dateRangeKey={dateRangeKey}
          customStart={customStartDate}
          customEnd={customEndDate}
        />

        {/* 2. Format Selection */}
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-sky-500" />
            <span>2. Select Export Format</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setFormat('EXCEL')}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 pressable ${
                format === 'EXCEL'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/10 shadow-xs'
                  : 'border-border bg-card hover:bg-muted/40'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">Excel Workbook (.xlsx)</p>
                <p className="text-[10px] text-muted-foreground">
                  Includes Summary, Sales, Repairs, Worker Performance, Inventory, Purchases & Payments sheets
                </p>
              </div>
            </div>

            <div
              onClick={() => setFormat('PDF')}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 pressable ${
                format === 'PDF'
                  ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/10 shadow-xs'
                  : 'border-border bg-card hover:bg-muted/40'
              }`}
            >
              <FileText className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">PDF Document (.pdf)</p>
                <p className="text-[10px] text-muted-foreground">
                  Executive summary tables formatted for desktop & mobile download
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={isGenerating || isPreviewLoading}
            className="flex items-center gap-1.5 text-xs pressable"
          >
            {isPreviewLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-sky-500" />
            )}
            <span>Preview Report</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownload}
            disabled={isGenerating || isPreviewLoading}
            className="flex items-center gap-1.5 text-xs pressable bg-primary text-primary-foreground font-bold"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download Business Report ({format})</span>
          </Button>
        </div>
      </CardContent>

      {/* Preview Modal */}
      {isPreviewOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-sky-500" />
                  <span>Report Summary Preview</span>
                </h3>
                <p className="text-[11px] text-muted-foreground font-semibold">
                  Reporting Period: {previewData.periodLabel}
                </p>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* 1. SEPARATED FINANCIAL OVERVIEW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Sales Performance Card */}
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1.5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Sales / POS Performance
                  </span>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-muted-foreground">Sales Revenue:</span>
                    <strong className="text-emerald-600 font-bold">{formatCurrency(previewData.salesSummary.totalRevenue, 'INR')}</strong>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted-foreground">Product Cost:</span>
                    <span className="text-destructive">-{formatCurrency(previewData.salesSummary.totalCost, 'INR')}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono pt-1 border-t border-border/50">
                    <span className="font-bold text-foreground">Product Profit:</span>
                    <strong className="text-primary font-bold">{formatCurrency(previewData.salesSummary.totalProfit, 'INR')}</strong>
                  </div>
                </div>

                {/* Repair Performance Card */}
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1.5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Repair Service Performance
                  </span>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-muted-foreground">Repair Revenue:</span>
                    <strong className="text-emerald-600 font-bold">{formatCurrency(previewData.repairSummary.totalServiceRevenue, 'INR')}</strong>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted-foreground">Parts Cost:</span>
                    <span className="text-destructive">-{formatCurrency(previewData.repairSummary.totalPartsCost, 'INR')}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono pt-1 border-t border-border/50">
                    <span className="font-bold text-foreground">Net Repair Profit:</span>
                    <strong className="text-primary font-bold">{formatCurrency(previewData.repairSummary.netRepairProfit, 'INR')}</strong>
                  </div>
                </div>
              </div>

              {/* 2. PAYMENT COLLECTION BY CHANNEL */}
              <div className="p-3 rounded-xl bg-muted/20 border border-border space-y-2">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                  Payment Collection Summary
                </span>
                <div className="grid grid-cols-3 gap-2 font-mono text-center text-[11px]">
                  <div className="p-2 rounded bg-background border border-border">
                    <span className="text-muted-foreground block text-[10px]">Cash</span>
                    <strong className="text-foreground">{formatCurrency(previewData.paymentSummary.totalCash, 'INR')}</strong>
                  </div>
                  <div className="p-2 rounded bg-background border border-border">
                    <span className="text-muted-foreground block text-[10px]">UPI</span>
                    <strong className="text-foreground">{formatCurrency(previewData.paymentSummary.totalUpi, 'INR')}</strong>
                  </div>
                  <div className="p-2 rounded bg-background border border-border">
                    <span className="text-muted-foreground block text-[10px]">Card</span>
                    <strong className="text-foreground">{formatCurrency(previewData.paymentSummary.totalCard, 'INR')}</strong>
                  </div>
                </div>
              </div>

              {/* 3. WORKER PERFORMANCE PREVIEW */}
              {previewData.workerPerformance.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Worker Service Performance ({previewData.workerPerformance.length} Workers)
                  </span>
                  <div className="space-y-1">
                    {previewData.workerPerformance.map((w, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between font-mono text-[11px]">
                        <div>
                          <strong className="text-foreground">{w.workerName}</strong>
                          <span className="text-muted-foreground ml-1.5 text-[10px]">({w.workerRole})</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-emerald-600 font-bold">{w.completedRepairs} jobs</span>
                          <span className="text-foreground">Revenue: {formatCurrency(w.serviceRevenue, 'INR')}</span>
                          <span className="text-primary font-bold">Tech: {formatCurrency(w.technicianShare, 'INR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. REPAIR STATUS WORKLOAD SUMMARY */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Repair Status Workload (Current Shop Pipeline)
                </span>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] text-center">
                  <div className="p-1.5 rounded bg-muted/40 border border-border">
                    <span className="text-muted-foreground block">Received</span>
                    <strong className="text-foreground">{previewData.repairStatusCounts['RECEIVED'] || 0}</strong>
                  </div>
                  <div className="p-1.5 rounded bg-muted/40 border border-border">
                    <span className="text-muted-foreground block">Diagnosing</span>
                    <strong className="text-foreground">{previewData.repairStatusCounts['DIAGNOSING'] || 0}</strong>
                  </div>
                  <div className="p-1.5 rounded bg-muted/40 border border-border">
                    <span className="text-muted-foreground block">In Repair</span>
                    <strong className="text-foreground">{previewData.repairStatusCounts['IN_REPAIR'] || 0}</strong>
                  </div>
                  <div className="p-1.5 rounded bg-muted/40 border border-border">
                    <span className="text-muted-foreground block">Testing</span>
                    <strong className="text-foreground">{previewData.repairStatusCounts['TESTING'] || 0}</strong>
                  </div>
                  <div className="p-1.5 rounded bg-muted/40 border border-border">
                    <span className="text-muted-foreground block">Ready</span>
                    <strong className="text-foreground">{previewData.repairStatusCounts['READY_FOR_PICKUP'] || 0}</strong>
                  </div>
                  <div className="p-1.5 rounded bg-muted/40 border border-border">
                    <span className="text-muted-foreground block">Delivered</span>
                    <strong className="text-emerald-600 font-bold">{previewData.repairStatusCounts['DELIVERED'] || 0}</strong>
                  </div>
                  <div className="p-1.5 rounded bg-muted/40 border border-border">
                    <span className="text-muted-foreground block">Cancelled</span>
                    <strong className="text-destructive font-bold">{previewData.repairStatusCounts['CANCELLED'] || 0}</strong>
                  </div>
                  <div className="p-1.5 rounded bg-muted/40 border border-border">
                    <span className="text-muted-foreground block">Parts Wait</span>
                    <strong className="text-amber-600 font-bold">{previewData.repairStatusCounts['WAITING_FOR_PARTS'] || 0}</strong>
                  </div>
                </div>
              </div>

              {/* OVERALL BUSINESS SUMMARY */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">TOTAL BUSINESS NET PROFIT (INR)</p>
                <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(previewData.overallSummary.totalBusinessProfit, 'INR')}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Total Business Revenue: {formatCurrency(previewData.overallSummary.totalBusinessRevenue, 'INR')} | Total Collected: {formatCurrency(previewData.overallSummary.totalMoneyCollected, 'INR')}
                </p>
              </div>
            </div>

            <div className="p-3 border-t border-border flex justify-end space-x-2 bg-muted/20">
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)}>
                Close Preview
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsPreviewOpen(false);
                  handleDownload();
                }}
                className="bg-primary text-primary-foreground font-bold"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                <span>Download Report ({format})</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
