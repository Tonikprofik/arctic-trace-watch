// Simple in-memory cache for query results
// Reduces repeated Weaviate calls during demos

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private ttlMs: number;

  constructor(ttlMs: number = 5 * 60 * 1000) { // 5 minutes default
    this.ttlMs = ttlMs;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  getCacheKey(prompt: string, limit: number): string {
    return `query:${prompt.toLowerCase().trim()}:${limit}`;
  }
}

export const queryCache = new QueryCache();
