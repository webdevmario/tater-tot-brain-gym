// Tiny module-level cache for admin list views.
//
// Why: when navigating Kids → Packs → Kids, the AdminKids component
// unmounts and re-mounts. Without this cache, the list state resets to
// null on every visit and the page flashes empty until the fetch
// resolves. Reading from this cache as the initial state means the
// previous data shows immediately while the refetch happens in the
// background — same pattern as SWR/React Query, just minimal.

const cache = new Map<string, unknown>();

export function getCache<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCache<T>(key: string, value: T): void {
  cache.set(key, value);
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}
