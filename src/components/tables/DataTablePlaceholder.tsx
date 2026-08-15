import React from 'react';

interface DataTableProps {
  columns: string[];
  title: string;
}

export const DataTablePlaceholder: React.FC<DataTableProps> = ({ columns, title }) => {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border font-semibold text-sm">{title} Table</div>
      <table className="w-full text-left text-sm">
        <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="p-3">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td colSpan={columns.length} className="p-6 text-center text-muted-foreground italic">
              Placeholder data table for {title}. Business logic and queries ready for integration.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
