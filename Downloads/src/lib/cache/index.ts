// src/lib/cache/index.ts
// Simple in-memory cache with TTL.
// Swap .get/.set/.del for Redis (ioredis) in production without changing callers.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<any>>();

export const cache = {
  get<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value as T;
  },

  set<T>(key: string, value: T, ttlMs: number): void {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  },

  del(key: string): void {
    store.delete(key);
  },

  invalidatePrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },
};

// TTL constants
export const TTL = {
  FEED:     30_000,        // 30s  — feed is near-realtime
  INSIGHTS: 5 * 60_000,   // 5min — insight report is expensive
  STATS:    60_000,        // 60s  — header stats
};
