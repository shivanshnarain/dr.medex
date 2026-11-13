import { Product, Category } from "../types";
import rawFallbackCategories from "../data/fallbackCategories.json";
import { getApiUrl } from "../lib/apiConfig";

export const fallbackCategories: Category[] = (rawFallbackCategories as unknown) as Category[];

// Client-side in-memory cache for high-speed instant navigation (60s TTL)
let memoryProductsCache: Product[] | null = null;
let lastProductsFetchTime = 0;
let memoryCategoriesCache: Category[] | null = null;
let lastCategoriesFetchTime = 0;
const memoryProductBySlugCache = new Map<string, { product: Product; ts: number }>();
const memoryCategoryProductsCache = new Map<string, { products: Product[]; ts: number }>();
const CLIENT_CACHE_TTL_MS = 60000;

// In-flight request deduplication maps/promises
let productsInFlight: Promise<{ products: Product[]; isFallback: boolean; error?: string }> | null = null;
let categoriesInFlight: Promise<{ categories: Category[]; isFallback: boolean }> | null = null;
const productBySlugInFlight = new Map<string, Promise<{ product: Product | null; isFallback: boolean }>>();
const categoryProductsInFlight = new Map<string, Promise<Product[]>>();

// On-demand lazy loader for fallbackProducts.json (split out of initial entry bundle)
let fallbackProductsPromise: Promise<Product[]> | null = null;
let loadedFallbackProducts: Product[] | null = null;

export async function getFallbackProducts(): Promise<Product[]> {
  if (loadedFallbackProducts) return loadedFallbackProducts;
  if (!fallbackProductsPromise) {
    fallbackProductsPromise = import("../data/fallbackProducts.json")
      .then((mod) => {
        const list = ((mod.default || mod) as unknown) as Product[];
        loadedFallbackProducts = Array.isArray(list) ? list : [];
        return loadedFallbackProducts;
      })
      .catch((err) => {
        console.warn("[productService] Failed to load fallbackProducts chunk:", err);
        fallbackProductsPromise = null;
        return [];
      });
  }
  return fallbackProductsPromise;
}

function normalizeLookupKey(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/\/+$/, "")
    .replace(/\.html$/i, "");
}

function findProductMatch(list: Product[], cleanKey: string): Product | undefined {
  return list.find(
    (p) =>
      p.slug?.toLowerCase() === cleanKey ||
      p.id?.toLowerCase() === cleanKey ||
      (p as any)._id?.toLowerCase() === cleanKey ||
      p.sku?.toLowerCase() === cleanKey
  );
}

function cacheProductEntries(product: Product, requestedSlug?: string) {
  const ts = Date.now();
  const keys = [
    requestedSlug,
    product.slug,
    product.id,
    (product as any)._id,
    product.sku
  ]
    .map((k) => (k ? normalizeLookupKey(String(k)) : ""))
    .filter(Boolean);

  for (const key of keys) {
    memoryProductBySlugCache.set(key, { product, ts });
  }
}

/**
 * Pre-warms the in-memory cache for a product so clicks and navigation resolve immediately
 */
export function prewarmProduct(product: Product) {
  if (product) {
    cacheProductEntries(product);
  }
}

export function getCachedProductsSync(): Product[] | null {
  if (memoryProductsCache && memoryProductsCache.length > 0) {
    return memoryProductsCache;
  }
  return null;
}

export function getCachedCategoriesSync(): Category[] | null {
  if (memoryCategoriesCache && memoryCategoriesCache.length > 0) {
    return memoryCategoriesCache;
  }
  return fallbackCategories;
}

export function getCachedProductBySlugSync(slug: string): Product | null {
  if (!slug) return null;
  const clean = normalizeLookupKey(slug);
  const direct = memoryProductBySlugCache.get(clean);
  if (direct && Date.now() - direct.ts < CLIENT_CACHE_TTL_MS * 5) {
    return direct.product;
  }
  if (memoryProductsCache && memoryProductsCache.length > 0) {
    const match = findProductMatch(memoryProductsCache, clean);
    if (match) return match;
  }
  return null;
}

/**
 * Fetch all products with request deduplication, in-memory caching, and async fallback
 */
