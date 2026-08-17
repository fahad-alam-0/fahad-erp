import React, { useState } from 'react';
import { DateRangeKey } from '../types/reports.types';
import { reportsService } from '../services/reportsService';
import { businessReportExportService } from '../services/businessReportExportService';
import { Button } from '@/components/ui/button';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';

interface DownloadBusinessReportModalProps {
  isOpen: boolean;
  userRole?: string;
  onClose: () => void;
}

export const DownloadBusinessReportModal: React.FC<DownloadBusinessReportModalProps> = ({
  isOpen,
  userRole = 'OWNER',
  onClose,
}) => {
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [format, setFormat] = useState<'EXCEL' | 'PDF'>('EXCEL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OWNER Access Guard
  const isOwner = userRole === 'OWNER' || userRole === 'ADMIN' || !userRole;
  if (!isOpen || !isOwner || userRole === 'STAFF' || userRole === 'TECHNICIAN') {
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

  const validateDates = (): { valid: boolean; startDateStr: string; endDateStr: string; label: string } => {
    setValidationError(null);

    if (dateRangeKey === 'CUSTOM') {
      if (!customStartDate || !customEndDate) {
        setValidationError('Please select both From Date and To Date for custom report.');
        return { valid: false, startDateStr: '', endDateStr: '', label: '' };
      }

      if (customStartDate > customEndDate) {
        setValidationError('From Date cannot be after To Date.');
        return { valid: false, startDateStr: '', endDateStr: '', label: '' };
      }

      const bounds = reportsService.getDateRangeBounds('CUSTOM', customStartDate, customEndDate);
      return { valid: true, startDateStr: bounds.startDate, endDateStr: bounds.endDate, label: bounds.label };
    }

    const bounds = reportsService.getDateRangeBounds(dateRangeKey);
    return { valid: true, startDateStr: bounds.startDate, endDateStr: bounds.endDate, label: bounds.label };
  };

  const handleDownload = async () => {
    const check = validateDates();
    if (!check.valid) return;

    try {
      setIsGenerating(true);
      setSuccessMessage(null);

      // Fetch fresh real-time database metrics right at download moment
      const data = await businessReportExportService.fetchReportData(
        check.startDateStr,
        check.endDateStr,
        check.label
      );

      if (format === 'EXCEL') {
        businessReportExportService.exportToExcel(data);
      } else {
        businessReportExportService.exportToPDF(data);
      }

      setSuccessMessage('Business report downloaded successfully.');
      setTimeout(() => {
        setIsGenerating(false);
        setSuccessMessage(null);
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setValidationError(err.message || 'Failed to generate business report.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Download Business Report</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Choose the reporting period and file format.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {validationError && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Date Range Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>1. Reporting Period</span>
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

            {/* Custom Date Range Pickers */}
            {dateRangeKey === 'CUSTOM' && (
              <div className="p-3 bg-muted/20 border border-border rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-2 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">From:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">To:</label>
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

          {/* 2. Format Selection */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-500" />
              <span>2. File Format</span>
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
                  <p className="text-xs font-bold text-foreground">Excel (.xlsx)</p>
                  <p className="text-[10px] text-muted-foreground">6 multi-sheet workbook</p>
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
                  <p className="text-xs font-bold text-foreground">PDF (.pdf)</p>
                  <p className="text-[10px] text-muted-foreground">Formatted business summary</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end space-x-2 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDownload}
            disabled={isGenerating}
            className="bg-primary text-primary-foreground font-bold pressable flex items-center gap-1.5"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download Report ({format})</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
