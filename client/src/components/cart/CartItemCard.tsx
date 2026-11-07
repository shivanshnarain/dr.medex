import React from "react";
import { Link } from "react-router-dom";
import { Plus, Minus, X } from "lucide-react";
import { CartItem } from "../../types";
import { useCurrency } from "../../context/CurrencyContext";
import { renderBrandTitle } from "../BrandTitle";

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

  // Extract clean product image with robust fallback
  const itemImage =
    (Array.isArray(product.images) && product.images[0]) ||
    product.primaryImage ||
    (Array.isArray(product.galleryImages) && product.galleryImages[0]) ||
    FALLBACK_IMAGE;

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
    <div className="flex gap-3.5 sm:gap-4 items-start py-2 group w-full">
      {/* LEFT SIDE — PRODUCT IMAGE with #7AA05A container */}
      <Link
        to={`/product/${product.slug}`}
        onClick={onItemClick}
        className="shrink-0 block self-start w-20 sm:w-24 h-20 sm:h-24 rounded-xl border border-[#7AA05A]/50 hover:border-[#7AA05A] p-1.5 bg-neutral-50/60 flex items-center justify-center transition-colors overflow-hidden"
      >
        <img
          src={itemImage}
          alt={product.title}
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
          }}
          className="max-h-full max-w-full object-contain"
        />
      </Link>

      {/* RIGHT SIDE — PRODUCT DETAILS */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
        <div>
          {/* Brand Name */}
          <span className="text-3xs font-extrabold uppercase tracking-wider text-[#7AA05A] block leading-none mb-1">
            {product.brand || "DR.MEDEX"}
          </span>

          {/* Product Title & Remove (X) Button */}
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/product/${product.slug}`}
              onClick={onItemClick}
              className="text-xs sm:text-sm font-bold text-[#111111] hover:text-[#2D5A4A] leading-snug transition-colors flex-1 line-clamp-2 break-words"
            >
              {renderBrandTitle(product.title)}
            </Link>

            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(product.id)}
                className="p-1 -mr-1 -mt-0.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                title="Remove item"
                aria-label={`Remove ${product.title} from cart`}
              >
                <X size={16} strokeWidth={2.2} />
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