export async function getProducts(
  forceRefresh = false
): Promise<{ products: Product[]; isFallback: boolean; error?: string }> {
  const isFresh =
    memoryProductsCache &&
    !forceRefresh &&
    Date.now() - lastProductsFetchTime < CLIENT_CACHE_TTL_MS;
  if (isFresh && memoryProductsCache && memoryProductsCache.length > 0) {
    return { products: memoryProductsCache, isFallback: false };
  }

  if (!forceRefresh && productsInFlight) {
    return productsInFlight;
  }

  const run = (async (): Promise<{ products: Product[]; isFallback: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
          memoryProductsCache = data.products;
          lastProductsFetchTime = Date.now();
          for (const p of data.products) {
            cacheProductEntries(p);
          }
          return { products: data.products, isFallback: false };
        }
      }
    } catch (err: any) {
      console.warn("[productService] Live API fetch failed, activating catalogue fallback:", err.message);
    }

    if (memoryProductsCache && memoryProductsCache.length > 0) {
      return { products: memoryProductsCache, isFallback: false };
    }

    const fallbackList = await getFallbackProducts();
    const activeFallback = fallbackList.filter((p) => {
      if ((p.status || "ACTIVE") !== "ACTIVE") return false;
      if (p.reviewStatus !== "CORRECT") return false;
      return true;
    });
    return {
      products: activeFallback.length > 0 ? activeFallback : fallbackList,
      isFallback: true,
      error: "Live product server synchronizing"
    };
  })();

  if (!forceRefresh) {
    productsInFlight = run.finally(() => {
      productsInFlight = null;
    });
    return productsInFlight;
  }

  return run;
}

/**
 * Fetch all categories with request deduplication and caching
 */
