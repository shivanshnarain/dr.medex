import React, { useState } from "react";
import { Trash2, X, AlertTriangle, Loader2, Archive, ShieldCheck } from "lucide-react";
import { Product } from "../../types";

interface DeleteProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmPermanentDelete: (product: Product) => Promise<boolean | void>;
  onArchiveProduct?: (product: Product) => Promise<boolean | void>;
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirmPermanentDelete,
  onArchiveProduct
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const hasOrders = Boolean((product as any).hasOrders);

  const handleAction = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      if (hasOrders) {
        if (onArchiveProduct) {
          const ok = await onArchiveProduct(product);
          if (ok !== false) onClose();
        }
      } else {
        const ok = await onConfirmPermanentDelete(product);
        if (ok !== false) onClose();
      }
    } catch (e: any) {
      console.error("Delete/retire action failed:", e);
      setActionError(e?.message || "Operation failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0D4C3C] text-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between bg-black/20 text-white">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasOrders ? "bg-[#FFD400]/20 text-[#FFD400]" : "bg-[#C62828]/20 text-[#FF8A80]"}`}>
              {hasOrders ? <Archive size={16} /> : <Trash2 size={16} />}
            </div>
            <h3 className="font-bold text-sm sm:text-base font-mono uppercase tracking-wider text-white">
              {hasOrders ? "Retire Product from Catalogue" : "Confirm Permanent Deletion"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/60 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-white/10 border border-white/15 rounded-xl">
            <span className="text-3xs uppercase font-bold text-white/70 font-mono block">
              {hasOrders ? "Product To Be Retired from Catalogue:" : "Product To Be Deleted:"}
            </span>
            <p className="text-sm font-bold text-white mt-1">
              {product.title || product.productName}
            </p>
            <p className="text-3xs font-mono text-white/70 mt-1">
              SKU: <span className="text-[#FFD400] font-semibold">{product.sku || (product as any).SKU || "N/A"}</span> | ID: {product.id}
            </p>
          </div>

          {hasOrders ? (
            <div className="p-4 bg-[#FFD400]/10 border border-[#FFD400]/30 rounded-xl flex items-start gap-3">
              <ShieldCheck size={18} className="text-[#FFD400] shrink-0 mt-0.5" />
              <div className="text-xs text-white leading-relaxed">
                <p className="font-bold text-[#FFD400]">Customer Order History Protected</p>
                <p className="mt-1 text-white/90">
                  This product is referenced in existing customer orders. To preserve business records, payment compliance, and order tracking history, it will be <strong>safely retired and removed from the active catalogue</strong>.
                </p>
                <div className="mt-2 text-[11px] text-white/80 space-y-0.5 font-mono">
                  <p>• Removed from active storefront, search, and category listings.</p>
                  <p>• Cannot be purchased as a new product.</p>
                  <p>• All historical customer orders, payments, and receipt snapshots remain 100% intact.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#C62828]/20 border border-[#C62828]/40 rounded-xl flex items-start gap-3">
              <AlertTriangle size={18} className="text-[#FF8A80] shrink-0 mt-0.5" />
              <div className="text-xs text-white leading-relaxed">
                <p className="font-bold text-[#FF8A80]">Warning: This action is permanent and irreversible.</p>
                <p className="mt-1 text-white/90">
                  This product has no existing customer orders. Confirming will permanently delete this product from MongoDB Atlas, local storage, and delete all exclusively owned Cloudinary images.
                </p>
              </div>
            </div>
          )}

          {actionError && (
            <div className="p-3.5 bg-[#C62828]/30 border border-[#C62828] rounded-xl text-xs text-white font-medium">
              {actionError}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/15 bg-black/20 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2 border border-white/20 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleAction}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-2 shadow-xs ${
              hasOrders ? "bg-[#FFD400] text-black hover:bg-[#FFE04D]" : "bg-[#C62828] hover:bg-[#B71C1C]"
            } disabled:opacity-50`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{hasOrders ? "Retiring..." : "Deleting..."}</span>
              </>
            ) : hasOrders ? (
              <>
                <Archive size={14} />
                <span>Retire from Catalogue</span>
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


