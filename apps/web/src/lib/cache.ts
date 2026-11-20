import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

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


/**
 * Fetch a URL, showing the last copy we had (if any) immediately while a
 * fresh copy loads in the background. Pages render their skeleton only
 * on the very first visit, and never flash empty when coming back.
 */
export function useCachedGet<T>(url: string | null) {
  const [data, setDataState] = useState<T | null>(() => (url ? getCache<T>(url) ?? null : null));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!url) return;
    try {
      const fresh = await api.get<T>(url);
      setCache(url, fresh);
      setDataState(fresh);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [url]);

  useEffect(() => {
    if (!url) return;
    setDataState(getCache<T>(url) ?? null);
    reload();
  }, [url, reload]);

  const setData = useCallback(
    (next: T) => {
      if (url) setCache(url, next);
      setDataState(next);
    },
    [url]
  );

  return { data, setData, error, reload };
}
