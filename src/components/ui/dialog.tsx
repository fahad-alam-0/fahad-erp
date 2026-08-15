import React from 'react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card text-card-foreground border border-border rounded-lg max-w-lg w-full p-6 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm font-bold">
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
