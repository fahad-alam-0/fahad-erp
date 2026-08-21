import React, { useState } from 'react';
import { Product } from '../types/inventory.types';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';

interface DeleteProductModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirmDelete: (product: Product) => Promise<void>;
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  isOpen,
  product,
  onClose,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleDelete = async () => {
    try {
      setError(null);
      setIsDeleting(true);
      await onConfirmDelete(product);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-destructive/10">
          <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Confirm Permanent Deletion</span>
          </h3>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-base font-bold text-foreground">
              Delete {product.name} permanently?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This action cannot be undone. Permanent deletion will remove this product from your inventory directory.
            </p>
          </div>

          <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product Code / SKU:</span>
              <span className="font-semibold text-foreground">{product.product_code || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Stock:</span>
              <span className="font-semibold text-foreground">{product.stock_quantity} {product.unit}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="pressable font-semibold"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Permanently'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
