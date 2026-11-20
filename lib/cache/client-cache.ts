interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000; // 60 seconds stale-while-revalidate window

export function getCached<T>(key: string, maxAgeMs = DEFAULT_TTL_MS): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) {
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
