import { CacheEntry } from "../models/cacheEntry.model";

type MemoryCacheEntry<T> = {
  data: T;
  expiry: number;
};

class InMemoryCache {
  private store = new Map<string, MemoryCacheEntry<any>>();
  private persistentCacheAvailable = true;

  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttlSeconds: number) {
    this.store.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  async getPersistent<T>(key: string): Promise<T | null> {
    const inMemory = this.get<T>(key);
    if (inMemory !== null) {
      return inMemory;
    }

    if (!this.persistentCacheAvailable) {
      return null;
    }

    try {
      const entry = await CacheEntry.findByPk(key);

      if (!entry) {
        return null;
      }

      const expiresAt = new Date(entry.get("expiresAt") as Date | string).getTime();

      if (Date.now() > expiresAt) {
        await entry.destroy();
        return null;
      }

      const value = entry.get("value") as T;
      const ttlSeconds = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
      this.set(key, value, ttlSeconds);
      return value;
    } catch (error) {
      this.handlePersistentCacheFailure(error);
      return null;
    }
  }

  async setPersistent<T>(key: string, data: T, ttlSeconds: number) {
    this.set(key, data, ttlSeconds);

    if (!this.persistentCacheAvailable) {
      return;
    }

    try {
      await CacheEntry.upsert({
        key,
        value: data,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      });
    } catch (error) {
      this.handlePersistentCacheFailure(error);
    }
  }

  private handlePersistentCacheFailure(error: unknown) {
    if (this.persistentCacheAvailable) {
      console.warn(
        "[cache] persistent cache unavailable, falling back to in-memory only",
        error,
      );
    }

    this.persistentCacheAvailable = false;
  }
}

export const cache = new InMemoryCache();
