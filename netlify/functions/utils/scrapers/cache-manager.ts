/**
 * Cache Manager with File-Based Persistent Storage
 * 
 * Stores scraped data as JSON files in /public/cache
 * Persists across server restarts - perfect for development
 * 24-hour TTL to ensure data freshness
 * 
 * SECURITY: Uses HMAC signatures to prevent cache poisoning
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  state?: string;
  signature?: string; // HMAC signature for integrity
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class CacheManagerClass {
  private cacheDir: string;
  private hits: number = 0;
  private misses: number = 0;
  private readonly CACHE_SECRET: string;

  constructor() {
    // Use public/cache for persistence (works in dev and production)
    this.cacheDir = path.join(process.cwd(), 'public', 'cache');
    this.CACHE_SECRET = process.env.CACHE_HMAC_SECRET || 
                        'dev-secret-' + (process.env.NETLIFY_DEV || 'local');
    this.ensureCacheDir();
  }

  /**
   * Generate HMAC signature for cache data
   */
  private sign(data: string): string {
    return crypto.createHmac('sha256', this.CACHE_SECRET)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  private verify(data: string, signature: string): boolean {
    try {
      const expected = this.sign(data);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex')
      );
    } catch {
      return false;
    }
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      console.log('[CACHE] 📁 Created cache directory:', this.cacheDir);
    }
  }

  private getCacheFilePath(key: string): string {
    // Sanitize key for filesystem
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '-');
    return path.join(this.cacheDir, `${safeKey}.json`);
  }

  /**
   * Get item from cache if not expired
   */
  get<T>(key: string): T | null {
    const filePath = this.getCacheFilePath(key);
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        this.misses++;
        console.log('[CACHE] ❌ Miss (file not found)', { key });
        return null;
      }

      // Read and parse file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(fileContent);

      // SECURITY: Verify signature if present
      if (entry.signature) {
        const dataStr = JSON.stringify(entry.data);
        if (!this.verify(dataStr, entry.signature)) {
          console.error(`⚠️ Cache integrity check failed for key: ${key}`);
          fs.unlinkSync(filePath); // Delete corrupted cache
          this.misses++;
          return null;
        }
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        fs.unlinkSync(filePath);
        this.misses++;
        console.log('[CACHE] ⏰ Expired (deleted file)', {
          key,
          age: `${Math.round((Date.now() - entry.timestamp) / 1000 / 60)}min`
        });
        return null;
      }

      this.hits++;
      console.log('[CACHE] ✅ Hit (from file)', {
        key,
        age: `${Math.round((Date.now() - entry.timestamp) / 1000 / 60)}min`,
        file: path.basename(filePath)
      });
      
      return entry.data as T;
    } catch (error) {
      this.misses++;
      console.error('[CACHE] ❌ Error reading cache file:', error);
      return null;
    }
  }

  /**
   * Set item in cache with TTL (time-to-live in seconds)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 86400): void {
    // SECURITY: Generate HMAC signature
    const dataStr = JSON.stringify(data);
    const signature = this.sign(dataStr);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlSeconds * 1000),
      signature // Include HMAC signature for integrity
    };

    const filePath = this.getCacheFilePath(key);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
      
      console.log('[CACHE] 💾 Saved to file', {
        key,
        ttl: `${Math.round(ttlSeconds / 3600)}h`,
        file: path.basename(filePath),
        size: `${Math.round(JSON.stringify(entry).length / 1024)}KB`
      });
    } catch (error) {
      console.error('[CACHE] ❌ Error writing cache file:', error);
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const filePath = this.getCacheFilePath(key);
    
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const entry: CacheEntry<any> = JSON.parse(fileContent);

      // Check expiration
      if (Date.now() > entry.expiresAt) {
        fs.unlinkSync(filePath);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const filePath = this.getCacheFilePath(key);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('[CACHE] 🗑️ Deleted file', { key, file: path.basename(filePath) });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[CACHE] ❌ Error deleting cache file:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    try {
      const files = fs.readdirSync(this.cacheDir);
      let removed = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.cacheDir, file));
          removed++;
        }
      }
      
      this.hits = 0;
      this.misses = 0;
      
      console.log('[CACHE] 🧹 Cleared all files', { filesRemoved: removed });
    } catch (error) {
      console.error('[CACHE] ❌ Error clearing cache:', error);
    }
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    try {
      const files = fs.readdirSync(this.cacheDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.cacheDir, file);
        
        try {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const entry: CacheEntry<any> = JSON.parse(fileContent);
          
          if (now > entry.expiresAt) {
            fs.unlinkSync(filePath);
            removed++;
          }
        } catch (error) {
          // Invalid JSON or corrupted file - remove it
          fs.unlinkSync(filePath);
          removed++;
        }
      }

      if (removed > 0) {
        console.log('[CACHE] 🧹 Cleanup', {
          removedFiles: removed,
          remainingFiles: fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json')).length
        });
      }
    } catch (error) {
      console.error('[CACHE] ❌ Error during cleanup:', error);
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;
    
    let fileCount = 0;
    try {
      fileCount = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json')).length;
    } catch (error) {
      // Ignore
    }

    return {
      hits: this.hits,
      misses: this.misses,
      size: fileCount,
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
      hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
      cacheFiles: stats.size
    });
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    try {
      return fs.readdirSync(this.cacheDir)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all entries (for debugging)
   */
  getAllEntries(): Array<{ key: string; data: any; age: number; ttl: number }> {
    const now = Date.now();
    const entries: Array<{ key: string; data: any; age: number; ttl: number }> = [];

    try {
      const files = fs.readdirSync(this.cacheDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filePath = path.join(this.cacheDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const entry: CacheEntry<any> = JSON.parse(fileContent);
          
          entries.push({
            key: file.replace('.json', ''),
            data: entry.data,
            age: Math.round((now - entry.timestamp) / 1000),
            ttl: Math.round((entry.expiresAt - now) / 1000)
          });
        } catch (error) {
          // Skip invalid files
        }
      }
    } catch (error) {
      console.error('[CACHE] ❌ Error reading cache entries:', error);
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
