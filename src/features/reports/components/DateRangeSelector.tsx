import React from 'react';
import { DateRangeKey } from '../types/reports.types';
import { Calendar } from 'lucide-react';

interface DateRangeSelectorProps {
  selectedRange: DateRangeKey;
  onRangeChange: (range: DateRangeKey) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
}) => {
  const options: { key: DateRangeKey; label: string }[] = [
    { key: 'TODAY', label: 'Today' },
    { key: 'YESTERDAY', label: 'Yesterday' },
    { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
    { key: 'LAST_10_DAYS', label: 'Last 10 Days' },
    { key: 'LAST_30_DAYS', label: 'Last 30 Days' },
    { key: 'THIS_MONTH', label: 'This Month' },
    { key: 'LAST_MONTH', label: 'Last Month' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-muted/40 rounded-xl border border-border">
      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 px-2">
        <Calendar className="w-3.5 h-3.5 text-primary" />
        <span>Period:</span>
      </span>
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onRangeChange(opt.key)}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all pressable ${
            selectedRange === opt.key
              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
