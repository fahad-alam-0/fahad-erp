import React from 'react';

export const FormPlaceholder: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className="p-4 border border-dashed border-border rounded-lg bg-card text-card-foreground">
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Form Module Placeholder</p>
      <h4 className="text-base font-medium">{title} Form</h4>
    </div>
  );
};
