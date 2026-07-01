import type { CatalogProduct } from '../store/useCatalogStore';

const STORAGE_PREFIX = 'catalog_cache_v1:';
const TTL_MS = 5 * 60 * 1000;

type CachedEntry = {
  products: CatalogProduct[];
  fetchedAt: number;
};

export function readCatalogCache(city: string): CachedEntry | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${city}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (!parsed?.products || !parsed.fetchedAt) return null;
    if (Date.now() - parsed.fetchedAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCatalogCache(city: string, entry: CachedEntry) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${city}`, JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}
