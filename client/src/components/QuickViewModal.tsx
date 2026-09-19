import React, { useState } from "react";
import { Link } from "react-router-dom";
import { X, ShoppingCart, ShieldCheck, Heart, ArrowRight, Check, FileText } from "lucide-react";
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
  const { formatPrice, currentCurrency } = useCurrency();
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
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" />

        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-3xl animate-in zoom-in-95 duration-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-700 bg-white/80 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* Gallery Column */}
            <div>
              <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-100 mb-3 relative">
                <img
                  src={product.images[activeImageIndex] || product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover object-center transition-all duration-300"
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-sky-800 text-3xs font-bold px-2 py-0.5 rounded-md border border-slate-200">
                  ISO 13485 CERTIFIED
                </span>
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        activeImageIndex === idx ? "border-sky-600 shadow-xs" : "border-slate-200 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="Angle" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Summary Column */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 text-3xs text-slate-500 uppercase tracking-wider font-semibold">
                  <span className="text-sky-700">{product.brand}</span>
                  <span>•</span>
                  <span className="font-mono">SKU: {product.sku}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {product.title}
                </h3>

                {/* Price Display */}
                <div className="mt-3 flex items-baseline gap-2.5">
                  <span className="text-xl font-black text-slate-900">
                    {formatPrice(product.basePrice)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  <span className="text-3xs font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                    In Stock ({product.stock} units)
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-2.5 line-clamp-3 leading-relaxed">
                  {product.shortDescription}
                </p>

                {/* Key Spec Snippet */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Key Specifications
                  </div>
                  {Object.entries(product.specifications).slice(0, 3).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-slate-700 text-2xs">
                      <span className="text-slate-500">{key}:</span>
                      <span className="font-semibold text-right">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-l-lg font-bold"
                    >
                      -
                    </button>
                    <span className="px-3 py-2 text-xs font-bold text-slate-800">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-r-lg font-bold"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="flex-1 py-2.5 px-4 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    {isAdded ? <Check size={16} /> : <ShoppingCart size={16} />}
                    <span>{isAdded ? "Added to Cart" : "Add to Cart"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    className={`p-2.5 rounded-lg border transition-colors ${
                      isSaved ? "bg-rose-50 border-rose-200 text-rose-600" : "border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50/40"
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
                    className="text-sky-700 font-bold hover:underline flex items-center gap-1 text-2xs"
                  >
                    <FileText size={13} />
                    <span>Request Institutional B2B Quote</span>
                  </button>

                  <Link
                    to={`/product/${product.slug}`}
                    onClick={onClose}
                    className="text-slate-600 font-semibold hover:text-slate-900 flex items-center gap-1 text-2xs"
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
