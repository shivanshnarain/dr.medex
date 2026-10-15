import { Product, Category } from "../types";
import rawFallbackProducts from "../data/fallbackProducts.json";
import rawFallbackCategories from "../data/fallbackCategories.json";

export const fallbackProducts: Product[] = (rawFallbackProducts as unknown) as Product[];
export const fallbackCategories: Category[] = (rawFallbackCategories as unknown) as Category[];

/**
 * Fetch all products with automatic fallback to verified local catalogue
 * if live API server is unreachable, undergoing maintenance, or in standalone mode.
 */
export async function getProducts(): Promise<{ products: Product[]; isFallback: boolean; error?: string }> {
  try {
    const res = await fetch("/api/products");
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
        return { products: data.products, isFallback: false };
      }
    }
  } catch (err: any) {
    console.warn("[productService] Live API fetch failed, activating catalogue fallback:", err.message);
  }

  // Graceful fallback: return verified active products preserving exact prices, images, specs, SKUs
  const activeFallback = fallbackProducts.filter((p) => (p.status || "ACTIVE") === "ACTIVE");
  return {
    products: activeFallback.length > 0 ? activeFallback : fallbackProducts,
    isFallback: true,
    error: "Live product server synchronizing"
  };
}

/**
 * Fetch all categories with automatic fallback
 */
export async function getCategories(): Promise<{ categories: Category[]; isFallback: boolean }> {
  try {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.categories) && data.categories.length > 0) {
        return { categories: data.categories, isFallback: false };
      }
    }
  } catch (err: any) {
    console.warn("[productService] Categories API fetch failed, activating fallback:", err.message);
  }

  return { categories: fallbackCategories, isFallback: true };
}

/**
 * Fetch product by slug with fallback lookup
 */
export async function getProductBySlug(slug: string): Promise<{ product: Product | null; isFallback: boolean }> {
  if (!slug) return { product: null, isFallback: false };

  try {
    const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.product) {
        return { product: data.product, isFallback: false };
      }
    }
  } catch (err: any) {
    console.warn("[productService] Product slug fetch failed, activating fallback lookup:", err.message);
  }

  const cleanSlug = slug.toLowerCase().trim();
  const match = fallbackProducts.find(
    (p) =>
      p.slug?.toLowerCase() === cleanSlug ||
      p.id?.toLowerCase() === cleanSlug ||
      p.sku?.toLowerCase() === cleanSlug
  );

  return { product: match || null, isFallback: true };
}
