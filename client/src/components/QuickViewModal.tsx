import React, { useState } from "react";
import { Link } from "react-router-dom";
import { X, ShoppingCart, Heart, ArrowRight, Check, FileText } from "lucide-react";
import { Product } from "../types";
import { useCurrency } from "../context/CurrencyContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenQuote: (product: Product) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, onClose, onOpenQuote }) => {
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  if (!product) return null;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const isSaved = isInWishlist(product.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-6">
        <div onClick={onClose} className="fixed inset-0 bg-[#000000]/60 backdrop-blur-xs transition-opacity" />

        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-3xl animate-in zoom-in-95 duration-200 border border-[#EAEAEA]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-neutral-400 hover:text-[#111111] bg-white/90 rounded-full hover:bg-neutral-100 transition-colors border border-[#EAEAEA]"
          >
            <X size={18} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8">
            {/* Gallery Column */}
            <div>
              <div className="aspect-square bg-[#F9F9F9] rounded-xl overflow-hidden border border-[#EAEAEA] mb-3 relative flex items-center justify-center p-4">
                <img
                  src={product.images[activeImageIndex] || product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-contain object-center transition-all duration-300"
                />
                <span className="absolute top-3 left-3 bg-white/95 text-[#111111] text-3xs font-bold px-2.5 py-1 rounded-md border border-[#EAEAEA] tracking-wider">
                  ISO 13485 CERTIFIED
                </span>
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2.5">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all p-1 bg-[#F9F9F9] ${
                        activeImageIndex === idx ? "border-[#111111] shadow-xs" : "border-[#EAEAEA] opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="Angle" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Summary Column */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5 text-3xs text-neutral-500 uppercase tracking-wider font-semibold">
                  <span className="text-[#111111] font-bold">{product.brand}</span>
                  <span>•</span>
                  <span className="font-mono text-neutral-400">SKU: {product.sku}</span>
                </div>

                <h3 className="text-lg font-bold text-[#111111] leading-snug">
                  {product.title}
                </h3>

                {/* Price Display */}
                <div className="mt-3 flex items-baseline gap-2.5">
                  <span className="text-2xl font-black text-[#111111]">
                    {formatPrice(product.basePrice)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xs text-neutral-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  <span className="text-3xs font-semibold px-2 py-0.5 bg-[#EAF5EF] text-[#145A38] rounded-md border border-[#1F7A4D]/20">
                    In Stock ({product.stock} units)
                  </span>
                </div>

                <p className="text-xs text-neutral-600 mt-3 line-clamp-3 leading-relaxed">
                  {product.shortDescription}
                </p>

                {/* Key Spec Snippet */}
                <div className="mt-4 p-3.5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] text-xs space-y-1.5">
                  <div className="text-3xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                    Key Specifications
                  </div>
                  {Object.entries(product.specifications).slice(0, 3).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-neutral-700 text-2xs">
                      <span className="text-neutral-500">{key}:</span>
                      <span className="font-semibold text-right text-[#111111]">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-[#EAEAEA] space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-[#EAEAEA] rounded-lg bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 text-neutral-500 hover:text-[#111111] hover:bg-[#F7F7F7] rounded-l-lg font-bold"
                    >
                      -
                    </button>
                    <span className="px-3 py-2 text-xs font-bold text-[#111111]">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 text-neutral-500 hover:text-[#111111] hover:bg-[#F7F7F7] rounded-r-lg font-bold"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors ${
                      isAdded
                        ? "bg-[#1F7A4D] text-white"
                        : "bg-[#111111] hover:bg-[#1F7A4D] text-white"
                    }`}
                  >
                    {isAdded ? <Check size={16} /> : <ShoppingCart size={16} />}
                    <span>{isAdded ? "Added to Cart" : "Add to Cart"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    className={`p-3 rounded-lg border transition-colors ${
                      isSaved ? "bg-rose-50 border-rose-200 text-rose-600" : "border-[#EAEAEA] text-neutral-400 hover:text-rose-600 hover:bg-neutral-50"
                    }`}
                    title="Save to Wishlist"
                  >
                    <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenQuote(product);
                    }}
                    className="text-[#111111] hover:text-[#1F7A4D] font-bold flex items-center gap-1.5 text-2xs transition-colors"
                  >
                    <FileText size={13} />
                    <span>Request Institutional B2B Quote</span>
                  </button>

                  <Link
                    to={`/product/${product.slug}`}
                    onClick={onClose}
                    className="text-neutral-600 font-semibold hover:text-[#111111] flex items-center gap-1 text-2xs transition-colors"
                  >
                    <span>Full Technical Datasheet</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
