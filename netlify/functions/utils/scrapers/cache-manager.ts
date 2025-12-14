/**
 * Cache Manager
 * 
 * Simple in-memory caching for scraped data
 * Reduces load on state legislature websites and improves response time
 * 
 * For production, could be extended to use Redis or another persistent cache
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class CacheManagerClass {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hits: number = 0;
  private misses: number = 0;

  /**
   * Get item from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      console.log('[CACHE] ❌ Miss', { key, stats: this.getStats() });
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      console.log('[CACHE] ⏰ Expired', {
        key,
        age: `${Math.round((Date.now() - entry.timestamp) / 1000)}s`
      });
      return null;
    }

    this.hits++;
    console.log('[CACHE] ✅ Hit', {
      key,
      age: `${Math.round((Date.now() - entry.timestamp) / 1000)}s`,
      stats: this.getStats()
    });
    
    return entry.data as T;
  }

  /**
   * Set item in cache with TTL (time-to-live in seconds)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 3600): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlSeconds * 1000)
    };

    this.cache.set(key, entry);
    
    console.log('[CACHE] 💾 Set', {
      key,
      ttl: `${ttlSeconds}s`,
      size: this.cache.size
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      console.log('[CACHE] 🗑️ Deleted', { key });
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    
    console.log('[CACHE] 🧹 Cleared', { entriesRemoved: size });
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log('[CACHE] 🧹 Cleanup', {
        removed,
        remaining: this.cache.size
      });
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Log cache statistics
   */
  logStats(): void {
    const stats = this.getStats();
    
    console.log('[CACHE] 📊 Statistics', {
      ...stats,
      hitRate: `${(stats.hitRate * 100).toFixed(1)}%`
    });
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all entries (for debugging)
   */
  getAllEntries(): Array<{ key: string; data: any; age: number; ttl: number }> {
    const now = Date.now();
    const entries: Array<{ key: string; data: any; age: number; ttl: number }> = [];

    const cacheEntries = Array.from(this.cache.entries());
    for (const [key, entry] of cacheEntries) {
      entries.push({
        key,
        data: entry.data,
        age: Math.round((now - entry.timestamp) / 1000),
        ttl: Math.round((entry.expiresAt - now) / 1000)
      });
    }

    return entries;
  }

  /**
   * Helper: Generate cache key for scraper results
   */
  static generateScraperKey(stateCode: string): string {
    return `scraper:${stateCode}:events`;
  }

  /**
   * Helper: Generate cache key with timestamp bucket (for time-based invalidation)
   */
  static generateTimeBucketKey(stateCode: string, bucketMinutes: number = 30): string {
    const now = new Date();
    const bucket = Math.floor(now.getTime() / (bucketMinutes * 60 * 1000));
    return `scraper:${stateCode}:${bucket}`;
  }
}

// Export singleton instance
export const CacheManager = new CacheManagerClass();

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    CacheManager.cleanup();
  }, 5 * 60 * 1000);
}
