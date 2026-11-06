import { Product, Category } from "../types";
import rawFallbackProducts from "../data/fallbackProducts.json";
import rawFallbackCategories from "../data/fallbackCategories.json";

export const fallbackProducts: Product[] = (rawFallbackProducts as unknown) as Product[];
export const fallbackCategories: Category[] = (rawFallbackCategories as unknown) as Category[];

// Client-side in-memory cache for high-speed instant navigation (60s TTL)
let memoryProductsCache: Product[] | null = null;
let lastProductsFetchTime = 0;
let memoryCategoriesCache: Category[] | null = null;
let lastCategoriesFetchTime = 0;
const CLIENT_CACHE_TTL_MS = 60000;

/**
 * Fetch all products with automatic fallback and in-memory caching
 */
export async function getProducts(forceRefresh = false): Promise<{ products: Product[]; isFallback: boolean; error?: string }> {
  const isFresh = memoryProductsCache && !forceRefresh && (Date.now() - lastProductsFetchTime < CLIENT_CACHE_TTL_MS);
  if (isFresh && memoryProductsCache && memoryProductsCache.length > 0) {
    return { products: memoryProductsCache, isFallback: false };
  }

  try {
    const res = await fetch("/api/products");
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
        memoryProductsCache = data.products;
        lastProductsFetchTime = Date.now();
        return { products: data.products, isFallback: false };
      }
    }
  } catch (err: any) {
    console.warn("[productService] Live API fetch failed, activating catalogue fallback:", err.message);
  }

  if (memoryProductsCache && memoryProductsCache.length > 0) {
    return { products: memoryProductsCache, isFallback: false };
  }

  // Graceful fallback: return verified active products preserving exact prices, images, specs, SKUs
  const activeFallback = fallbackProducts.filter((p) => {
    if ((p.status || "ACTIVE") !== "ACTIVE") return false;
    if (p.reviewStatus !== "CORRECT") return false;
    return true;
  });
  return {
    products: activeFallback.length > 0 ? activeFallback : fallbackProducts,
    isFallback: true,
    error: "Live product server synchronizing"
  };
}

/**
 * Fetch all categories with automatic fallback and caching
 */
export async function getCategories(forceRefresh = false): Promise<{ categories: Category[]; isFallback: boolean }> {
  const isFresh = memoryCategoriesCache && !forceRefresh && (Date.now() - lastCategoriesFetchTime < CLIENT_CACHE_TTL_MS);
  if (isFresh && memoryCategoriesCache && memoryCategoriesCache.length > 0) {
    return { categories: memoryCategoriesCache, isFallback: false };
  }

  try {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.categories) && data.categories.length > 0) {
        memoryCategoriesCache = data.categories;
        lastCategoriesFetchTime = Date.now();
        return { categories: data.categories, isFallback: false };
      }
    }
  } catch (err: any) {
    console.warn("[productService] Categories API fetch failed, activating fallback:", err.message);
  }

  return { categories: memoryCategoriesCache || fallbackCategories, isFallback: true };
}

/**
 * Fetch product by slug with in-memory instant retrieval and resilient fallback
 */
export async function getProductBySlug(slug: string): Promise<{ product: Product | null; isFallback: boolean }> {
  if (!slug) return { product: null, isFallback: false };

  const cleanSlug = String(slug).toLowerCase().trim().replace(/\/+$/, "").replace(/\.html$/i, "");

  // 1. Check in-memory product cache for instant 0ms retrieval
  if (memoryProductsCache && memoryProductsCache.length > 0) {
    const cachedMatch = memoryProductsCache.find(
      (p) =>
        p.slug?.toLowerCase() === cleanSlug ||
        p.id?.toLowerCase() === cleanSlug ||
        (p as any)._id?.toLowerCase() === cleanSlug ||
        p.sku?.toLowerCase() === cleanSlug
    );
    if (cachedMatch) {
      return { product: cachedMatch, isFallback: false };
    }
  }

  // Find fallback candidate in case API fails or returns 404
  const fallbackMatch = fallbackProducts.find(
    (p) =>
      p.slug?.toLowerCase() === cleanSlug ||
      p.id?.toLowerCase() === cleanSlug ||
      (p as any)._id?.toLowerCase() === cleanSlug ||
      p.sku?.toLowerCase() === cleanSlug
  );

  try {
    const res = await fetch(`/api/products/${encodeURIComponent(cleanSlug)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.product) {
        // Upsert into memory cache
        if (memoryProductsCache) {
          const idx = memoryProductsCache.findIndex((p) => p.id === data.product.id || p.slug === data.product.slug);
          if (idx !== -1) {
            memoryProductsCache[idx] = data.product;
          } else {
            memoryProductsCache.push(data.product);
          }
        }
        return { product: data.product, isFallback: false };
      }
    }
  } catch (err: any) {
    console.warn("[productService] Product slug fetch failed, activating fallback lookup:", err.message);
  }

  // Resilient fallback: Never drop to empty/404 if matching product exists in fallback catalog
  return { product: fallbackMatch || null, isFallback: true };
}
