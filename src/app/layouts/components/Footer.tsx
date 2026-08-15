import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-4 px-6 border-t border-border text-center text-xs text-muted-foreground bg-card">
      &copy; {new Date().getFullYear()} Fahad ERP Systems. All rights reserved. Multi-Store Enterprise Edition.
    </footer>
  );
};
