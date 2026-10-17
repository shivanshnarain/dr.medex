import React, { useState } from "react";
import { Trash2, X, AlertTriangle, Loader2 } from "lucide-react";
import { Product } from "../../types";

interface DeleteProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmPermanentDelete: (product: Product) => Promise<void>;
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirmPermanentDelete
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !product) return null;

  const handleAction = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onConfirmPermanentDelete(product);
      onClose();
    } catch (e) {
      console.error("Delete action failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-[#EAEAEA] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white text-black">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <Trash2 size={16} />
            </div>
            <h3 className="font-bold text-sm sm:text-base font-mono uppercase tracking-wider text-black">
              Confirm Permanent Deletion
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="text-neutral-400 hover:text-black cursor-pointer disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
            <span className="text-3xs uppercase font-bold text-neutral-500 font-mono block">
              Product To Be Deleted:
            </span>
            <p className="text-sm font-bold text-black mt-1">
              {product.title || product.productName}
            </p>
            <p className="text-3xs font-mono text-neutral-500 mt-1">
              SKU: {product.sku || "N/A"} | ID: {product.id}
            </p>
          </div>

          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed">
              <p className="font-bold">Warning: This action is permanent and irreversible.</p>
              <p className="mt-1">
                Confirming will permanently delete this product from MongoDB Atlas and delete all exclusively owned Cloudinary images.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleAction}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
          >
            {isProcessing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Permanently Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

