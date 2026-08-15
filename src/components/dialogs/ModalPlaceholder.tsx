import React from 'react';
import { Dialog } from '@/components/ui/dialog';

export const ModalPlaceholder: React.FC<{ isOpen: boolean; onClose: () => void; title: string }> = ({
  isOpen,
  onClose,
  title,
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-muted-foreground">Placeholder dialog overlay for {title}.</p>
    </Dialog>
  );
};