export async function getCategories(
  forceRefresh = false
): Promise<{ categories: Category[]; isFallback: boolean }> {
  const isFresh =
    memoryCategoriesCache &&
    !forceRefresh &&
    Date.now() - lastCategoriesFetchTime < CLIENT_CACHE_TTL_MS;
  if (isFresh && memoryCategoriesCache && memoryCategoriesCache.length > 0) {
    return { categories: memoryCategoriesCache, isFallback: false };
  }

  if (!forceRefresh && categoriesInFlight) {
    return categoriesInFlight;
  }

  const run = (async (): Promise<{ categories: Category[]; isFallback: boolean }> => {
    try {
      const res = await fetch(getApiUrl("/api/categories"));
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
  })();

  if (!forceRefresh) {
    categoriesInFlight = run.finally(() => {
      categoriesInFlight = null;
    });
    return categoriesInFlight;
  }

  return run;
}

/**
 * Invalidate client category cache so fresh database taxonomy is refetched
 */
export function clearCategoriesCache() {
  memoryCategoriesCache = null;
  lastCategoriesFetchTime = 0;
  categoriesInFlight = null;
}

/**
 * Invalidate client product cache
 */
export function clearProductsCache() {
  memoryProductsCache = null;
  lastProductsFetchTime = 0;
  productsInFlight = null;
  memoryProductBySlugCache.clear();
  sessionRandomShowcaseCache = null;
}

// Global cross-component and cross-tab catalogue synchronization listener
if (typeof window !== "undefined") {
  window.addEventListener("drmedex_catalogue_updated", () => {
    clearCategoriesCache();
    clearProductsCache();
  });
  window.addEventListener("storage", (e) => {
    if (e.key === "drmedex_catalogue_version") {
      clearCategoriesCache();
      clearProductsCache();
    }
  });
}

/**
 * Fetch product by slug with in-flight deduplication, instant memory cache, and lazy fallback
 */
export async function getProductBySlug(
  slug: string
): Promise<{ product: Product | null; isFallback: boolean }> {
  if (!slug) return { product: null, isFallback: false };

  const cleanSlug = normalizeLookupKey(slug);

  // 1. Check dedicated slug cache (freshness checked within TTL)
  const slugCached = memoryProductBySlugCache.get(cleanSlug);
  if (slugCached && Date.now() - slugCached.ts < CLIENT_CACHE_TTL_MS) {
    return { product: slugCached.product, isFallback: false };
  }

  // 2. Check full product list cache if populated & fresh
  if (
    memoryProductsCache &&
    memoryProductsCache.length > 0 &&
    Date.now() - lastProductsFetchTime < CLIENT_CACHE_TTL_MS
  ) {
    const cachedMatch = findProductMatch(memoryProductsCache, cleanSlug);
    if (cachedMatch) {
      cacheProductEntries(cachedMatch, cleanSlug);
      return { product: cachedMatch, isFallback: false };
    }
  }

  // 3. Deduplicate concurrent identical slug lookups
  const existingFlight = productBySlugInFlight.get(cleanSlug);
  if (existingFlight) {
    return existingFlight;
  }

  const run = (async (): Promise<{ product: Product | null; isFallback: boolean }> => {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(cleanSlug)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.product) {
          cacheProductEntries(data.product, cleanSlug);
          if (memoryProductsCache) {
            const idx = memoryProductsCache.findIndex(
              (p) => p.id === data.product.id || p.slug === data.product.slug
            );
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

    if (slugCached) {
      return { product: slugCached.product, isFallback: false };
    }

    const fallbackList = await getFallbackProducts();
    const fallbackMatch = findProductMatch(fallbackList, cleanSlug);
    return { product: fallbackMatch || null, isFallback: true };
  })();

  const wrapped = run.finally(() => {
    productBySlugInFlight.delete(cleanSlug);
  });
  productBySlugInFlight.set(cleanSlug, wrapped);
  return wrapped;
}

/**
 * Fetch products for a given category with cache reuse & in-flight deduplication
 */
export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  if (!categorySlug) return [];
  const cleanCat = categorySlug.toLowerCase().trim();

  // Reuse full products cache if fresh
  if (
    memoryProductsCache &&
    memoryProductsCache.length > 0 &&
    Date.now() - lastProductsFetchTime < CLIENT_CACHE_TTL_MS
  ) {
    const matches = memoryProductsCache.filter((p) => p.category === categorySlug || p.category?.toLowerCase() === cleanCat);
    if (matches.length > 0) return matches;
  }

  const catCached = memoryCategoryProductsCache.get(cleanCat);
  if (catCached && Date.now() - catCached.ts < CLIENT_CACHE_TTL_MS) {
    return catCached.products;
  }

  const existingFlight = categoryProductsInFlight.get(cleanCat);
  if (existingFlight) return existingFlight;

  const run = (async (): Promise<Product[]> => {
    try {
      const res = await fetch(`/api/products?category=${encodeURIComponent(categorySlug)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.products)) {
          memoryCategoryProductsCache.set(cleanCat, { products: data.products, ts: Date.now() });
          for (const p of data.products) {
            cacheProductEntries(p);
          }
          return data.products;
        }
      }
    } catch {
      // Fall back to async fallback chunk
    }

    const fallbackList = await getFallbackProducts();
    return fallbackList.filter(
      (p) =>
        (p.category === categorySlug || p.category?.toLowerCase() === cleanCat) &&
        p.reviewStatus === "CORRECT"
    );
  })();

const wrapped = run.finally(() => {
    categoryProductsInFlight.delete(cleanCat);
  });
  categoryProductsInFlight.set(cleanCat, wrapped);
  return wrapped;
}

// Session-stable randomized homepage showcase cache (persists for current SPA session, refreshes on reload)
let sessionRandomShowcaseCache: Product[] | null = null;
let randomShowcaseInFlight: Promise<Product[]> | null = null;

export function getCachedRandomShowcaseSync(): Product[] | null {
  return sessionRandomShowcaseCache && sessionRandomShowcaseCache.length > 0
    ? sessionRandomShowcaseCache
    : null;
}

function dedupeAndFilterActive(list: Product[], limit: number): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const p of list) {
    if (!p || !p.id) continue;
    const pid = String(p.id);
    if (seen.has(pid)) continue;
    if ((p.status || "ACTIVE") !== "ACTIVE" || p.status === "ARCHIVED" || p.isRetired) continue;
    if (p.reviewStatus && p.reviewStatus !== "CORRECT") continue;
    seen.add(pid);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Fetch a lightweight server-randomized batch of active, non-deleted, CORRECT products
 * for the homepage showcase without downloading the entire catalogue.
 * Stable during the current browser page session; refreshes on page reload / new visit.
 */
export async function getRandomShowcaseProducts(limit = 12): Promise<Product[]> {
  if (sessionRandomShowcaseCache && sessionRandomShowcaseCache.length > 0) {
    return sessionRandomShowcaseCache.slice(0, limit);
  }

  if (randomShowcaseInFlight) {
    return randomShowcaseInFlight;
  }

  const run = (async (): Promise<Product[]> => {
    try {
      const res = await fetch(`/api/products/random?limit=${encodeURIComponent(String(limit))}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
          const picked = dedupeAndFilterActive(data.products, limit);
          if (picked.length > 0) {
            sessionRandomShowcaseCache = picked;
            for (const p of picked) {
              cacheProductEntries(p);
            }
            return picked;
          }
        }
      }
    } catch (err: any) {
      console.warn("[productService] Random showcase fetch notice:", err?.message || err);
    }

    // Graceful fallback: reuse in-memory cache if available, otherwise lazy fallback chunk
    const source =
      memoryProductsCache && memoryProductsCache.length > 0
        ? memoryProductsCache
        : await getFallbackProducts();

    const pool = dedupeAndFilterActive(source, source.length);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    const picked = pool.slice(0, limit);
    if (picked.length > 0) {
      sessionRandomShowcaseCache = picked;
    }
    return picked;
  })();

  randomShowcaseInFlight = run.finally(() => {
    randomShowcaseInFlight = null;
  });
  return randomShowcaseInFlight;
}

