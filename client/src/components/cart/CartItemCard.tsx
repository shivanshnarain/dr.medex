import React from "react";
import { Link } from "react-router-dom";
import { Plus, Minus, Trash2 } from "lucide-react";
import { CartItem } from "../../types";
import { useCurrency } from "../../context/CurrencyContext";
import { renderBrandTitle } from "../BrandTitle";
import { extractImageUrl, optimizeCloudinaryUrl } from "../../lib/imageUtils";

export interface CartItemCardProps {
  item: CartItem;
  onUpdateQuantity?: (productId: string, quantity: number) => void;
  onRemove?: (productId: string) => void;
  onItemClick?: () => void;
  showStepper?: boolean; // defaults to true
  compact?: boolean;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80";

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  onItemClick,
  showStepper = true,
  compact = false
}) => {
  const { formatPrice } = useCurrency();
  const { product, quantity } = item;

  // Extract clean product image with robust fallback and Cloudinary optimization
  const rawItemImage =
    (Array.isArray(product.images) && extractImageUrl(product.images[0])) ||
    extractImageUrl(product.primaryImage) ||
    (Array.isArray(product.galleryImages) && extractImageUrl(product.galleryImages[0])) ||
    FALLBACK_IMAGE;
  const itemImage = optimizeCloudinaryUrl(rawItemImage, 600) || FALLBACK_IMAGE;

  const availableStock =
    typeof product.stock === "number"
      ? product.stock
      : typeof (product as any).stockQuantity === "number"
      ? (product as any).stockQuantity
      : 100;
  const maxQty = Math.min(50, Math.max(1, availableStock));

  // Quantity-adjusted total price = basePrice * quantity
  const lineTotalPrice = (product.basePrice || 0) * quantity;

  return (
    <div className="flex gap-3 sm:gap-4 items-start py-2.5 group w-full">
      {/* LEFT SIDE — PRODUCT IMAGE: Natural Intrinsic Proportions (no square box/frame, rounded corners on image itself) */}
      <Link
        to={`/product/${product.slug}`}
        onClick={onItemClick}
        className="shrink-0 block self-start max-w-[80px] sm:max-w-[100px] flex items-center justify-center"
      >
        <img
          src={itemImage}
          alt={product.title}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
          }}
          className="max-h-20 sm:max-h-24 w-auto h-auto max-w-full object-contain rounded-lg"
        />
      </Link>

      {/* RIGHT SIDE — PRODUCT DETAILS */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
        <div>
          {/* Product Title & Red Delete/Trash Icon (No redundant DR.MEDEX heading) */}
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/product/${product.slug}`}
              onClick={onItemClick}
              className="text-xs sm:text-sm font-bold text-[#111111] hover:text-[#2D5A4A] leading-snug transition-colors flex-1 whitespace-normal break-words"
            >
              {renderBrandTitle(product.title)}
            </Link>

            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(product.id)}
                className="p-1 -mr-1 -mt-0.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                title="Remove item"
                aria-label="Remove item"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Quantity-adjusted Price (NO per-unit multiplication line) */}
        <div className="mt-1.5 flex items-baseline justify-between gap-2 flex-wrap">
          <span className="text-sm sm:text-base font-extrabold text-[#2D5A4A] font-sans">
            {formatPrice(lineTotalPrice)}
          </span>

          {!showStepper && (
            <span className="text-2xs text-neutral-500 font-medium">
              Qty: <strong className="text-neutral-800">{quantity}</strong>
            </span>
          )}
        </div>

        {/* Quantity Stepper Selector */}
        {showStepper && onUpdateQuantity && (
          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex items-center border border-neutral-300 rounded-lg bg-neutral-50/80 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  if (quantity > 1) {
                    onUpdateQuantity(product.id, quantity - 1);
                  }
                }}
                disabled={quantity <= 1}
                className="px-2 py-1 text-neutral-600 hover:text-[#2D5A4A] hover:bg-neutral-200/60 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title={quantity <= 1 ? "Minimum quantity is 1" : "Decrease quantity"}
                aria-label="Decrease quantity"
              >
                <Minus size={12} strokeWidth={2.5} />
              </button>
              <span className="px-2.5 py-0.5 text-xs font-bold text-[#111111] min-w-[28px] text-center select-none font-mono">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (quantity < maxQty) {
                    onUpdateQuantity(product.id, quantity + 1);
                  }
                }}
                disabled={quantity >= maxQty}
                className="px-2 py-1 text-neutral-600 hover:text-[#2D5A4A] hover:bg-neutral-200/60 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title={
                  quantity >= maxQty
                    ? availableStock < 50
                      ? `Only ${availableStock} in stock`
                      : "Maximum allowed quantity is 50"
                    : "Increase quantity"
                }
                aria-label="Increase quantity"
              >
                <Plus size={12} strokeWidth={2.5} />
              </button>
            </div>

            {/* Stock status indicator */}
            {availableStock < 50 && quantity >= availableStock ? (
              <span className="text-3xs text-amber-700 font-semibold font-mono">
                Only {availableStock} in stock
              </span>
            ) : quantity >= 50 ? (
              <span className="text-3xs text-neutral-400 font-medium font-mono">
                Max (50)
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
