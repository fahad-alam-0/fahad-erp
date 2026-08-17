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
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Sales Revenue (INR)</p>
                  <p className="text-base font-bold text-emerald-600 font-mono">
                    {formatCurrency(previewData.salesSummary.totalRevenue, 'INR')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{previewData.salesSummary.salesCount} Completed Sales</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Product Profit (INR)</p>
                  <p className="text-base font-bold text-primary font-mono">
                    {formatCurrency(previewData.salesSummary.totalProfit, 'INR')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Cost: {formatCurrency(previewData.salesSummary.totalCost, 'INR')}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Repair Revenue (INR)</p>
                  <p className="text-base font-bold text-emerald-600 font-mono">
                    {formatCurrency(previewData.repairSummary.totalServiceRevenue, 'INR')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{previewData.repairSummary.deliveredCount} Delivered Repairs</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Net Repair Profit (INR)</p>
                  <p className="text-base font-bold text-primary font-mono">
                    {formatCurrency(previewData.repairSummary.netRepairProfit, 'INR')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Parts Cost: {formatCurrency(previewData.repairSummary.totalPartsCost, 'INR')}</p>
                </div>
              </div>

              {/* Worker Performance Preview */}
              {previewData.workerPerformance.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <p className="text-[11px] uppercase font-bold text-muted-foreground">Worker Repair Performance</p>
                  <div className="space-y-1">
                    {previewData.workerPerformance.map((w, idx) => (
                      <div key={idx} className="p-2 rounded bg-muted/20 border border-border/50 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="font-bold text-foreground">{w.workerName}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">({w.workerRole})</span>
                        </div>
                        <div>
                          <span className="text-emerald-600 font-bold">{w.completedRepairs} jobs</span>
                          <span className="text-muted-foreground ml-2">Net: {formatCurrency(w.netProfit, 'INR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">TOTAL BUSINESS NET PROFIT (INR)</p>
                <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(previewData.salesSummary.totalProfit + previewData.repairSummary.netRepairProfit, 'INR')}
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
