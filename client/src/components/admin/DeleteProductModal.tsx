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
        <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between bg-[#111111] text-white">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-[#E57373]" />
            <h3 className="font-bold text-sm sm:text-base">
              Product Status & Removal Management
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#888888] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl">
            <span className="text-3xs uppercase font-bold text-[#777777] block">
              Target Product:
            </span>
            <p className="text-xs sm:text-sm font-bold text-[#111111] mt-1">
              {product.title}
            </p>
            <p className="text-3xs font-mono text-[#777777] mt-1">
              SKU: {product.sku} | ID: {product.id}
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-[#111111] block">
              Choose Removal Action:
            </label>

            <div
              onClick={() => setDeleteMode("archive")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                deleteMode === "archive"
                  ? "border-[#111111] bg-[#FAFAFA]"
                  : "border-[#EAEAEA] hover:border-[#CCCCCC]"
              }`}
            >
              <div className="flex items-start gap-3">
                <Archive size={18} className="text-[#1F7A4D] shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#111111]">
                      Archive Product (Recommended)
                    </span>
                    <span className="px-2 py-0.5 rounded text-3xs font-extrabold bg-[#EAF5EF] text-[#1F7A4D]">
                      SAFE
                    </span>
                  </div>
                  <p className="text-xs text-[#555555] mt-1 leading-relaxed">
                    Immediately unpublishes and hides the product from the storefront. Preserves database records to guarantee historical orders and audit tracking never break.
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => setDeleteMode("permanent")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                deleteMode === "permanent"
                  ? "border-[#DC2626] bg-[#FEF2F2]"
                  : "border-[#EAEAEA] hover:border-[#CCCCCC]"
              }`}
            >
              <div className="flex items-start gap-3">
                <Trash2 size={18} className="text-[#DC2626] shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#DC2626]">
                      Delete this product permanently?
                    </span>
                    <span className="px-2 py-0.5 rounded text-3xs font-extrabold bg-[#FEE2E2] text-[#DC2626]">
                      IRREVERSIBLE
                    </span>
                  </div>
                  <p className="text-xs text-[#555555] mt-1 leading-relaxed">
                    Completely purges the product from the database. If this product was previously purchased in customer orders, deletion will be blocked and converted to archive to protect financial records.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {deleteMode === "permanent" && (
            <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl space-y-2">
              <label className="block text-3xs font-bold uppercase text-[#991B1B]">
                Type <span className="font-mono underline">DELETE</span> to confirm permanent purge:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 border border-[#F87171] rounded-lg text-xs font-mono font-bold text-[#991B1B] focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
              />
            </div>
          )}
        </div>

        <div className="px-6 sm:px-8 py-4 border-t border-[#EAEAEA] bg-[#FAFAFA] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-[#EAEAEA] rounded-lg text-xs font-semibold text-[#111111] hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing || (deleteMode === "permanent" && confirmText !== "DELETE")}
            onClick={handleAction}
            className={`px-5 py-2.5 rounded-lg text-xs font-semibold text-white shadow-xs disabled:opacity-50 transition-colors ${
              deleteMode === "archive"
                ? "bg-[#111111] hover:bg-black"
                : "bg-[#DC2626] hover:bg-[#B91C1C]"
            }`}
          >
            {isProcessing ? "Executing..." : deleteMode === "archive" ? "Confirm Archive" : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
