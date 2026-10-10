import React, { useState } from "react";
import { Archive, Trash2, X, ShieldAlert } from "lucide-react";
import { Product } from "../../types";

interface DeleteProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmArchive: (product: Product) => Promise<void>;
  onConfirmPermanentDelete: (product: Product) => Promise<void>;
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirmArchive,
  onConfirmPermanentDelete
}) => {
  const [deleteMode, setDeleteMode] = useState<"archive" | "permanent">("archive");
  const [confirmText, setConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !product) return null;

  const handleAction = async () => {
    setIsProcessing(true);
    try {
      if (deleteMode === "archive") {
        await onConfirmArchive(product);
      } else {
        if (confirmText !== "DELETE") {
          alert("Please type 'DELETE' to confirm permanent removal.");
          setIsProcessing(false);
          return;
        }
        await onConfirmPermanentDelete(product);
      }
      onClose();
    } catch (e) {
      console.error("Delete action failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#EAEAEA] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white text-black">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-black" />
            <h3 className="font-bold text-sm sm:text-base font-mono uppercase tracking-wider">
              Product Removal Management
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-black"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
            <span className="text-3xs uppercase font-bold text-neutral-500 font-mono block">
              Target Product:
            </span>
            <p className="text-xs sm:text-sm font-bold text-black mt-1">
              {product.title}
            </p>
            <p className="text-3xs font-mono text-neutral-500 mt-1">
              SKU: {product.sku} | ID: {product.id}
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-black block">
              Choose Removal Action:
            </label>

            <div
              onClick={() => setDeleteMode("archive")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                deleteMode === "archive"
                  ? "border-black bg-neutral-50"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <div className="flex items-start gap-3">
                <Archive size={18} className="text-black shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-black">
                      Archive Product (Recommended)
                    </span>
                    <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-neutral-200 text-black">
                      SAFE
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    Immediately unpublishes and hides the product from the storefront. Preserves database records to guarantee historical orders and audit tracking never break.
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => setDeleteMode("permanent")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                deleteMode === "permanent"
                  ? "border-black bg-neutral-100"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <div className="flex items-start gap-3">
                <Trash2 size={18} className="text-black shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-black">
                      Delete this product permanently
                    </span>
                    <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-black text-white">
                      IRREVERSIBLE
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    Purges the record from the database. If this product was previously purchased in customer orders, deletion is blocked and converted to archive to protect historical records.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {deleteMode === "permanent" && (
            <div className="p-3.5 bg-neutral-50 border border-neutral-300 rounded-xl space-y-2">
              <label className="block text-3xs font-bold uppercase font-mono text-black">
                Type <span className="underline">DELETE</span> to confirm permanent removal:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 border border-black rounded-lg text-xs font-mono font-bold text-black focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="px-6 sm:px-8 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-semibold text-black hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing || (deleteMode === "permanent" && confirmText !== "DELETE")}
            onClick={handleAction}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-black hover:bg-neutral-800 disabled:opacity-40 transition-colors"
          >
            {isProcessing ? "Processing..." : deleteMode === "archive" ? "Confirm Archive" : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
