/**
 * StorageCache - Simple in-memory cache for localStorage reads
 * Reduces repeated synchronous localStorage.getItem() calls
 * 
 * Usage:
 *   import { storageCache } from '@/lib/storageCache';
 *   const accounts = storageCache.get('accounts', []);
 *   storageCache.invalidate('accounts'); // Clear cache when data changes
 */

class StorageCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5000; // 5 seconds cache TTL

  /**
   * Get data from cache or localStorage
   * @param key - localStorage key
   * @param defaultValue - Default value if key doesn't exist
   * @returns Cached or fresh data
   */
  get<T>(key: string, defaultValue: T): T {
    // Check cache first
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.TTL) {
      return cached.data as T;
    }

    // Cache miss or expired - read from localStorage
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const stored = localStorage.getItem(key);
      const data = stored ? JSON.parse(stored) : defaultValue;
      
      // Update cache
      this.cache.set(key, { data, timestamp: now });
      
      return data as T;
    } catch (error) {
      console.error(`Error reading from localStorage for key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Invalidate cache for a specific key or all keys
   * @param key - Optional key to invalidate. If not provided, clears all cache
   */
  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Manually set cache (useful after localStorage writes)
   * @param key - localStorage key
   * @param data - Data to cache
   */
  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics (for debugging)
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const storageCache = new StorageCache();

