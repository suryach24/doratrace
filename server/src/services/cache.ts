import { DoraMetrics } from '../types/dora';

interface CacheEntry {
  data: DoraMetrics;
  expiresAt: number;
}

const TTL_MS = 60 * 60 * 1000; // 1 hour
const store = new Map<string, CacheEntry>();

export const cache = {
  get(key: string): DoraMetrics | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.data;
  },

  set(key: string, data: DoraMetrics): void {
    store.set(key, { data, expiresAt: Date.now() + TTL_MS });
  },

  clear(): void {
    store.clear();
  },
};
